/* const ALLOWED_USERS = [
    '34798496137284',
    '232251178627089' // Only your phone number digits are allowed
];

const yts = require('yt-search');

const DL_API = 'https://api.qasimdev.dpdns.org/api/loaderto/download';
const API_KEY = 'xbps-install-Syu';
const MAX_SECONDS = 400; // ~6 minutes max (guarantees file stays under 5MB)

// 📊 In-memory tracking for usage limit until bot restarts
const userUsageCounts = new Map();
const SPECIFIC_USER_LIMITS = {
    '34798496137284': 100 
};

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function downloadWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(`${DL_API}?apiKey=${API_KEY}&format=mp3&url=${encodeURIComponent(url)}`, {
                signal: AbortSignal.timeout(120000)
            });
            
            const data = await response.json();
            if (data?.data?.downloadUrl) return data.data;
            
            throw new Error('No download URL returned from API');
        } catch (err) {
            if (i === retries - 1) throw err;
            console.log(`Download attempt ${i + 1} failed, retrying in 5s...`);
            await wait(5000);
        }
    }
    throw new Error('All download attempts failed');
}

module.exports = async function handleSong({ sock, m, sender, text, sleep }) {
    const chatId = m.key.remoteJid;

    // 🛡️ Extract user identifier
    const userJid = m.key.participant || sender || chatId;
    const senderCleanId = userJid ? userJid.split('@')[0].split(':')[0] : '';

    // 🔍 Prints to terminal for EVERYONE who tries the command (uncomment if you want to use it)
    // console.log(`[Song Command] Request from User JID: ${userJid} | Clean ID: ${senderCleanId}`);

    // 🛡️ Strict User Check
    if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(senderCleanId)) {
        // await sock.sendMessage(chatId, { text: '❌ Access denied. You are not authorized to use this command.' });
        return;
    }

    // 🔢 USAGE LIMIT QUOTA CHECK (Resets when bot restarts)
    if (SPECIFIC_USER_LIMITS[senderCleanId] !== undefined) {
        const maxAllowed = SPECIFIC_USER_LIMITS[senderCleanId];
        const currentUsage = userUsageCounts.get(senderCleanId) || 0;

        if (currentUsage >= maxAllowed) {
            await sock.sendMessage(chatId, { 
                text: `❌ *Limit Reached!*\n\nContact admin for appeal and renewal.` 
// *${maxAllowed}* song downloads. This will reset when the bot restarts.` 
            });
            return;
        }
        
        userUsageCounts.set(senderCleanId, currentUsage + 1);
    }

    const query = text.slice(5).trim();

    if (!query) {
        await sock.sendMessage(chatId, { 
            text: '🎵 *Song Downloader*\n\nUsage:\n.song <song name | YouTube link>' 
        });
        return;
    }

    try {
        let video;
        // Fetch metadata / search details first (uses virtually zero data)
        const searchResult = await yts(query);
        const videos = searchResult.videos;
        
        if (!videos || videos.length === 0) {
            await sock.sendMessage(chatId, { text: '❌ No results found.' });
            return;
        }
        video = videos[0];

        // 🛡️ INSTANT ZERO-DATA BLOCK: Check duration before downloading any audio stream!
        if (video.seconds && video.seconds > MAX_SECONDS) {
            await sock.sendMessage(chatId, { 
                text: `❌ *Download Blocked!*\n\n"${video.title}" is *${video.timestamp}* long.` 
            });
            return; // Stops completely. Zero audio bytes downloaded!
        }

        if (video.thumbnail) {
            await sock.sendMessage(chatId, {
                image: { url: video.thumbnail },
                caption: `🎶 *${video.title || query}*\n⏱ ${video.timestamp || 'Unknown'}\n\n⏳ Fetching Exclusive Audio File...`
            });
        }

        const audioData = await downloadWithRetry(video.url);
        const downloadUrl = audioData.downloadUrl;

        await sleep(1000);
        
        const rawTitle = audioData.title || video.title || 'song';
        const safeFileName = rawTitle.replace(/[<>:"/\\|?*]/g, '_') + '.mp3';

        // Safe to download and send since it already passed the length filter
        const audioResponse = await fetch(downloadUrl);
        if (!audioResponse.ok) {
            throw new Error('Failed to fetch audio stream from download URL');
        }

        const arrayBuffer = await audioResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: safeFileName,
            ptt: false
        });

    } catch (err) {
        console.error('Song plugin error:', err.message);
        await sock.sendMessage(chatId, { text: `❌ Failed: ${err.message}` });
    }
};