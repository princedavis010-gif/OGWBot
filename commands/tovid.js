const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const { Resolver } = require('node:dns');
const { execFile } = require('child_process');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const ffmpegPath = require('ffmpeg-static');
const { Agent } = require('undici');

const execFileAsync = promisify(execFile);
const mediaDnsResolver = new Resolver({ timeout: 2000, tries: 2 });
const mediaDnsServers = (process.env.TOVID_DNS_SERVERS || '1.1.1.1,8.8.8.8')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);
mediaDnsResolver.setServers(mediaDnsServers);

function lookupMediaHost(hostname, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    const requestedFamily = options?.family || 0;
    const resolvers = requestedFamily === 6
        ? [mediaDnsResolver.resolve6]
        : requestedFamily === 4
            ? [mediaDnsResolver.resolve4]
            : [mediaDnsResolver.resolve4, mediaDnsResolver.resolve6];

    (async () => {
        let lastError;
        for (const resolve of resolvers) {
            try {
                const addresses = await new Promise((resolveRecords, reject) => {
                    resolve.call(mediaDnsResolver, hostname, (error, records) =>
                        error ? reject(error) : resolveRecords(records)
                    );
                });
                return addresses.map((address) => ({
                    address,
                    family: address.includes(':') ? 6 : 4
                }));
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError;
    })().then((records) => {
        if (options?.all) {
            callback(null, records);
            return;
        }
        const record = records.find((entry) => !requestedFamily || entry.family === requestedFamily) || records[0];
        callback(null, record.address, record.family);
    }).catch(callback);
}

const mediaDispatcher = new Agent({ connect: { lookup: lookupMediaHost } });

function unwrapMessage(message) {
    let content = message;
    while (content?.ephemeralMessage || content?.viewOnceMessage || content?.viewOnceMessageV2) {
        content = content.ephemeralMessage?.message ||
            content.viewOnceMessage?.message ||
            content.viewOnceMessageV2?.message;
    }
    return content;
}

function getNestedErrorCode(error) {
    let currentError = error;
    while (currentError) {
        if (currentError.code) return currentError.code;
        currentError = currentError.cause;
    }
    return null;
}

async function downloadStickerBuffer(stickerMessage) {
    const retryableCodes = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT']);
    const downloadMessage = { ...stickerMessage };
    let host;

    if (downloadMessage.directPath) {
        host = 'mmg.whatsapp.net';
    } else if (downloadMessage.url) {
        const mediaUrl = new URL(downloadMessage.url);
        if (mediaUrl.hostname === 'a.whatsapp.net') {
            mediaUrl.hostname = 'mmg.whatsapp.net';
            downloadMessage.url = mediaUrl.toString();
        }
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const stream = await downloadContentFromMessage(downloadMessage, 'sticker', {
                host,
                options: { dispatcher: mediaDispatcher }
            });
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            return Buffer.concat(chunks);
        } catch (error) {
            if (!retryableCodes.has(getNestedErrorCode(error)) || attempt === 3) throw error;
            await new Promise((resolve) => setTimeout(resolve, attempt * 750));
        }
    }
}

async function handleToVid({ sock, m, sender, getContextInfo }) {
    const msgContent = unwrapMessage(m.message) || {};
    const contextInfo = getContextInfo ? getContextInfo() : null;
    let stickerMessage = msgContent.stickerMessage || null;

    if (!stickerMessage && contextInfo?.quotedMessage) {
        stickerMessage = unwrapMessage(contextInfo.quotedMessage)?.stickerMessage || null;
    }

    if (!stickerMessage) {
        await sock.sendMessage(sender, {
            text: '❌ Please send or reply to a sticker with `.toimg`.'
        }, { quoted: m });
        return;
    }

    let tempDir;
    try {
        const stickerBuffer = await downloadStickerBuffer(stickerMessage);
        const mimetype = stickerMessage.mimetype || '';
        const isVideoSticker = /^video\//i.test(mimetype);
        const isAnimatedWebp = Boolean(stickerMessage.isAnimated) ||
            /gif/i.test(mimetype) ||
            stickerBuffer.includes(Buffer.from('ANIM')) ||
            stickerBuffer.includes(Buffer.from('ANMF'));

        // AUTOMATED FALLBACK: If it's a static sticker, convert it to an image instead
        if (!isVideoSticker && !isAnimatedWebp) {
            const pngBuffer = await sharp(stickerBuffer).png().toBuffer();
            await sock.sendMessage(sender, {
                image: pngBuffer,
                mimetype: 'image/png',
             //   caption: '📸 Static sticker converted to Image.'
            }, { quoted: m });
            return;
        }

        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tovid-'));
        
        let inputPath;
        if (isVideoSticker) {
            const inputExt = /webm/i.test(mimetype) ? 'webm' : 'mp4';
            inputPath = path.join(tempDir, `input.${inputExt}`);
            fs.writeFileSync(inputPath, stickerBuffer);
        } else {
            inputPath = path.join(tempDir, 'input.gif');
            const gifBuffer = await sharp(stickerBuffer, { animated: true })
                // Flatten transparent background frames onto black so FFmpeg's GIF reader doesn't corrupt/glitch
                .flatten({ background: { r: 0, g: 0, b: 0 } })
                .gif({ loop: 0 }) // Let native timelines dictate frame timing
                .toBuffer();
            fs.writeFileSync(inputPath, gifBuffer);
        }

        const outputPath = path.join(tempDir, 'sticker.mp4');
        const ffmpegArgs = [
            '-y',
            '-i', inputPath,
            '-map', '0:v:0',
            '-an',
            '-vf', 'fps=15,scale=512:512:force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '23',
            '-movflags', '+faststart',
            outputPath
        ];

        await execFileAsync(ffmpegPath, ffmpegArgs, { timeout: 60000, maxBuffer: 1024 * 1024 });

        const videoBuffer = fs.readFileSync(outputPath);

        await sock.sendMessage(sender, {
            video: videoBuffer,
            mimetype: 'video/mp4',
            fileName: 'sticker.mp4',
           // caption: '🎬 Converted to MP4 video.'
        }, { quoted: m });
    } catch (error) {
        console.error('Video sticker conversion error:', error);
        const errorCode = getNestedErrorCode(error);
        const message = errorCode === 'ENOTFOUND' || errorCode === 'EAI_AGAIN'
            ? `❌ Failed to process the sticker file.` : '❌ Failed to process the sticker file.';
        await sock.sendMessage(sender, {
            text: message
        }, { quoted: m });
    } finally {
        if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

module.exports = handleToVid;

/* const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const { execFile } = require('child_process');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const ffmpegPath = require('ffmpeg-static');

const execFileAsync = promisify(execFile);

function unwrapMessage(message) {
    let content = message;
    while (content?.ephemeralMessage || content?.viewOnceMessage || content?.viewOnceMessageV2) {
        content = content.ephemeralMessage?.message ||
            content.viewOnceMessage?.message ||
            content.viewOnceMessageV2?.message;
    }
    return content;
}

async function handleToVid({ sock, m, sender, sleep, getContextInfo }) {
    const msgContent = unwrapMessage(m.message) || {};
    const contextInfo = getContextInfo ? getContextInfo() : null;
    let stickerMessage = msgContent.stickerMessage || null;

    if (!stickerMessage && contextInfo?.quotedMessage) {
        stickerMessage = unwrapMessage(contextInfo.quotedMessage)?.stickerMessage || null;
    }

    if (!stickerMessage) {
        await sock.sendMessage(sender, {
            text: '❌ Please send or reply to an animated/video sticker with `.tovid`.'
        }, { quoted: m });
        return;
    }

    let tempDir;
    try {
        const stream = await downloadContentFromMessage(stickerMessage, 'sticker');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const stickerBuffer = Buffer.concat(chunks);
        const mimetype = stickerMessage.mimetype || '';
        const isVideoSticker = /^video\//i.test(mimetype);
        const isAnimatedWebp = Boolean(stickerMessage.isAnimated) ||
            /gif/i.test(mimetype) ||
            stickerBuffer.includes(Buffer.from('ANIM')) ||
            stickerBuffer.includes(Buffer.from('ANMF'));

        if (!isVideoSticker && !isAnimatedWebp) {
            await sock.sendMessage(sender, {
                text: '❌ This is a static sticker. Use `.toimg` to convert it to an image.'
            }, { quoted: m });
            return;
        }

        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tovid-'));
        let inputPath;

        if (isVideoSticker) {
            const extension = /webm/i.test(mimetype) ? 'webm' : 'mp4';
            inputPath = path.join(tempDir, `input.${extension}`);
            fs.writeFileSync(inputPath, stickerBuffer);
        } else {
            inputPath = path.join(tempDir, 'input.gif');
            const gifBuffer = await sharp(stickerBuffer, { animated: true })
                .gif({ loop: 0, delay: 100 })
                .toBuffer();
            fs.writeFileSync(inputPath, gifBuffer);
        }

        const outputPath = path.join(tempDir, 'sticker.mp4');
        await execFileAsync(ffmpegPath, [
            '-y',
            '-i', inputPath,
            '-map', '0:v:0',
            '-an',
            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p',
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', '23',
            '-movflags', '+faststart',
            outputPath
        ], { timeout: 60000, maxBuffer: 1024 * 1024 });

        const videoBuffer = fs.readFileSync(outputPath);
        await sleep(1000);
        await sock.sendMessage(sender, {
            video: videoBuffer,
            mimetype: 'video/mp4',
            fileName: 'sticker.mp4',
            caption: '🎬 Converted to MP4 video.'
        }, { quoted: m });
    } catch (error) {
        console.error('Video sticker conversion error:', error);
        await sock.sendMessage(sender, {
            text: '❌ Failed to convert the animated/video sticker to MP4.'
        }, { quoted: m });
    } finally {
        if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

module.exports = handleToVid; */