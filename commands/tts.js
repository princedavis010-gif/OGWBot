// commands/tts.js

async function handleTTS(sock, m, text, sender, sleep) {
    const queryText = text.slice(4).trim();
    if (!queryText) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ Please provide text for the audio! Example: .tts Hello everyone, OG is live." }, { quoted: m });
        return;
    }

    try {
        await sleep(1000);
        const encodedText = encodeURIComponent(queryText);
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=en-US&client=tw-ob`;

        // Fetch with full browser spoofing headers to bypass server blocks
        const response = await fetch(ttsUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://translate.google.com/',
                'Origin': 'https://translate.google.com'
            }
        });

        if (!response.ok) throw new Error(`TTS server returned status ${response.status}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);

        // Send as standard audio track using audio/mpeg and ptt: false
        await sock.sendMessage(sender, { 
            audio: audioBuffer, 
            mimetype: 'audio/mpeg', 
            ptt: false 
        }, { quoted: m });

    } catch (error) {
        console.error("TTS error:", error);
        await sock.sendMessage(sender, { text: "❌ Failed to generate audio message." }, { quoted: m });
    }
}

module.exports = handleTTS;