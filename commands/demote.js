// commands/demote.js

async function handleDemote(sock, m, text, sender, sleep) {
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
        await sock.sendMessage(sender, { text: "Who do you wanna strip of admin powers?" }, { quoted: m });
        return;
    }

    try {
        await sleep(1000);
        await sock.groupParticipantsUpdate(sender, [targetJid], 'demote');
        await sock.sendMessage(sender, { 
            text: `@${targetJid.split('@')[0]} has been demoted from admin! 📉`, 
            mentions: [targetJid] 
        }, { quoted: m });
    } catch (error) {
        console.error("Demote error:", error);
        await sock.sendMessage(sender, { text: "Make me admin fess!" }, { quoted: m });
    }
}

module.exports = handleDemote;