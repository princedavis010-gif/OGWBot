// utils/antilink.js
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async function checkAntiLink({ sock, m, sender, text, senderNumber, senderJid }) {
   /* // Only apply anti-link in group chats
    if (!sender.endsWith('@g.us')) return false;

    // Regex to catch standard URLs, WhatsApp invite links, and common domains
    const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(chat\.whatsapp\.com\/[^\s]+)|([a-zA-Z0-9][-a-zA-Z0-9]*\.(com|org|net|edu|gov|io|me|co|xyz|ng)[^\s]*)/i;

    if (linkRegex.test(text)) {
        try {
            // Delete the message (Bot must be admin in the group for this to work)
            await sock.sendMessage(sender, { delete: m.key });

            // Warn the user
            await sleep(1000);
            await sock.sendMessage(sender, {
                text: `⚠️ Hey @${senderNumber}, links are not allowed in this group! Message removed. 🚫`,
                mentions: [senderJid]
            });
            return true; // Link found and handled
        } catch (err) {
            console.error("Anti-link execution error (Ensure bot is admin):", err);
        }
    } */
    return false;
};