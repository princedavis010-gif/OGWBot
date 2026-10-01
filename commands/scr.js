const sharp = require('sharp');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'scr',
    description: 'Crops an image to 1:1 square aspect ratio and converts it into a WhatsApp sticker',

    async handle(sock, m, { from, quoted }) {
        try {
            const msgContent = m.message?.ephemeralMessage?.message ||
                m.message?.viewOnceMessage?.message ||
                m.message?.viewOnceMessageV2?.message ||
                m.message;

            const contextInfo = msgContent?.extendedTextMessage?.contextInfo ||
                msgContent?.imageMessage?.contextInfo ||
                msgContent?.videoMessage?.contextInfo;

            let targetMessage = msgContent?.imageMessage || null;

            if (!targetMessage && contextInfo?.quotedMessage) {
                let quotedMessage = contextInfo.quotedMessage;
                if (quotedMessage.ephemeralMessage) quotedMessage = quotedMessage.ephemeralMessage.message;
                if (quotedMessage.viewOnceMessage) quotedMessage = quotedMessage.viewOnceMessage.message;
                if (quotedMessage.viewOnceMessageV2) quotedMessage = quotedMessage.viewOnceMessageV2.message;
                targetMessage = quotedMessage.imageMessage || null;
            }

            if (!targetMessage && quoted) {
                let quotedMessage = quoted;
                if (quotedMessage.ephemeralMessage) quotedMessage = quotedMessage.ephemeralMessage.message;
                if (quotedMessage.viewOnceMessage) quotedMessage = quotedMessage.viewOnceMessage.message;
                if (quotedMessage.viewOnceMessageV2) quotedMessage = quotedMessage.viewOnceMessageV2.message;
                targetMessage = quotedMessage.imageMessage || null;
            }

            if (!targetMessage) {
                return await sock.sendMessage(from, {
                    text: '❌ Please send an image with the `.scr` caption or reply to an image with `.scr`.'
                }, { quoted: m });
            }

            const stream = await downloadContentFromMessage(targetMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const croppedBuffer = await sharp(buffer)
                .resize({
                    width: 512,
                    height: 512,
                    fit: 'cover',
                    position: 'centre'
                })
                .webp({ quality: 80 })
                .toBuffer();

            await sock.sendMessage(from, { sticker: croppedBuffer }, { quoted: m });

        } catch (err) {
            console.error('Scr command error:', err);
            await sock.sendMessage(from, {
                text: `❌ Failed to process image: ${err.message}`
            }, { quoted: m });
        }
    }
};
