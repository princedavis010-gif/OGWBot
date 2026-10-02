module.exports = function addExifToWebp(webpBuffer, packname, author) {
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
};