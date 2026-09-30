const { enableWelcome } = require('../utils/welcomeControl');

async function handleWelcomeOn({ sock, m, sender, senderNumber, OWNER_NUMBER, sleep }) {
    if (senderNumber !== OWNER_NUMBER) {
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