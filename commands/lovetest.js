function getMentionLabels(text, mentionedJids) {
    const labels = [...String(text || '').matchAll(/@\d+/g)].map(([label]) => label);
    return mentionedJids.map((jid, index) =>
        labels[index] || `@${jid.split('@')[0].split(':')[0]}`
    );
}

async function handleLoveTest({ sock, m, sender, text, contextInfo }) {
    if (!sender.endsWith('@g.us')) {
        await sock.sendMessage(sender, {
            text: '❌ Use .lovetest in a group and mention two people.'
        }, { quoted: m });
        return;
    }

    const mentionedJids = [...new Set(contextInfo?.mentionedJid || [])];
    if (mentionedJids.length !== 2) {
        await sock.sendMessage(sender, {
            text: '❌ Usage: .lovetest @person1 @person2'
        }, { quoted: m });
        return;
    }

    const [firstName, secondName] = getMentionLabels(text, mentionedJids);
    const percentage = Math.floor(Math.random() * 51) + 50;
    const filledHearts = Math.round(percentage / 20);
    const hearts = `${'❤️'.repeat(filledHearts)}${'🤍'.repeat(5 - filledHearts)}`;
    const statusMessage = percentage > 80
        ? 'Break open the wedding candy! 🎉'
        : percentage >= 65
            ? 'They are a match made in heaven! 💑'
            : 'Love can grow with a little care 💌';

    await sock.sendMessage(sender, {
        text: `💕 *${firstName} 💘 ${secondName}*\n\n${hearts} *${percentage}%*\n${statusMessage}`,
        mentions: mentionedJids
    }, { quoted: m });
}

module.exports = handleLoveTest;
module.exports.getMentionLabels = getMentionLabels;
