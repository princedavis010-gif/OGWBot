// commands/kick.js

async function handleKick(sock, m, text, sender, sleep) {
    if (!sender.endsWith('@g.us')) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ This command can only be used inside a WhatsApp group!" });
        return;
    }

    // Extract contextInfo safely from the message object
    const contextInfo = m.message?.extendedTextMessage?.contextInfo || 
                        m.message?.imageMessage?.contextInfo || 
                        m.message?.videoMessage?.contextInfo;

    const mentionedJids = contextInfo?.mentionedJid || [];
    let targetJid = mentionedJids[0];

    // Fallback: Check if replying to someone's message
    if (!targetJid && contextInfo && contextInfo.participant) {
        targetJid = contextInfo.participant;
    }

    if (!targetJid) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "Who do you wanna evict so badly?" }, { quoted: m });
        return;
    }

    try {
        // Fetch group metadata for the styled goodbye banner
        let groupName = "this group";
        try {
            const metadata = await sock.groupMetadata(sender);
            groupName = metadata.subject;
        } catch (error) {
            console.error("Failed to fetch group metadata for kick:", error);
        }

        // Generate time and date (e.g., 21:05, 09/25/2026)
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        const dateStr = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()}`;

        const phoneNumber = targetJid.split('@')[0];

        await sleep(1000);
        await sock.groupParticipantsUpdate(sender, [targetJid], 'remove');

        const kickText = `╚»☬🌟◻️♥ GOODBYE ♥◻️🌟☬«╝\n\n✨ Evicted from *${groupName}*! ✨\n\n👤 @${phoneNumber}\n\n> OG`;

        await sock.sendMessage(sender, { 
            text: kickText, 
            mentions: [targetJid] 
        }, { quoted: m });

    } catch (error) {
        console.error("Kick error:", error);
        await sock.sendMessage(sender, { text: "❌ Make me admin fess" }, { quoted: m });
    }
}

module.exports = handleKick;