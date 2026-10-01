const { enableWelcome } = require('../utils/welcomeControl');
const { matchesOwnerNumber } = require('../utils/ownerAccess');

async function handleWelcomeOn({ sock, m, sender, senderNumber, OWNER_NUMBER, botPhoneNumber, sleep }) {
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

    enableWelcome(sender);
    await sleep(500);
    await sock.sendMessage(sender, { text: `✅ *Welcome messages enabled* for this group.` }, { quoted: m });
}

module.exports = handleWelcomeOn;