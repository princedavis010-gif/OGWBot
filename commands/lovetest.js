const NAME_SEPARATOR = /\s*(?:,|&)\s*|\s+(?:vs\.?|and)\s+/i;
const MAX_NAME_LENGTH = 40;

function parseNames(input) {
    const names = String(input || '')
        .trim()
        .split(NAME_SEPARATOR)
        .map((name) => name.replace(/[\r\n\t]+/g, ' ').trim())
        .filter(Boolean);

    if (names.length !== 2 || names.some((name) => name.length > MAX_NAME_LENGTH)) {
        return null;
    }

    return names;
}

async function handleLoveTest({ sock, m, sender, text }) {
    const input = String(text || '').trim().replace(/^\.\S+\s*/, '');
    const names = parseNames(input);

    if (!names) {
        await sock.sendMessage(sender, {
            text: '❌ Give me exactly two names (up to 40 characters each). Example: .lovetest Ali, Sana'
        }, { quoted: m });
        return;
    }

    const [firstName, secondName] = names;
    const percentage = Math.floor(Math.random() * 51) + 50;
    const filledHearts = Math.round(percentage / 20);
    const hearts = `${'❤️'.repeat(filledHearts)}${'🤍'.repeat(5 - filledHearts)}`;
    const statusMessage = percentage > 80
        ? 'Shaadi ka laddu tod lo! 🎉'
        : percentage >= 65
            ? 'Achi jori hy, mashallah 😄'
            : 'Love can grow with a little care 💌';

    await sock.sendMessage(sender, {
        text: `💕 *${firstName} 💘 ${secondName}*\n\n${hearts} *${percentage}%*\n${statusMessage}`
    }, { quoted: m });
}

module.exports = handleLoveTest;
module.exports.parseNames = parseNames;
