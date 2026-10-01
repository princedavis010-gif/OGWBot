async function handleAdd({ sock, m, sender, text, sleep }) {
    if (!sender.endsWith('@g.us')) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ This command can only be used inside a WhatsApp group!" }, { quoted: m });
        return;
    }

    // Get everything after .add
    const rawArgs = text.split(' ').slice(1).join(' ').trim();
    if (!rawArgs) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ Please provide phone number(s)! Example: `.add 234123456789`" }, { quoted: m });
        return;
    }

    // Split by commas, spaces, or newlines to grab multiple numbers
    const parts = rawArgs.split(/[\s,]+/);
    const targetJids = [];

    for (const part of parts) {
        const cleanNum = part.replace(/[^0-9]/g, '');
        if (cleanNum && cleanNum.length >= 7) {
            const jid = `${cleanNum}@s.whatsapp.net`;
            if (!targetJids.includes(jid)) {
                targetJids.push(jid);
            }
        }
    }

    if (targetJids.length === 0) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ No valid phone numbers found! Make sure to include country codes." }, { quoted: m });
        return;
    }

    await sleep(1500);

    try {
        const results = await sock.groupParticipantsUpdate(sender, targetJids, 'add');
        
        let successCount = 0;
        for (const res of results) {
            if (res.status === 200 || res.status === '200') {
                successCount++;
            }
        }

        // ✅ Fixed: reportText is now properly defined so it won't crash
     /*   const reportText = `✨ Finished! Successfully added *${successCount}* out of *${targetJids.length}* user(s).`;

        await sleep(500);
        await sock.sendMessage(sender, { 
            text: reportText, 
            mentions: targetJids 
        }, { quoted: m }); */

    } catch (error) {
        console.error("Add members error:", error);
        await sock.sendMessage(sender, { text: "❌ Failed to add users. Make sure I am an admin with the right permissions!" }, { quoted: m });
    }
}

module.exports = handleAdd;