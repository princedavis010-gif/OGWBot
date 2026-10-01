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

module.exports = handleToImg;