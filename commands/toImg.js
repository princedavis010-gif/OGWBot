const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

function unwrapMessage(message) {
    let content = message;
    while (content?.ephemeralMessage || content?.viewOnceMessage || content?.viewOnceMessageV2) {
        content = content.ephemeralMessage?.message ||
            content.viewOnceMessage?.message ||
            content.viewOnceMessageV2?.message;
    }
    return content;
}

async function handleToImg({ sock, m, sender, sleep, getContextInfo }) {
    const msgContent = unwrapMessage(m.message) || {};
    const contextInfo = getContextInfo ? getContextInfo() : null;
    let stickerMessage = msgContent.stickerMessage || null;

    if (!stickerMessage && contextInfo?.quotedMessage) {
        stickerMessage = unwrapMessage(contextInfo.quotedMessage)?.stickerMessage || null;
    }

    if (!stickerMessage) {
        await sock.sendMessage(sender, {
            text: '❌ Please send or reply to a static sticker with `.toimg`. Use `.tovid` for animated/video stickers.'
        }, { quoted: m });
        return;
    }

    try {
        const stream = await downloadContentFromMessage(stickerMessage, 'sticker');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        const mimetype = stickerMessage.mimetype || '';
        const isAnimatedSticker = Boolean(stickerMessage.isAnimated) ||
            /video|gif/i.test(mimetype) ||
            buffer.includes(Buffer.from('ANIM')) ||
            buffer.includes(Buffer.from('ANMF'));

        if (isAnimatedSticker) {
            await sock.sendMessage(sender, {
                text: '❌ `.toimg` only converts static stickers. Use `.tovid` for this animated/video sticker.'
            }, { quoted: m });
            return;
        }

        const imageBuffer = await sharp(buffer).png().toBuffer();
        await sleep(2000);
        await sock.sendMessage(sender, { image: imageBuffer }, { quoted: m });
    } catch (error) {
        console.error('Static sticker conversion error:', error);
        await sock.sendMessage(sender, {
            text: '❌ Failed to convert static sticker. Please try again.'
        }, { quoted: m });
    } 
} 

module.exports = handleToImg;