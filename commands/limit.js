const { getTargetUser } = require('../utils/targetHelper');
const { setUserLimit } = require('../utils/userControl');

const { matchesOwnerNumber } = require('../utils/ownerAccess');

async function handleLimit({ sock, m, text, sender, senderNumber, OWNER_NUMBER, botPhoneNumber, sleep, getContextInfo }) {
    if (!matchesOwnerNumber(senderNumber, OWNER_NUMBER, botPhoneNumber)) {
        await sleep(500);
        await sock.sendMessage(sender, { text: `❌ Access Denied!` });
        return;
    }
    const target = getTargetUser(m, text, getContextInfo);
    const args = text.split(' ');
    const contextInfo = getContextInfo ? getContextInfo() : null;
    
    let maxUses = null;
    if (contextInfo?.mentionedJid?.length > 0) {
        maxUses = args[2]; // e.g. .limit @tag 5
    } else {
        maxUses = args[1]; // e.g. .limit 5 (when replying)
    }

    if (!target || !maxUses || isNaN(maxUses)) {
        await sleep(500);
        await sock.sendMessage(sender, { 
            text: `❌ Usage:\n• Reply to their message: \`.limit 5\`\n• Or tag them: \`.limit @tag 5\`` 
        }, { quoted: m });
        return;
    }

    setUserLimit(target.number, maxUses);
    await sleep(500);
    await sock.sendMessage(sender, { 
        text: `📊 User *@${target.number}* has been capped to a maximum of *${maxUses}* total uses.`, 
        mentions: [target.jid] 
    }, { quoted: m });
}

module.exports = handleLimit;