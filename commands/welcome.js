async function handleWelcome({ sock, update, sleep }) {
    const { id, participants, action } = update;
    const { isWelcomeEnabled } = require('./utils/welcomeControl');

    // Only trigger when new members are added/join the group
    if (action !== 'add') return;

    // 🛑 Stop immediately if welcome is not toggled ON for this group
    if (!isWelcomeEnabled(id)) return;

    for (const participant of participants) {
        const participantJid = typeof participant === 'string' ? participant : (participant.id || participant.jid || '');
        if (!participantJid) continue;

        const phoneNumber = participantJid.split('@')[0];
        
        // Try to fetch the group name
        let groupName = "this group";
        try {
            const metadata = await sock.groupMetadata(id);
            groupName = metadata.subject;
        } catch (error) {
            console.error("Failed to fetch group metadata for welcome:", error);
        }

        const welcomeText = `╚»☬🌟◻️♥ WELCOME ♥◻️🌟☬«╝\n\n✨ Welcome to *${groupName}*! ✨\n\n👤 @${phoneNumber}\n\n> OG`;

        await sleep(1500);
        await sock.sendMessage(id, {
            text: welcomeText,
            mentions: [participantJid]
        }); 
    } 
} 

module.exports = handleWelcome;