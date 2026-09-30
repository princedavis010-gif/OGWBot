// commands/sticker.js
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

async function handleSticker(sock, m, text, sender, sleep) {
    let imageMessage = null;

    // Unpack message content safely
    const msgContent = m.message?.ephemeralMessage?.message || 
                       m.message?.viewOnceMessage?.message || 
                       m.message?.viewOnceMessageV2?.message || 
                       m.message;

    const contextInfo = msgContent?.extendedTextMessage?.contextInfo || 
                        msgContent?.imageMessage?.contextInfo || 
                        msgContent?.videoMessage?.contextInfo;

    // Check if current message is an image with caption .s
    if (msgContent.imageMessage) {
        imageMessage = msgContent.imageMessage;
    } 
    // Check if replying to an image message
    else if (contextInfo && contextInfo.quotedMessage) {
        let quoted = contextInfo.quotedMessage;
        if (quoted.ephemeralMessage) quoted = quoted.ephemeralMessage.message;
        if (quoted.viewOnceMessage) quoted = quoted.viewOnceMessage.message;
        if (quoted.viewOnceMessageV2) quoted = quoted.viewOnceMessageV2.message;
        if (quoted.imageMessage) {
            imageMessage = quoted.imageMessage;
        }
    }

    if (!imageMessage) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ Please send an image with the `.s` caption or reply to an image with `.s`!" }, { quoted: m });
        return;
    }

 //   await sleep(1000);
   // await sock.sendMessage(sender, { text: "⏳ Crafting your sticker..." });

    try {
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const stickerBuffer = await sharp(buffer)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({ quality: 80 })
            .toBuffer();

        await sleep(1000);
        await sock.sendMessage(sender, { sticker: stickerBuffer }, { quoted: m });

    } catch (error) {
        console.error("Sticker generation error:", error);
        await sock.sendMessage(sender, { text: "❌ Failed to create sticker. Please try again!" }, { quoted: m });
    }
}

module.exports = handleSticker;