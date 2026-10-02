module.exports = async function handleFlog({ sock, m, sender, senderNumber, senderJid, sleep, getContextInfo }) {
    // 🎯 Default hardcoded target person
   // let targetNumber = '2348124451937';

    /* 
    // 💡 MENTION REQUIREMENT (Uncomment below if you want to use mentions instead)
    const contextInfo = getContextInfo ? getContextInfo() : null;
    const mentionedJids = contextInfo?.mentionedJid || [];
    if (mentionedJids.length > 0) {
        targetNumber = mentionedJids[0].split('@')[0];
    } else {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "Hmmm 😂" });
        return;
    }
    */

    const targetJid = `${targetNumber}@s.whatsapp.net`;

    await sleep(2000);
    await sock.sendMessage(sender, {
        text: `*Welcome to the chat @${targetNumber}.*`,
        mentions: [senderJid, targetJid]
    });
};