const { disableWelcome } = require('../utils/welcomeControl');
const { matchesOwnerNumber } = require('../utils/ownerAccess');

async function handleWelcomeOff({ sock, m, sender, senderNumber, OWNER_NUMBER, botPhoneNumber, sleep }) {
    if (!matchesOwnerNumber(senderNumber, OWNER_NUMBER, botPhoneNumber)) {
        await sleep(500);
        await sock.sendMessage(sender, { text: `❌ Access Denied!` });
        return;
    }

    if (!sender.endsWith('@g.us')) {
        await sleep(500);
        await sock.sendMessage(sender, { text: `❌ This command can only be used inside a WhatsApp group!` });
        return;
    }

    disableWelcome(sender);
    await sleep(500);
    await sock.sendMessage(sender, { text: `❌ *Welcome messages disabled* for this group.` }, { quoted: m });
}

module.exports = handleWelcomeOff;