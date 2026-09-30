// commands/vv.js
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function handleVV({ sock, m, sender, sleep, getContextInfo }) {
    // 🔥 Define your exact personal phone number here (with country code, e.g., "2348123456789")
    const ognumber = "2348124647818"; 

    const contextInfo = getContextInfo();

    if (!contextInfo || !contextInfo.quotedMessage) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ Please reply to a View Once image or video with `.vv`!" }, { quoted: m });
        return;
    }

    let quoted = contextInfo.quotedMessage;

    // Unpack potential nested message wrappers (ephemeral / view-once layers)
    if (quoted.ephemeralMessage) quoted = quoted.ephemeralMessage.message;
    if (quoted.viewOnceMessage) quoted = quoted.viewOnceMessage.message;
    if (quoted.viewOnceMessageV2) quoted = quoted.viewOnceMessageV2.message;
    if (quoted.viewOnceMessageV2Extension) quoted = quoted.viewOnceMessageV2Extension.message;

    let mediaMessage = null;
    let mediaType = '';

    if (quoted.imageMessage) {
        mediaMessage = quoted.imageMessage;
        mediaType = 'image';
    } else if (quoted.videoMessage) {
        mediaMessage = quoted.videoMessage;
        mediaType = 'video';
    }

    if (!mediaMessage) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ The quoted message is not a View Once image or video!" }, { quoted: m });
        return;
    }

  /*  await sleep(1000);
    await sock.sendMessage(sender, { text: "⏳ Unlocking View Once media..." }); */

    try {
        const stream = await downloadContentFromMessage(mediaMessage, mediaType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const caption = mediaMessage.caption || "🔓 *View Once Unlocked by OG*";

        // Construct target JID directly from ognumber
        const cleanOg = String(ognumber).replace(/[^0-9]/g, '');
        const targetJid = `${cleanOg}@s.whatsapp.net`;

        await sleep(1000);
        
        /* 🚀 Wake up chat route with text ping first so WhatsApp accepts the media
        await sock.sendMessage(targetJid, { text: "🔓 *Incoming Unlocked View-Once Media:*" });
        await sleep(500); */

        // Send media to your private DM using ognumber
        if (mediaType === 'image') {
            await sock.sendMessage(targetJid, { 
                image: buffer, 
                caption: caption 
            });
        } else if (mediaType === 'video') {
            await sock.sendMessage(targetJid, { 
                video: buffer, 
                caption: caption 
            });
        }

        // Send confirmation back to the group
      //  await sock.sendMessage(sender, { text: "✅ View Once media has been successfully sent to your private DM! 🔓" }, { quoted: m });

    } catch (error) {
        console.error("View Once extraction error:", error);
        await sock.sendMessage(sender, { text: `❌ Failed: ${error.message}` }, { quoted: m });
    }
}

module.exports = handleVV;