const { getTargetUser } = require('../utils/targetHelper');
const { unblockUser } = require('../utils/userControl');

async function handleUnblock({ sock, m, text, sender, senderNumber, OWNER_NUMBER, sleep, getContextInfo }) {
    if (senderNumber !== OWNER_NUMBER) {
        await sleep(500);
        await sock.sendMessage(sender, { text: `❌ Access Denied!` });
        return;
    }
    const target = getTargetUser(m, text, getContextInfo);
    if (!target) {
        await sleep(500);
        await sock.sendMessage(sender, { text: `❌ Please reply to the user's message with \`.unblock\` or type \`.unblock @tag\`` }, { quoted: m });
        return;
    }
    unblockUser(target.number);
    await sleep(500);
    await sock.sendMessage(sender, { 
        text: `✅ Successfully unblocked *@${target.number}*.`, 
        mentions: [target.jid] 
    }, { quoted: m });
}

module.exports = handleUnblock;