function getActivityAction({ text, contextInfo, botJid, botLid, getSenderNumber }) {
    const normalizedText = text.trim().toLowerCase();
    if (normalizedText.startsWith('.')) return normalizedText.split(/\s+/, 1)[0].slice(0, 48);
    if (normalizedText === 't') return 'truth';
    if (normalizedText === 'd') return 'dare';
    if (normalizedText === 'broo') return 'antiviewonce';
    if (normalizedText === 'i want it') return 'taker';
    if (normalizedText.startsWith('custom..')) return 'flog';
    if (normalizedText.startsWith('play me')) return 'song';
    if (normalizedText.startsWith('$img') || normalizedText.startsWith('gen') || normalizedText.startsWith('hey og')) return 'AI chat';

    const botNumbers = [getSenderNumber(botJid), getSenderNumber(botLid)].filter(Boolean);
    if (contextInfo?.mentionedJid?.some((jid) => botNumbers.includes(getSenderNumber(jid)))) {
        return 'AI mention';
    }

    return null;
}

async function getActivityPhoneNumber({ message, senderJid, senderNumber, getSenderNumber, resolveLid, resolveGroupPhone }) {
    if (message.key?.fromMe) {
        return {
            phoneNumber: /^\d{7,15}$/.test(senderNumber || '') ? senderNumber : 'unknown',
            userLid: ''
        };
    }

    const isGroup = message.key?.remoteJid?.endsWith('@g.us');
    const alternateJid = isGroup ? message.key?.participantAlt : message.key?.remoteJidAlt;
    const candidateJids = [alternateJid, senderJid].filter(Boolean);

    for (const jid of candidateJids) {
        if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@hosted')) {
            const number = getSenderNumber(jid);
            if (/^\d{7,15}$/.test(number)) return { phoneNumber: number, userLid: '' };
        }

        if ((jid.endsWith('@lid') || jid.endsWith('@hosted.lid')) && resolveLid) {
            try {
                const phoneJid = await resolveLid(jid);
                const number = getSenderNumber(phoneJid);
                if (/^\d{7,15}$/.test(number)) return { phoneNumber: number, userLid: jid };
            } catch {
                // Keep trying other JID forms if the local mapping is unavailable.
            }
        }
    }

    if (resolveGroupPhone) {
        try {
            const phoneJid = await resolveGroupPhone(candidateJids);
            const number = getSenderNumber(phoneJid);
            if (/^\d{7,15}$/.test(number)) {
                return {
                    phoneNumber: number,
                    userLid: candidateJids.find((jid) => jid.endsWith('@lid') || jid.endsWith('@hosted.lid')) || ''
                };
            }
        } catch {
            // Group metadata may be unavailable; preserve the unknown fallback.
        }
    }

    return {
        phoneNumber: 'unknown',
        userLid: candidateJids.find((jid) => jid.endsWith('@lid') || jid.endsWith('@hosted.lid')) || ''
    };
}

async function recordBotActivity(redis, { userNumber, chatJid, action }) {
    const isGroup = chatJid?.endsWith('@g.us');
    const event = {
        at: new Date().toISOString(),
        user: userNumber || 'unknown',
        chatType: isGroup ? 'group' : 'private',
        chat: isGroup ? chatJid : '',
        action
    };

    await redis.lpush('bot_activity', JSON.stringify(event));
    await redis.ltrim('bot_activity', 0, 499);
}

module.exports = { getActivityAction, getActivityPhoneNumber, recordBotActivity };