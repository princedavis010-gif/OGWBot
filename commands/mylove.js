module.exports = async function handleMyLove({ sock, m, sender, senderNumber, senderJid, sleep, getContextInfo }) {
    const contextInfo = getContextInfo ? getContextInfo() : null;
    const mentionedJids = contextInfo?.mentionedJid || [];

    if (mentionedJids.length === 0) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "Do you mean Kalisha? 💖😘" });
        return;
    }

    const targetJid = mentionedJids[0];
    const targetNumber = targetJid.split('@')[0];

    await sleep(1000);
    await sock.sendMessage(sender, {
        text: `@${senderNumber} loves @${targetNumber} 💖🩷`,
        mentions: [senderJid, targetJid]
    });
};