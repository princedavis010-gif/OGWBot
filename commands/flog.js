module.exports = async function handleFlog({ sock, m, sender, senderNumber, senderJid, sleep, getContextInfo }) {
    if (!sender.endsWith('@g.us')) {
        await sock.sendMessage(sender, { text: '❌ Use .welcome inside a group.' }, { quoted: m });
        return;
    }

    const contextInfo = getContextInfo ? getContextInfo() : null;
    const targetJid = contextInfo?.mentionedJid?.[0] ||
        (contextInfo?.quotedMessage ? contextInfo.participant : null);

    if (!targetJid) {
        await sock.sendMessage(sender, {
            text: '❌ Mention someone or reply to their message with .welcome.'
        }, { quoted: m });
        return;
    }

    const targetNumber = targetJid.split('@')[0].split(':')[0];

    await sleep(2000);
    await sock.sendMessage(sender, {
        text: `*Welcome to the chat @${targetNumber}.*`,
        mentions: [targetJid]
    }, { quoted: m });
};