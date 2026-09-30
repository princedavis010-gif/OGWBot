// commands/poll.js

async function handlePollCommand({ sock, m, text, sender, sleep }) {
    const query = text.slice(5).trim();
    if (!query) {
        await sleep(1000);
        await sock.sendMessage(sender, { 
            text: "❌ Usage format:\n.poll Question?, Option 1, Option 2, Option 3\n\nExample:\n.poll Best mobile game?, eFootball, Free Fire, Roblox" 
        }, { quoted: m });
        return;
    }

    // Split the query by commas
    const parts = query.split(',').map(p => p.trim()).filter(Boolean);

    if (parts.length < 3) {
        await sleep(1000);
        await sock.sendMessage(sender, { 
            text: "❌ Please provide a question and at least **2 options** separated by commas!\n\nExample:\n.poll Favorite game?, eFootball, Free Fire" 
        }, { quoted: m });
        return;
    }

    const pollQuestion = parts[0];
    const pollOptions = parts.slice(1);

    // WhatsApp polls allow a maximum of 12 options
    if (pollOptions.length > 12) {
        await sleep(1000);
        await sock.sendMessage(sender, { text: "❌ You can only add up to 12 options in a single poll!" }, { quoted: m });
        return;
    }

    try {
        await sleep(1000);
        await sock.sendMessage(sender, {
            poll: {
                name: pollQuestion,
                values: pollOptions,
                selectableCount: 1 // Set to 1 for single-choice voting
            }
        }, { quoted: m });
    } catch (error) {
        console.error("Poll error:", error);
        await sock.sendMessage(sender, { text: "❌ Failed to create the poll." }, { quoted: m });
    }
}

module.exports = handlePollCommand;