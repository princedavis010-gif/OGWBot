module.exports = async function handleStatus({
    sock,
    m,
    sender,
    senderNumber,
    botPhoneNumber,
    ownerNumber,
    connection
}) {
    if (!botPhoneNumber || senderNumber !== botPhoneNumber) {
        await sock.sendMessage(sender, {
            text: '🔒 Only the connected bot number can use .status.'
        }, { quoted: m });
        return false;
    }

    const statusChat = sender?.endsWith('@g.us')
        ? `${botPhoneNumber}@s.whatsapp.net`
        : sender;
    const statusText = [
        '🤖 Bot Status',
        `Bot number: ${botPhoneNumber}`,
        `Owner number: ${ownerNumber || 'not configured'}`,
        `WhatsApp: ${connection?.status || 'unknown'}`,
        `Connection method: ${connection?.method || 'unknown'}`,
        `Uptime: ${Math.floor(process.uptime() / 60)} minutes`
    ].join('\n');

    await sock.sendMessage(statusChat, { text: statusText }, {
        quoted: statusChat === sender ? m : undefined
    });
    return true;
};