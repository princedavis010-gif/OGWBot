function getTargetUser(m, text, getContextInfo) {
    const contextInfo = getContextInfo();

    // 1. Check if you REPLIED to someone's message
    if (contextInfo && (contextInfo.participant || contextInfo.remoteJid)) {
        const jid = contextInfo.participant || contextInfo.remoteJid;
        const number = jid.split('@')[0].split(':')[0];
        return { jid, number };
    }

    // 2. Check if you TAGGED/MENTIONED someone in the command (e.g. .block @user)
    if (contextInfo && contextInfo.mentionedJid && contextInfo.mentionedJid.length > 0) {
        const jid = contextInfo.mentionedJid[0];
        const number = jid.split('@')[0].split(':')[0];
        return { jid, number };
    }

    // 3. Fallback: Check if a raw number was typed (e.g. .block 23480...)
    const args = text.split(' ');
    if (args.length > 1) {
        const rawArg = args[1].replace(/[^0-9]/g, '');
        if (rawArg.length > 5) {
            return { jid: `${rawArg}@s.whatsapp.net`, number: rawArg };
        }
    }

    return null;
}

module.exports = { getTargetUser };