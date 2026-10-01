const { muteUser, unmuteUser } = require('../utils/mutedStorage');

async function handleMute({ sock, m, sender, text, sleep, senderJid }) {
    if (!sender.endsWith('@g.us')) {
        await sock.sendMessage(sender, { text: "❌ This command can only be used inside group chats!" }, { quoted: m });
        return;
    }

    // Extract target user from mention or quoted message
    let targetJid = null;
    if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
        targetJid = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (m.message?.extendedTextMessage?.contextInfo?.participant) {
        targetJid = m.message.extendedTextMessage.contextInfo.participant;
    }

    if (!targetJid) {
        await sleep(1000);
        await sock.sendMessage(sender, { 
            text: "❌ Please mention the user or reply to their message to mute them!\n\nExample:\n.mute @user" 
        }, { quoted: m });
        return;
    }

    muteUser(sender, targetJid);
    await sleep(1000);
    await sock.sendMessage(sender, { 
        text: `🔇 Successfully muted @${targetJid.split('@')[0]}! Their messages will now be deleted instantly.`,
        mentions: [targetJid]
    }, { quoted: m });
}

async function handleUnmute({ sock, m, sender, text, sleep, senderJid }) {
    if (!sender.endsWith('@g.us')) {
        await sock.sendMessage(sender, { text: "❌ This command can only be used inside group chats!" }, { quoted: m });
        return;
    }

    let targetJid = null;
    if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
        targetJid = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (m.message?.extendedTextMessage?.contextInfo?.participant) {
        targetJid = m.message.extendedTextMessage.contextInfo.participant;
    }

    if (!targetJid) {
        await sleep(1000);
        await sock.sendMessage(sender, { 
            text: "❌ Please tag or reply to the user you want to unmute!" 
        }, { quoted: m });
        return;
    }

    unmuteUser(sender, targetJid);
    await sleep(1000);
    await sock.sendMessage(sender, { 
        text: `🔊 Unmuted @${targetJid.split('@')[0]}! They can talk again.`,
        mentions: [targetJid]
    }, { quoted: m });
}

module.exports = { handleMute, handleUnmute };