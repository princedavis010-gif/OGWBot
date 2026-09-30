const { getTargetUser } = require('../utils/targetHelper');
const { blockUser } = require('../utils/userControl');

async function handleBlock({ sock, m, text, sender, senderNumber, OWNER_NUMBER, sleep, getContextInfo }) {
    if (senderNumber !== OWNER_NUMBER) {
        await sleep(500);
        await sock.sendMessage(sender, { text: `❌ Access Denied!` });
        return;
    }
    const target = getTargetUser(m, text, getContextInfo);
    if (!target) {
        await sleep(500);
        await sock.sendMessage(sender, { text: `❌ Please reply to the user's message with \`.block\` or type \`.block @tag\`` }, { quoted: m });
        return;
    }
    blockUser(target.number);
    await sleep(500);
    await sock.sendMessage(sender, { 
        text: `🚫 Successfully blacklisted *@${target.number}* from using the bot.`, 
        mentions: [target.jid] 
    }, { quoted: m });
}

module.exports = handleBlock;