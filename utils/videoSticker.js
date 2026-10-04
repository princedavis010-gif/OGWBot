const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const { execFile } = require('child_process');
const sharp = require('sharp');
const ffmpegPath = require('ffmpeg-static');

const execFileAsync = promisify(execFile);

async function createAnimatedStickerFromVideo(videoBuffer, { fit = 'contain' } = {}) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sticker-video-'));
    const inputPath = path.join(tempDir, 'input.mp4');
    const outputPath = path.join(tempDir, 'animation.webp');
    const videoFilter = fit === 'cover'
        ? 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512'
        : "scale='min(512,iw*512/ih)':'min(512,ih*512/iw)',pad=512:512:(512-iw)/2:(512-ih)/2:color=black@0";

    try {
        fs.writeFileSync(inputPath, videoBuffer);
        await execFileAsync(ffmpegPath, [
            '-y',
            '-i', inputPath,
            '-ss', '0',
            '-t', '4',
            '-vf', videoFilter,
            '-loop', '0',
            '-vcodec', 'libwebp',
            '-an',
            outputPath
        ]);

        const animationBuffer = fs.readFileSync(outputPath);
        return await sharp(animationBuffer, { animated: true })
            .webp({ quality: 70, effort: 4, lossless: false })
            .toBuffer();
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

module.exports = { createAnimatedStickerFromVideo };
