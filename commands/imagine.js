const { getAiImageResponse } = require('../aiService');

module.exports = async function handleImagine({ sock, m, sender, text, sleep }) {
    let prompt = '';
    if (text.toLowerCase().startsWith('$img')) {
        prompt = text.slice(4).trim();
    } else {
        prompt = text.slice(3).trim();
    }

    if (!prompt) {
        await sock.sendMessage(sender, { text: "❌ Guyy, provide a prompt!" });
        return;
    }
    await sleep(1500);
    await sock.sendMessage(sender, { text: "Hold on for a sec!" });

    try {
        const { buffer, mimeType } = await getAiImageResponse(prompt);
        await sock.sendMessage(sender, {
            image: buffer,
            mimetype: mimeType,
         //   caption: `🎨 *${prompt}*`
        });

    } catch (error) {
        console.error("Image generation error:", error);
        await sock.sendMessage(sender, { text: `❌ Image generation failed: ${error.message}` });
    }
};