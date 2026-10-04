function normalizeJid(jid) {
    return String(jid || '').replace(/:\d+(?=@)/, '').toLowerCase();
}

async function handleDelete({
    sock,
    m,
    sender,
    senderJid,
    contextInfo,
    botJid,
    botLid,
    botPhoneNumber,
    getSenderNumber,
    isGroupAdmin
}) {
    if (!sender.endsWith('@g.us')) {
        await sock.sendMessage(sender, {
            text: '❌ .delete only works in groups.'
        }, { quoted: m });
        return;
    }

    let senderIsAdmin = false;
    try {
        senderIsAdmin = await isGroupAdmin(sock, sender, [senderJid, m.key.participantAlt].filter(Boolean));
    } catch (error) {
        console.error('Could not verify admin status for .delete:', error);
    }

    if (!senderIsAdmin) {
        await sock.sendMessage(sender, {
            text: '❌ Only group admins can use .delete.'
        }, { quoted: m });
        return;
    }

    const messageId = contextInfo?.stanzaId;
    const participant = contextInfo?.participant;
    if (!messageId || !participant) {
        await sock.sendMessage(sender, {
            text: '❌ Reply to the message you want to delete, then send .delete.'
        }, { quoted: m });
        return;
    }

    const authorJids = [participant, contextInfo.participantAlt].filter(Boolean);
    const botJids = new Set([botJid, botLid].map(normalizeJid).filter(Boolean));
    const botNumbers = [botPhoneNumber, getSenderNumber(botJid), getSenderNumber(botLid)]
        .filter(Boolean);
    const isBotMessage = authorJids.some((jid) =>
        botJids.has(normalizeJid(jid)) || botNumbers.includes(getSenderNumber(jid))
    );

    const quotedKey = {
        remoteJid: sender,
        id: messageId,
        fromMe: isBotMessage,
        participant,
        ...(contextInfo.participantAlt ? { participantAlt: contextInfo.participantAlt } : {})
    };

    try {
        await sock.sendMessage(sender, { delete: quotedKey });
    } catch (error) {
        console.error('Failed to delete replied-to group message:', error);
        await sock.sendMessage(sender, {
            text: '❌ Could not delete that message. Make sure the bot is a group admin and the message can still be revoked.'
        }, { quoted: m });
    }
}

module.exports = handleDelete;
