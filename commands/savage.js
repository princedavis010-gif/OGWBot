const { matchesOwnerNumber } = require('../utils/ownerAccess');

let savageModeEnabled = false;

async function handleSavage({ sock, m, sender, text, senderNumber, OWNER_NUMBER, botPhoneNumber }) {
    if (!matchesOwnerNumber(senderNumber, OWNER_NUMBER, botPhoneNumber)) {
        await sock.sendMessage(sender, { text: 'Only the owner or bot number can use .savage.' }, { quoted: m });
        return;
    }

    const match = text.trim().match(/^\.savage\s+(on|off)$/i);
    if (!match) {
        await sock.sendMessage(sender, { text: 'Usage: .savage on or .savage off' }, { quoted: m });
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