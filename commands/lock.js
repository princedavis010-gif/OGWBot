// commands/lock.js

async function handleLock(sock, m, text, sender, sleep) {
    if (!sender.endsWith('@g.us')) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ This command can only be used inside a WhatsApp group!" });
        return;
    }

    try {
        await sleep(1000);
        await sock.groupSettingUpdate(sender, 'announcement');
        await sock.sendMessage(sender, { text: "🔒 Group locked! Only admins can send messages now." }, { quoted: m });
    } catch (error) {
        console.error("Lock error:", error);
        await sock.sendMessage(sender, { text: "❌ Make sure I'm an admin with the right permissions first!" }, { quoted: m });
    }
}

module.exports = handleLock;