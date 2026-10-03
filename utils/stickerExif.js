function createChunk(type, data) {
    const header = Buffer.alloc(8);
    header.write(type, 0, 4, 'ascii');
    header.writeUInt32LE(data.length, 4);
    const padding = data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0);
    return Buffer.concat([header, data, padding]);
}

function getImageDimensions(chunks) {
    const lossless = chunks.find((chunk) => chunk.type === 'VP8L');
    if (lossless && lossless.data.length >= 5 && lossless.data[0] === 0x2f) {
        const bits = lossless.data.readUInt32LE(1);
        return {
            width: (bits & 0x3fff) + 1,
            height: ((bits >>> 14) & 0x3fff) + 1,
            hasAlpha: Boolean(bits & 0x10000000)
        };
    }

    const lossy = chunks.find((chunk) => chunk.type === 'VP8 ');
    if (lossy && lossy.data.length >= 10 && lossy.data.subarray(3, 6).equals(Buffer.from([0x9d, 0x01, 0x2a]))) {
        return {
            width: lossy.data.readUInt16LE(6) & 0x3fff,
            height: lossy.data.readUInt16LE(8) & 0x3fff,
            hasAlpha: chunks.some((chunk) => chunk.type === 'ALPH')
        };
    }

    throw new Error('Cannot read image dimensions from WebP sticker.');
}

module.exports = function addExifToWebp(webpBuffer, packname, author) {
    if (webpBuffer.toString('ascii', 0, 4) !== 'RIFF' || webpBuffer.toString('ascii', 8, 12) !== 'WEBP') {
        return webpBuffer;
    }

    const chunks = [];
    let offset = 12;
    while (offset + 8 <= webpBuffer.length) {
        const type = webpBuffer.toString('ascii', offset, offset + 4);
        const size = webpBuffer.readUInt32LE(offset + 4);
        const end = offset + 8 + size;
        if (end > webpBuffer.length) throw new Error('WebP sticker contains an invalid chunk.');
        if (type !== 'EXIF') {
            const paddedEnd = end + (size % 2);
            chunks.push({
                type,
                data: webpBuffer.subarray(offset + 8, end),
                raw: webpBuffer.subarray(offset, Math.min(paddedEnd, webpBuffer.length))
            });
        }
        offset = end + (size % 2);
    }

    const extendedHeaderIndex = chunks.findIndex((chunk) => chunk.type === 'VP8X');
    if (extendedHeaderIndex >= 0) {
        const extendedHeader = Buffer.from(chunks[extendedHeaderIndex].raw);
        if (extendedHeader.length < 18) throw new Error('WebP extended header is incomplete.');
        extendedHeader[8] |= 0x08;
        chunks[extendedHeaderIndex] = { ...chunks[extendedHeaderIndex], raw: extendedHeader };
    } else {
        const { width, height, hasAlpha } = getImageDimensions(chunks);
        const featureFlags = 0x08 |
            (hasAlpha ? 0x10 : 0) |
            (chunks.some((chunk) => chunk.type === 'ICCP') ? 0x20 : 0) |
            (chunks.some((chunk) => chunk.type === 'XMP ') ? 0x04 : 0);
        const data = Buffer.alloc(10);
        data[0] = featureFlags;
        data.writeUIntLE(width - 1, 4, 3);
        data.writeUIntLE(height - 1, 7, 3);
        chunks.unshift({ type: 'VP8X', data, raw: createChunk('VP8X', data) });
    }

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
    const exifChunk = createChunk('EXIF', exif);
    const xmpIndex = chunks.findIndex((chunk) => chunk.type === 'XMP ');
    chunks.splice(xmpIndex < 0 ? chunks.length : xmpIndex, 0, { type: 'EXIF', raw: exifChunk });

    const bodySize = chunks.reduce((total, chunk) => total + chunk.raw.length, 0);
    const riffHeader = Buffer.alloc(12);
    riffHeader.write('RIFF', 0);
    riffHeader.writeUInt32LE(bodySize + 4, 4);
    riffHeader.write('WEBP', 8);

    return Buffer.concat([riffHeader, ...chunks.map((chunk) => chunk.raw)]);
};