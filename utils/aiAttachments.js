const fs = require('fs');
const os = require('os');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const AppInfoParser = require('app-info-parser');

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const MAX_TEXT_CHARS = 50000;
const TEXT_EXTENSIONS = new Set([
    '.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.html', '.htm',
    '.yaml', '.yml', '.log', '.ini', '.properties', '.js', '.ts', '.css',
    '.py', '.java', '.c', '.cpp', '.h', '.sql', '.sh'
]);

function unwrapMessage(message) {
    let content = message;
    while (content?.ephemeralMessage || content?.viewOnceMessage ||
        content?.viewOnceMessageV2 || content?.documentWithCaptionMessage) {
        content = content.ephemeralMessage?.message ||
            content.viewOnceMessage?.message ||
            content.viewOnceMessageV2?.message ||
            content.documentWithCaptionMessage?.message;
    }
    return content;
}

function findMediaMessage(message) {
    const content = unwrapMessage(message) || {};
    const mediaTypes = [
        ['imageMessage', 'image'],
        ['videoMessage', 'video'],
        ['audioMessage', 'audio'],
        ['documentMessage', 'document'],
        ['stickerMessage', 'sticker']
    ];

    for (const [key, type] of mediaTypes) {
        if (content[key]) return { message: content[key], type };
    }
    return null;
}

function inferMimeType(fileName, fallback) {
    if (fallback && fallback !== 'application/octet-stream') return fallback;
    const extension = path.extname(fileName || '').toLowerCase();
    const knownTypes = {
        '.apk': 'application/vnd.android.package-archive',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.json': 'application/json',
        '.xml': 'application/xml',
        '.csv': 'text/csv',
        '.html': 'text/html',
        '.htm': 'text/html',
        '.yaml': 'application/yaml',
        '.yml': 'application/yaml',
        '.log': 'text/plain',
        '.properties': 'text/plain',
        '.js': 'text/javascript',
        '.ts': 'text/plain',
        '.css': 'text/css',
        '.py': 'text/x-python',
        '.java': 'text/x-java-source',
        '.c': 'text/x-c',
        '.cpp': 'text/x-c++',
        '.h': 'text/plain',
        '.sql': 'text/plain',
        '.sh': 'text/plain'
    };
    return knownTypes[extension] || fallback || 'application/octet-stream';
}

async function readMediaBuffer(mediaMessage, mediaType) {
    const declaredSize = Number(mediaMessage.fileLength || 0);
    if (declaredSize > MAX_ATTACHMENT_BYTES) {
        throw new Error('Attachments must be smaller than 15 MB.');
    }

    const stream = await downloadContentFromMessage(mediaMessage, mediaType);
    const chunks = [];
    let totalBytes = 0;
    for await (const chunk of stream) {
        totalBytes += chunk.length;
        if (totalBytes > MAX_ATTACHMENT_BYTES) {
            throw new Error('Attachments must be smaller than 15 MB.');
        }
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

async function createApkTextPart(buffer, fileName) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'og-apk-'));
    const apkPath = path.join(tempDir, 'attachment.apk');

    try {
        fs.writeFileSync(apkPath, buffer);
        const appInfo = await new AppInfoParser(apkPath).parse();
        const usefulKeys = new Set([
            'package', 'versionCode', 'versionName', 'sdkVersion', 'targetSdkVersion',
            'application-label', 'launchable-activity', 'uses-permission',
            'uses-permission-sdk-23', 'uses-feature', 'uses-feature-not-required',
            'application'
        ]);
        const manifestSummary = Object.fromEntries(
            Object.entries(appInfo).filter(([key]) => usefulKeys.has(key))
        );

        return {
            text: `APK attachment: ${fileName}\nAndroid manifest metadata:\n${JSON.stringify(manifestSummary, null, 2)}\nThis is package metadata only; do not claim to have decompiled or executed the APK.`
        };
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

async function getAiAttachmentParts({ message, contextInfo }) {
    const attachment = findMediaMessage(message) ||
        findMediaMessage(contextInfo?.quotedMessage);
    if (!attachment) return [];

    const { message: mediaMessage, type } = attachment;
    const fileName = mediaMessage.fileName || mediaMessage.title || `WhatsApp ${type}`;
    const detectedMimeType = inferMimeType(fileName, mediaMessage.mimetype);
    const mimeType = type === 'audio'
        ? detectedMimeType.split(';', 1)[0].trim()
        : detectedMimeType;
    const buffer = await readMediaBuffer(mediaMessage, type);

    if (mimeType === 'application/vnd.android.package-archive' || path.extname(fileName).toLowerCase() === '.apk') {
        return [await createApkTextPart(buffer, fileName)];
    }

    if (mimeType.startsWith('text/') ||
        ['application/json', 'application/xml', 'application/yaml', 'application/javascript'].includes(mimeType) ||
        TEXT_EXTENSIONS.has(path.extname(fileName).toLowerCase())) {
        const content = buffer.toString('utf8').replace(/\0/g, '').slice(0, MAX_TEXT_CHARS);
        if (!content.trim()) throw new Error(`I couldn't read text from ${fileName}.`);
        return [{ text: `Text attachment: ${fileName}\n\n${content}` }];
    }

    if (mimeType === 'application/pdf' ||
        mimeType.startsWith('image/') ||
        mimeType.startsWith('video/') ||
        mimeType.startsWith('audio/')) {
        return [
            { text: `Attachment: ${fileName} (${mimeType})` },
            { inlineData: { data: buffer.toString('base64'), mimeType } }
        ];
    }

    throw new Error(`I can't inspect ${fileName} (${mimeType}) yet. Supported files are images, videos, audio, PDFs, text files, and APK manifests.`);
}

module.exports = { getAiAttachmentParts };