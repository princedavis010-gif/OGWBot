// commands/tagall.js

async function handleTagAll(sock, m, text, sender, sleep, botJids = []) {
    if (!sender.endsWith('@g.us')) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ This command can only be used inside a WhatsApp group!" });
        return;
    }

    try {
        const groupMetadata = await sock.groupMetadata(sender);
        const participants = groupMetadata.participants;
        const botNumbers = new Set(botJids
            .filter(Boolean)
            .map(jid => jid.split('@')[0].split(':')[0]));
        const memberJids = participants
            .map(participant => participant.id)
            .filter(jid => !botNumbers.has(jid.split('@')[0].split(':')[0]));

        // Dynamically slice depending on which trigger was used
        const trigger = text.toLowerCase().startsWith('.evy') ? '.evy' : '.tagall';
        const customMessage = text.slice(trigger.length).trim();
        
       /* let tagText = `*ALL MEMBERS*\n\n`;
        
        if (customMessage) {
            tagText += `${customMessage}\n\n`;
        }

        for (let jid of memberJids) {
            const phoneNumber = jid.split('@')[0];
            tagText += `👉🏼 @${phoneNumber}\n`;
        } */

      let tagText = `📢`;
        for (let jid of memberJids) {
            const phoneNumber = jid.split('@')[0];
       //     tagText += `@${phoneNumber} `;
        }


        await sleep(1000);
        await sock.sendMessage(sender, {
            text: tagText,
            mentions: memberJids
        });

        if (customMessage) {
                await sleep(500);
                await sock.sendMessage(sender, { text: customMessage });
            }
        // , { quoted: m });

    } catch (error) {
        console.error("Error executing tagall:", error);
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ Failed to tag group members." });
    }
}

module.exports = handleTagAll;