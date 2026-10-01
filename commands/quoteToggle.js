const { matchesOwnerNumber } = require('../utils/ownerAccess');

let quoteReplyAiEnabled = true; // Enabled by default

async function handleQuoteToggle({ sock, m, sender, text, senderNumber, OWNER_NUMBER, botPhoneNumber, sleep }) {
    const cleanText = text.toLowerCase().trim();

    if (cleanText === '.life') {
        if (!matchesOwnerNumber(senderNumber, OWNER_NUMBER, botPhoneNumber)) {
            await sock.sendMessage(sender, { text: `❌ Access Denied! You're not the owner.` });
            return true;
        }
        quoteReplyAiEnabled = true;
        await sleep(2000);
        await sock.sendMessage(sender, { text: "*POWER ON* 😎" });
        return true;
    }

    if (cleanText === '.death') {
        if (!matchesOwnerNumber(senderNumber, OWNER_NUMBER, botPhoneNumber)) {
            await sock.sendMessage(sender, { text: `❌ Access Denied! You're not the owner.` });
            return;
        }
        quoteReplyAiEnabled = false;
        await sleep(2000);
        await sock.sendMessage(sender, { text: "*SHUTDOWN* 😴." });
        return true;
    }

    return false;
}

function isQuoteAiEnabled() {
    return quoteReplyAiEnabled;
}

module.exports = { handleQuoteToggle, isQuoteAiEnabled };