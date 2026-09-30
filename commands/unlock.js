// commands/unlock.js

async function handleUnlock(sock, m, text, sender, sleep) {
    if (!sender.endsWith('@g.us')) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ This command can only be used inside a WhatsApp group!" });
        return;
    }

    try {
        await sleep(1000);
        await sock.groupSettingUpdate(sender, 'not_announcement');
        await sock.sendMessage(sender, { text: "🔓 Group unlocked! Everyone can send messages now." }, { quoted: m });
    } catch (error) {
        console.error("Unlock error:", error);
        await sock.sendMessage(sender, { text: "❌ Make sure I'm an admin with the right permissions first!" }, { quoted: m });
    }
}

module.exports = handleUnlock;