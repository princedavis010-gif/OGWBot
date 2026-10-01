// commands/tagall.js

async function handleTagAll(sock, m, text, sender, sleep) {
    if (!sender.endsWith('@g.us')) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ This command can only be used inside a WhatsApp group!" });
        return;
    }

    try {
        const groupMetadata = await sock.groupMetadata(sender);
        const participants = groupMetadata.participants;
        const memberJids = participants.map(p => p.id);

        // Dynamically slice depending on which trigger was used
       /* const trigger = text.toLowerCase().startsWith('.evy') ? '.evy' : '.tagall';
        const customMessage = text.slice(trigger.length).trim();
        
        let tagText = `*ALL MEMBERS*\n\n`;
        
        if (customMessage) {
            tagText += `${customMessage}\n\n`;
        }

        for (let jid of memberJids) {
            const phoneNumber = jid.split('@')[0];
            tagText += `👉🏼 @${phoneNumber}\n`;
        } */

            let tagText = `📢 `;
        for (let jid of memberJids) {
            const phoneNumber = jid.split('@')[0];
       //     tagText += `@${phoneNumber} `;
        }

        await sleep(1000);
        await sock.sendMessage(sender, {
            text: tagText,
            mentions: memberJids
        }, { quoted: m });

    } catch (error) {
        console.error("Error executing tagall:", error);
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ Failed to tag group members." });
    }
}

module.exports = handleTagAll;