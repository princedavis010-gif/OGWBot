async function handleFlirt({ sock, m, sender, senderNumber, senderJid, sleep, logBotAction }) {
    const flirts = [
        "Are you a Wi-Fi signal? Because I'm feeling a strong connection right now. 😉",
        "Omo, are you from heaven? Because your face looks like an answered prayer! ✨",
        "Are you magnetic? Because you're definitely pulling me closer. 🧲",
        "Do you have a map? I keep getting lost in your eyes. 🗺️",
        "Are you a software bug? Because I've been thinking about you all day and can't get you out of my head. 💻",
        "Forget the alphabet, I'd rearrange U and I together anytime. 😘",
        "If beauty was a crime, you would be serving a life sentence without parole. 🚨",
        "Are you NEPA light? Because whenever you enter the room, everything just lights up! ⚡",
        "Is your name Google? Because you have everything I've been searching for. 🔍",
        "Are you a bank loan? Because you've got my interest skyrocketing! 📈",
        "Are you data subscription? Because you're expiring too fast and I always want more of you. 📶",
        "Girl, are you a parking ticket? Because you've got 'fine' written all over you. 😎",
        "If being cute was a crime, you'd be public enemy number one. 👑",
        "Can I borrow a kiss? I promise I'll pay it back with interest. 💋",
        "Are you suya? Because you are looking spicy and fine tonight! 🔥",
        "Do you believe in love at first sight, or should I walk past your chat again? 😏",
        "Are you Wi-Fi? Because I'm feeling a really good connection 📶",
        "I searched on Google, and you're the best match I found 🌐",
        "The screenshot of your smile is the best photo in my gallery 📸",
        "When I looked into your eyes, time stood still. ⏱️",
        "You are like Google — I have found everything in you.",
        "The list of your praises is so long that even the WhatsApp character limit gave up 💯"
    ];

    const randomFlirt = flirts[Math.floor(Math.random() * flirts.length)];
    let responseText = `💖  💖\n\n${randomFlirt}`;

    if (sender.endsWith('@g.us')) {
        responseText += `\n\n> @${senderNumber}`;
    }

    try {
        await sock.sendPresenceUpdate('composing', sender);
        await sleep(1000);
        await sock.sendMessage(sender, { 
            text: responseText, 
            mentions: [senderJid] 
        }, { quoted: m });

        if (typeof logBotAction === 'function') {
            logBotAction(sender, `I sent a flirt message: "${randomFlirt}"`);
        }
    } catch (e) {
        console.error('Error in flirt command:', e);
        await sleep(1000);
        await sock.sendMessage(sender, { text: '❌ Failed to get flirt message. Please try again later!' }, { quoted: m });
    }
}

module.exports = { handleFlirt };