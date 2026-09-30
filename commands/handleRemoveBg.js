const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function handleRemoveBg({ sock, m, sender, sleep, getContextInfo }) {
    let imageMessage = null;
    const contextInfo = getContextInfo();

    // Check if current message is an image
    if (m.message?.imageMessage) {
        imageMessage = m.message.imageMessage;
    } 
    // Check if replying to an image message
    else if (contextInfo && contextInfo.quotedMessage) {
        let quoted = contextInfo.quotedMessage;
        if (quoted.ephemeralMessage) quoted = quoted.ephemeralMessage.message;
        if (quoted.viewOnceMessage) quoted = quoted.viewOnceMessage.message;
        if (quoted.viewOnceMessageV2) quoted = quoted.viewOnceMessageV2.message;
        if (quoted.imageMessage) {
            imageMessage = quoted.imageMessage;
        }
    }

    if (!imageMessage) {
        await sleep(1500);
        await sock.sendMessage(sender, { text: "❌ Please send an image with caption `.rbg` or reply to an image with `.rbg`! It's that simple 🤦🏼🤦🏼‍♂️" }, { quoted: m });
        return;
    }

    try {
       /* await sleep(500);
        await sock.sendMessage(sender, { text: "🔄 Removing background, abeg wait small..." }, { quoted: m }); */

        // Download the image buffer using Baileys stream
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // Use native Node.js FormData and Blob (No axios needed!)
        const formData = new FormData();
        const blob = new Blob([buffer], { type: 'image/jpeg' });
        formData.append('image_file', blob, 'image.jpg');
        formData.append('size', 'auto');

        // Send request using native fetch
        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
                'X-Api-Key': 'qSbwNU99rBGbagGvXYgP39Zf' // 🔑 Put your API key here
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Remove.bg server returned status ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const removedBgBuffer = Buffer.from(arrayBuffer);

        await sleep(2000);
        await sock.sendMessage(sender, {
            image: removedBgBuffer,
            caption: "✨ Done!"
        }, { quoted: m });

    } catch (err) {
        console.error("Remove BG error:", err);
        await sock.sendMessage(sender, { text: "❌ Network issue. Try again later!" }, { quoted: m });
    }
}

module.exports = handleRemoveBg;