// commands/promote.js

async function handlePromote(sock, m, text, sender, sleep) {
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
        await sock.sendMessage(sender, { text: "Who do you wanna make admin?" }, { quoted: m });
        return;
    }

    try {
        await sleep(1000);
        await sock.groupParticipantsUpdate(sender, [targetJid], 'promote');
        await sock.sendMessage(sender, { 
            text:

            `                     *『 GROUP PROMOTION 』*\n
👑 *_Congratulations @${targetJid.split('@')[0]}!_*\n
You have been promoted to admin in 𝓣𝓗𝓔 𝓔𝓛𝓘𝓣𝓔 𝓗𝓤𝓑! 🎉\n
Please use your powers responsibly. 🌚\n
> *𝓞𝓖 𝓒𝓞𝓡𝓔*`,
            
            // `Congratulations @${targetJid.split('@')[0]} 🎉 , you're now an admin!`, 
            mentions: [targetJid] 
        }, { quoted: m });
    } catch (error) {
        console.error("Promote error:", error);
        await sock.sendMessage(sender, { text: "Make me admin fess!" }, { quoted: m });
    }
}

module.exports = handlePromote;