const sharp = require('sharp');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'scr',
    description: 'Crops an image to a 1:1 square aspect ratio and converts it into a WhatsApp sticker',
    
    async execute(sock, m, { from, quoted }) {
        try {
            // Check if the message is an image or a reply to an image
            const targetMessage = m.message?.imageMessage || quoted?.imageMessage;

            if (!targetMessage) {
                return await sock.sendMessage(from, { 
                    text: "❌ Please send an image with caption .scr or reply to an image with .scr" 
                }, { quoted: m });
            }

            await sock.sendMessage(from, { 
                text: "✂️ Cropping image to 1:1 square & creating sticker..." 
            }, { quoted: m });

            // Download the image stream
            const stream = await downloadContentFromMessage(targetMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Crop image to a 1:1 square aspect ratio using Sharp
            const metadata = await sharp(buffer).metadata();
            const size = Math.min(metadata.width, metadata.height);

            const croppedBuffer = await sharp(buffer)
                .resize({
                    width: size,
                    height: size,
                    fit: 'cover',      // Crops excess edges to make it a perfect square
                    position: 'centre' // Focuses on the center of the image
                })
                .toFormat('webp')     // Convert to WebP format for WhatsApp stickers
                .toBuffer();

            // Send the resulting sticker
            await sock.sendMessage(from, { sticker: croppedBuffer }, { quoted: m });

        } catch (err) {
            console.error("Scr command error:", err);
            await sock.sendMessage(from, { 
                text: `❌ Failed to process image: ${err.message}` 
            }, { quoted: m });
        }
    }
};