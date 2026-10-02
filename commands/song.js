const ALLOWED_USERS = [
    '34798496137284',
    '232251178627089',
    '215960048926932' // Only your phone number digits are allowed
];

const yt = require('@vreden/youtube_scraper');
const MAX_SECONDS = 4000; // ~6 minutes max (guarantees file stays under 5MB)

// 📊 In-memory tracking for usage limit until bot restarts
const userUsageCounts = new Map();
const SPECIFIC_USER_LIMITS = {
    '215960048926932': 5 
};

// Helper to handle timeouts so the bot never hangs indefinitely
const fetchBufferWithTimeout = async (url, options = {}, timeoutMs = 45000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (!response.ok) {
            await response.body?.cancel();
            throw new Error(`HTTP ${response.status} while fetching media`);
        }
        return Buffer.from(await response.arrayBuffer());
    } finally {
        clearTimeout(timeout);
    }
};

const getAudioWithRetry = async (url) => {
    for (let attempt = 1; attempt <= 2; attempt++) {
        let timeout;
        try {
            const result = await Promise.race([
                yt.ytmp3(url, 128),
                new Promise((_, reject) => {
                    timeout = setTimeout(() => reject(new Error('Audio provider timed out')), 45000);
                })
            ]);

            if (result?.status && result.download?.status && result.download?.url) {
                return result;
            }
        } catch (error) {
            console.warn(`Audio provider attempt ${attempt} failed:`, error.message);
        } finally {
            clearTimeout(timeout);
        }

        if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
        }
    }

    throw new Error('The YouTube audio provider is temporarily unavailable.');
};

module.exports = async function handleSong({ sock, m, sender, text }) {
    const chatId = m.key.remoteJid;

    // 🛡️ Extract user identifier
    const userJid = m.key.participant || sender || chatId;
    const senderCleanId = userJid ? userJid.split('@')[0].split(':')[0] : '';

    // 🛡️ Strict User Check
/*    if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(senderCleanId)) {
        return;
    } */

    // 🔢 USAGE LIMIT QUOTA CHECK (Resets when bot restarts)
    if (SPECIFIC_USER_LIMITS[senderCleanId] !== undefined) {
        const maxAllowed = SPECIFIC_USER_LIMITS[senderCleanId];
        const currentUsage = userUsageCounts.get(senderCleanId) || 0;

        if (currentUsage >= maxAllowed) {
            await sock.sendMessage(chatId, { 
                text: `❌ *Limit Reached!*\n\nContact admin for appeal and renewal.` 
            });
            return;
        }
        
        userUsageCounts.set(senderCleanId, currentUsage + 1);
    }

    // Robust query extraction (supports .song, .music, .mp3 regardless of character length)
    const textStr = typeof text === 'string' ? text : '';
    const args = textStr.trim().split(/ +/).slice(1);
    const query = args.join(' ');

    if (!query) {
        await sock.sendMessage(chatId, { 
            text: '🎵 *Song Downloader*\n\n*Usage:*\n>.vibe <name> ' 
        });
        return;
    }

    try {
        const searchResult = await yt.search(query);
        const video = searchResult.results?.[0];
        if (!searchResult.status || !video) {
            await sock.sendMessage(chatId, { text: '❌ No results found.' });
            return;
        }

        if (video.seconds && video.seconds > MAX_SECONDS) {
            await sock.sendMessage(chatId, {
                text: `❌ *Download Blocked!*\n\n"${video.title || query}" is *${video.timestamp || `${video.seconds} seconds`}* long.`
            });
            return;
        }

        const previewPromise = video.thumbnail
            ? (async () => {
                try {
                   const thumbnail = await fetchBufferWithTimeout(video.thumbnail, {}, 10000);
                    await sock.sendMessage(chatId, {
                        image: thumbnail,
                        caption: `🎵 *${video.title || query}*`
                        // \n⏱ ${video.timestamp || 'Unknown'}
                    }); 

                } catch (previewError) {
                    console.warn('Song thumbnail unavailable:', previewError.message);
                } 
            })() 
            : Promise.resolve();

        const res = await getAudioWithRetry(video.url);

        const downloadUrl = res.download.url;

        const rawTitle = String(res.metadata?.title || video.title || 'song');
        const safeFileName = rawTitle.replace(/[<>:"/\\|?*]/g, '_') + '.mp3';

        // Download audio binary with timeout
        const buffer = await fetchBufferWithTimeout(downloadUrl, {}, 60000);

        await previewPromise;
        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: safeFileName,
            ptt: false
        });

    } catch (err) {
        console.error('Song plugin error:', err.message);
        if (sock.ws?.isOpen) {
            try {
                const message = err.message.includes('audio provider')
                    ? '❌ The song download service is temporarily unavailable. Please try again shortly.'
                    : `❌ Failed: ${err.message}`;
                await sock.sendMessage(chatId, { text: message });
            } catch (sendError) {
                console.error('Failed to send song error message:', sendError.message);
            }
        }
    }
};