// commands/taker.js
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

/**
 * Safely injects or replaces WhatsApp EXIF metadata in a WebP buffer 
 * (supports both static and animated stickers without breaking them)
 */
function addExifToWebp(webpBuffer, packname, author) {
    const json = {
        'sticker-pack-id': 'com.ogstash.taker',
        'sticker-pack-name': packname,
        'sticker-pack-publisher': author,
        'emojis': ['🎯', '✨']
    };

    // WhatsApp EXIF binary header structure
    const exifHeader = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuf = Buffer.from(JSON.stringify(json), 'utf-8');
    let exif = Buffer.concat([exifHeader, jsonBuf]);
    exif.writeUIntLE(jsonBuf.length, 14, 4);

    const len = exif.length;
    const pad = len % 2 === 0 ? len : len + 1;

    // WebP EXIF chunk wrapper
    const chunkHeader = Buffer.alloc(8);
    chunkHeader.write('EXIF', 0);
    chunkHeader.writeUInt32LE(len, 4);

    const exifChunk = Buffer.concat([chunkHeader, exif, Buffer.alloc(pad - len)]);

    // Validate RIFF/WebP container header
    if (webpBuffer.toString('ascii', 0, 4) !== 'RIFF' || webpBuffer.toString('ascii', 8, 12) !== 'WEBP') {
        return webpBuffer;
    }

    // Parse existing WebP chunks and strip any old EXIF chunk
    let offset = 12;
    let chunks = [];

    while (offset < webpBuffer.length) {
        if (offset + 8 > webpBuffer.length) break;
        const fourCC = webpBuffer.toString('ascii', offset, offset + 4);
        const size = webpBuffer.readUInt32LE(offset + 4);
        const totalSize = 8 + size + (size % 2); // WebP chunks are padded to even bytes

        if (fourCC !== 'EXIF') {
            chunks.push(webpBuffer.subarray(offset, offset + totalSize));
        }
        offset += totalSize;
    }

    // Insert the new custom EXIF chunk right after the WEBP header (at index 1)
    chunks.splice(1, 0, exifChunk);

    // Reconstruct the RIFF file container
    const bodySize = chunks.reduce((acc, c) => acc + c.length, 0);
    const newRiff = Buffer.alloc(12);
    newRiff.write('RIFF', 0);
    newRiff.writeUInt32LE(bodySize + 4, 4);
    newRiff.write('WEBP', 8);

    return Buffer.concat([newRiff, ...chunks]);
}

async function handleTaker({ sock, m, text, sender, sleep, getContextInfo }) {
    const contextInfo = getContextInfo();

    if (!contextInfo || !contextInfo.quotedMessage) {
        await sleep(1000);
        return;
    }

    let quoted = contextInfo.quotedMessage;

    // Unpack potential ephemeral wrappers
    if (quoted.ephemeralMessage) quoted = quoted.ephemeralMessage.message;

    const stickerMessage = quoted.stickerMessage;

    if (!stickerMessage) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ The quoted message is not a sticker!" }, { quoted: m });
        return;
    }

    // Extract dynamic author: uses whatever follows the command, else defaults to "Prince Davis"
    const args = text ? text.trim().split(/ +/).slice(1) : [];
    const customAuthor =  '';
    const packName = args.length > 0 ? args.join(' '): 'Prince Davis';

    await sleep(1000);

    try {
        // Download the original sticker media stream into a buffer
        const stream = await downloadContentFromMessage(stickerMessage, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        await sleep(1000);

        // Inject metadata directly into the raw WebP stream safely
        const processedBuffer = addExifToWebp(buffer, packName, customAuthor);

        // Send back the perfectly branded sticker
        await sock.sendMessage(sender, { sticker: processedBuffer }, { quoted: m });

    } catch (error) {
        console.error("Taker sticker error:", error);
        await sock.sendMessage(sender, { text: "❌ Failed to process sticker." }, { quoted: m });
    }
}

module.exports = handleTaker;