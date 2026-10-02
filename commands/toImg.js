/* const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

async function handleToImg({ sock, m, sender, sleep, getContextInfo }) {
    let msgContent = m.message;
    if (msgContent.ephemeralMessage) msgContent = msgContent.ephemeralMessage.message;
    if (msgContent.viewOnceMessage) msgContent = msgContent.viewOnceMessage.message;
    if (msgContent.viewOnceMessageV2) msgContent = msgContent.viewOnceMessageV2.message;

    let stickerMessage = null;

    if (msgContent.stickerMessage) {
        stickerMessage = msgContent.stickerMessage;
    } else {
        const contextInfo = getContextInfo();
        if (contextInfo && contextInfo.quotedMessage) {
            let quoted = contextInfo.quotedMessage;
            if (quoted.ephemeralMessage) quoted = quoted.ephemeralMessage.message;
            if (quoted.viewOnceMessage) quoted = quoted.viewOnceMessage.message;
            if (quoted.viewOnceMessageV2) quoted = quoted.viewOnceMessageV2.message;
            if (quoted.stickerMessage) {
                stickerMessage = quoted.stickerMessage;
            }
        }
    }

    if (!stickerMessage) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ Please send or reply to a sticker with `.toimg`!" }, { quoted: m });
        return;
    }

  //  await sleep(1000);
    // await sock.sendMessage(sender, { text: "⏳ Converting sticker to image..." });

    try {
        const stream = await downloadContentFromMessage(stickerMessage, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const isAnimatedSticker = Boolean(stickerMessage.isAnimated) || /video|gif/i.test(String(stickerMessage.mimetype || ''));

        if (isAnimatedSticker) {
            const animatedBuffer = await sharp(buffer, { animated: true })
                .gif({ loop: 0, delay: 100 })
                .toBuffer();

            await sleep(2000);
            await sock.sendMessage(sender, {
                video: animatedBuffer,
                mimetype: 'video/gif',
                gifPlayback: true,
                caption: '🎬 Here is your video'
            }, { quoted: m });
            return;
        }

        // Sharp automatically handles static webp buffers and outputs a crisp PNG image
        const imageBuffer = await sharp(buffer)
            .png()
            .toBuffer();

        await sleep(2000);
        await sock.sendMessage(sender, {
            image: imageBuffer
        }, { quoted: m });

    } catch (error) {
        console.log("Sticker conversion error:", error);
        await sock.sendMessage(sender, { text: "❌ Failed to convert sticker. Please try again!" }, { quoted: m });
    }
}

module.exports = handleToImg; */

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

async function handleToImg({ sock, m, sender, sleep, getContextInfo }) {
    let msgContent = m.message;
    if (msgContent.ephemeralMessage) msgContent = msgContent.ephemeralMessage.message;
    if (msgContent.viewOnceMessage) msgContent = msgContent.viewOnceMessage.message;
    if (msgContent.viewOnceMessageV2) msgContent = msgContent.viewOnceMessageV2.message;

    let stickerMessage = null;

    if (msgContent.stickerMessage) {
        stickerMessage = msgContent.stickerMessage;
    } else {
        const contextInfo = getContextInfo();
        if (contextInfo && contextInfo.quotedMessage) {
            let quoted = contextInfo.quotedMessage;
            if (quoted.ephemeralMessage) quoted = quoted.ephemeralMessage.message;
            if (quoted.viewOnceMessage) quoted = quoted.viewOnceMessage.message;
            if (quoted.viewOnceMessageV2) quoted = quoted.viewOnceMessageV2.message;
            if (quoted.stickerMessage) {
                stickerMessage = quoted.stickerMessage;
            }
        }
    }

    if (!stickerMessage) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ Please send or reply to a sticker with `.toimg`!" }, { quoted: m });
        return;
    }

    try {
        const stream = await downloadContentFromMessage(stickerMessage, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const mimetype = stickerMessage.mimetype || '';
        const isVideoSticker = /video/i.test(mimetype);
        const isAnimatedSticker = Boolean(stickerMessage.isAnimated) || /gif/i.test(mimetype);

        // 1. If it's a true video sticker (MP4/WebM), send it directly as a video file
        if (isVideoSticker || mimetype === 'video/mp4') {
            await sleep(2000);
            await sock.sendMessage(sender, {
                video: buffer,
                mimetype: 'video/mp4',
                caption: '🎬 Here is your video'
            }, { quoted: m });
            return;
        }

        // 2. If it's an animated WebP sticker, convert it to an animated GIF/video via Sharp
        if (isAnimatedSticker) {
            try {
                const animatedBuffer = await sharp(buffer, { animated: true })
                    .gif({ loop: 0, delay: 100 })
                    .toBuffer();

                await sleep(2000);
                await sock.sendMessage(sender, {
                    video: animatedBuffer,
                    mimetype: 'video/gif',
                    gifPlayback: true,
                    caption: '🎬 Here is your video'
                }, { quoted: m });
                return;
            } catch (sharpError) {
                console.log("Sharp animated webp conversion fallback triggered:", sharpError);
                // Fallback: send raw buffer as video if sharp fails on this specific format
                await sleep(2000);
                await sock.sendMessage(sender, {
                    video: buffer,
                    mimetype: 'video/mp4',
                    caption: '🎬 Here is your video'
                }, { quoted: m });
                return;
            }
        }

        // 3. Otherwise, it's a static sticker -> convert to crisp PNG image
        const imageBuffer = await sharp(buffer)
            .png()
            .toBuffer();

        await sleep(2000);
        await sock.sendMessage(sender, {
            image: imageBuffer
        }, { quoted: m });

    } catch (error) {
        console.log("Sticker conversion error:", error);
        await sock.sendMessage(sender, { text: "❌ Failed to convert sticker. Please try again!" }, { quoted: m });
    }
}

module.exports = handleToImg;
