const { matchesOwnerNumber } = require('../utils/ownerAccess');

let savageModeEnabled = false;

async function handleSavage({ sock, m, sender, text, senderNumber, OWNER_NUMBER, botPhoneNumber }) {
    if (!matchesOwnerNumber(senderNumber, OWNER_NUMBER, botPhoneNumber)) {
        await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳.' }, { quoted: m });
        return;
    }

    const match = text.trim().match(/^\.savage\s+(on|off)$/i);
    if (!match) {
        await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳.' }, { quoted: m });
        return;
    }

    savageModeEnabled = match[1].toLowerCase() === 'on';
    await sock.sendMessage(sender, {
        text: `Savage mode ${savageModeEnabled ? 'enabled' : 'disabled'}.`
    }, { quoted: m });
}

function isSavageModeEnabled() {
    return savageModeEnabled;
}

module.exports = { handleSavage, isSavageModeEnabled };