// commands/sticker.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const { execFile } = require('child_process');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const ffmpegPath = require('ffmpeg-static');

const execFileAsync = promisify(execFile);

function addExifToWebp(webpBuffer, packname, author) {
    const json = {
        'sticker-pack-id': 'com.ogstash.taker',
        'sticker-pack-name': packname,
        'sticker-pack-publisher': author,
        'emojis': ['🎯', '✨']
    };

    const exifHeader = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuf = Buffer.from(JSON.stringify(json), 'utf-8');
    const exif = Buffer.concat([exifHeader, jsonBuf]);
    exif.writeUIntLE(jsonBuf.length, 14, 4);

    const paddedLength = exif.length % 2 === 0 ? exif.length : exif.length + 1;
    const chunkHeader = Buffer.alloc(8);
    chunkHeader.write('EXIF', 0);
    chunkHeader.writeUInt32LE(exif.length, 4);
    const exifChunk = Buffer.concat([chunkHeader, exif, Buffer.alloc(paddedLength - exif.length)]);

    if (webpBuffer.toString('ascii', 0, 4) !== 'RIFF' || webpBuffer.toString('ascii', 8, 12) !== 'WEBP') {
        return webpBuffer;
    }

    const chunks = [];
    let offset = 12;
    while (offset < webpBuffer.length) {
        if (offset + 8 > webpBuffer.length) break;
        const fourCC = webpBuffer.toString('ascii', offset, offset + 4);
        const size = webpBuffer.readUInt32LE(offset + 4);
        const totalSize = 8 + size + (size % 2);
        if (fourCC !== 'EXIF') chunks.push(webpBuffer.subarray(offset, offset + totalSize));
        offset += totalSize;
    }

    chunks.splice(1, 0, exifChunk);
    const bodySize = chunks.reduce((total, chunk) => total + chunk.length, 0);
    const riffHeader = Buffer.alloc(12);
    riffHeader.write('RIFF', 0);
    riffHeader.writeUInt32LE(bodySize + 4, 4);
    riffHeader.write('WEBP', 8);

    return Buffer.concat([riffHeader, ...chunks]);
}

async function createStickerFromVideo(videoBuffer) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sticker-video-'));
    const inputPath = path.join(tempDir, 'input.mp4');
    const outputImagePath = path.join(tempDir, 'frame.png');

    fs.writeFileSync(inputPath, videoBuffer);

    await execFileAsync(ffmpegPath, [
        '-y',
        '-i', inputPath,
        '-ss', '0',
        '-t', '5',
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0',
        '-frames:v', '1',
        outputImagePath
    ]);

    const stickerBuffer = await sharp(outputImagePath)
        .resize(512, 512, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp({ quality: 80 })
        .toBuffer();

    fs.rmSync(tempDir, { recursive: true, force: true });
    return stickerBuffer;
}

async function createStickerFromImage(imageBuffer) {
    return sharp(imageBuffer)
        .resize(512, 512, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp({ quality: 80 })
        .toBuffer();
}

async function handleSticker(sock, m, text, sender, sleep) {
    let mediaMessage = null;
    let mediaType = null;

    // Unpack message content safely
    const msgContent = m.message?.ephemeralMessage?.message || 
                       m.message?.viewOnceMessage?.message || 
                       m.message?.viewOnceMessageV2?.message || 
                       m.message;

    const contextInfo = msgContent?.extendedTextMessage?.contextInfo || 
                        msgContent?.imageMessage?.contextInfo || 
                        msgContent?.videoMessage?.contextInfo;

    if (msgContent.imageMessage) {
        mediaMessage = msgContent.imageMessage;
        mediaType = 'image';
    } else if (msgContent.videoMessage) {
        mediaMessage = msgContent.videoMessage;
        mediaType = 'video';
    } else if (contextInfo && contextInfo.quotedMessage) {
        let quoted = contextInfo.quotedMessage;
        if (quoted.ephemeralMessage) quoted = quoted.ephemeralMessage.message;
        if (quoted.viewOnceMessage) quoted = quoted.viewOnceMessage.message;
        if (quoted.viewOnceMessageV2) quoted = quoted.viewOnceMessageV2.message;
        if (quoted.imageMessage) {
            mediaMessage = quoted.imageMessage;
            mediaType = 'image';
        } else if (quoted.videoMessage) {
            mediaMessage = quoted.videoMessage;
            mediaType = 'video';
        }
    }

    if (!mediaMessage) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ Please send an image or video with the `.s` caption or reply to one with `.s`!" }, { quoted: m });
        return;
    }

    try {
        const stream = await downloadContentFromMessage(mediaMessage, mediaType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const stickerBuffer = mediaType === 'video'
            ? await createStickerFromVideo(buffer)
            : await createStickerFromImage(buffer);
        const args = text ? text.trim().split(/ +/).slice(1) : [];
        const packName = args.length > 0 ? args.join(' ') : 'Prince Davis';
        const stickerWithExif = addExifToWebp(stickerBuffer, packName, '');

        await sleep(1000);
        await sock.sendMessage(sender, { sticker: stickerWithExif }, { quoted: m });

    } catch (error) {
        console.error('Sticker generation error:', error);
        await sock.sendMessage(sender, { text: '❌ Failed to create sticker. Please try again!' }, { quoted: m });
    }
}

module.exports = handleSticker;
module.exports.addExifToWebp = addExifToWebp;