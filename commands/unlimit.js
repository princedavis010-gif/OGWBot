const { getTargetUser } = require('../utils/targetHelper');
const { removeUserLimit } = require('../utils/userControl');

async function handleUnlimit({ sock, m, text, sender, senderNumber, OWNER_NUMBER, sleep, getContextInfo }) {
    if (senderNumber !== OWNER_NUMBER) {
        await sleep(500);
        await sock.sendMessage(sender, { text: `❌ Access Denied!` });
        return;
    }

    const target = getTargetUser(m, text, getContextInfo);
    if (!target) {
        await sleep(500);
        await sock.sendMessage(sender, { 
            text: `❌ Please reply to the user's message with \`.unlimit\` or type \`.unlimit @tag\`` 
        }, { quoted: m });
        return;
    }
    
    removeUserLimit(target.number);
    
    await sleep(500);
    await sock.sendMessage(sender, { 
        text: `✅ Successfully removed the usage limit for *@${target.number}*. They now have unlimited access again!`, 
        mentions: [target.jid] 
    }, { quoted: m });
}

module.exports = handleUnlimit;