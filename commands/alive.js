module.exports = async function handleAlive({ sock, m, sender, senderNumber, senderJid, sleep }) {
    await sleep(1000);

    // Calculate bot uptime
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    const uptimeString = `${hours}h ${minutes}m ${seconds}s`;

    const aliveText = `*OG is Active & Running!* ⚡\n\n` +
                      `• *Status:* Online & Stable 💯\n` +
                      `• *Admin:* Prince Davis 😎\n` +
                      `• *Vibe:* 100% Active 💯\n\n` +
                      `What's on your mind? Tag me if you wanna chat! 😁`;

    await sock.sendMessage(sender, {
        text: aliveText,
        mentions: [senderJid]
    }, { quoted: m });
};