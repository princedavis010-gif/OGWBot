const sharp = require('sharp');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const addExifToWebp = require('../utils/stickerExif');
const { createAnimatedStickerFromVideo } = require('../utils/videoSticker');

function unwrapMessage(message) {
    let content = message;
    while (content?.ephemeralMessage || content?.viewOnceMessage ||
        content?.viewOnceMessageV2 || content?.documentWithCaptionMessage) {
        content = content.ephemeralMessage?.message ||
            content.viewOnceMessage?.message ||
            content.viewOnceMessageV2?.message ||
            content.documentWithCaptionMessage?.message;
    }
    return content || {};
}

module.exports = {
    name: 'scr',
    description: 'Crops an image to 1:1 square aspect ratio and converts it into a WhatsApp sticker',

    async handle(sock, m, { from, quoted, text = '' }) {
        try {
            const msgContent = unwrapMessage(m.message);

            const contextInfo = msgContent?.extendedTextMessage?.contextInfo ||
                msgContent?.imageMessage?.contextInfo ||
                msgContent?.videoMessage?.contextInfo;

            let targetMessage = null;
            let mediaType = null;
            if (msgContent.imageMessage) {
                targetMessage = msgContent.imageMessage;
                mediaType = 'image';
            } else if (msgContent.videoMessage) {
                targetMessage = msgContent.videoMessage;
                mediaType = 'video';
            }

            if (!targetMessage && contextInfo?.quotedMessage) {
                const quotedMessage = unwrapMessage(contextInfo.quotedMessage);
                if (quotedMessage.imageMessage) {
                    targetMessage = quotedMessage.imageMessage;
                    mediaType = 'image';
                } else if (quotedMessage.videoMessage) {
                    targetMessage = quotedMessage.videoMessage;
                    mediaType = 'video';
                }
            }

            if (!targetMessage && quoted) {
                const quotedMessage = unwrapMessage(quoted);
                if (quotedMessage.imageMessage) {
                    targetMessage = quotedMessage.imageMessage;
                    mediaType = 'image';
                } else if (quotedMessage.videoMessage) {
                    targetMessage = quotedMessage.videoMessage;
                    mediaType = 'video';
                }
            }

            if (!targetMessage) {
                return await sock.sendMessage(from, {
                    text: '❌ Please send an image or video with the `.scr` caption or reply to one with `.scr`.'
                }, { quoted: m });
            }

            const stream = await downloadContentFromMessage(targetMessage, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const stickerBuffer = mediaType === 'video'
                ? await createAnimatedStickerFromVideo(buffer, { fit: 'cover' })
                : await sharp(buffer)
                    .resize({
                        width: 512,
                        height: 512,
                        fit: 'cover',
                        position: 'centre'
                    })
                    .webp({ quality: 80 })
                    .toBuffer();
            const args = text ? text.trim().split(/ +/).slice(1) : [];
            const packName = args.length > 0 ? args.join(' ') : 'Prince Davis';
            const stickerWithExif = addExifToWebp(stickerBuffer, packName, '');

            await sock.sendMessage(from, { sticker: stickerWithExif }, { quoted: m });

        } catch (err) {
            console.error('Scr command error:', err);
            await sock.sendMessage(from, {
                text: `❌ Failed to process image: ${err.message}`
            }, { quoted: m });
        }
    }
};
