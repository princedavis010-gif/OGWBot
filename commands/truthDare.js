async function handleTruth({ sock, m, sender, senderNumber, senderJid, sleep, logBotAction }) {
    const truths = [
        "What is the most embarrassing thing you've ever done in public?",
        "If you were given 1 million naira right now, what is the very first thing you'll buy?",
        "Who was your very first crush in school?",
        "What's a secret you've kept from your family till today?",
        "Have you ever lied about your age? If yes, why?",
        "What is the weirdest food combination you secretly enjoy?",
        "What is something you did that you hope your parents never find out about?",
	  "Who in this group did you have the weirdest first impression of?",
"What is the most embarrassing thing you've ever accidentally said in a group chat?",
"Which person in this group would you trust with your biggest secret?",
"What's the weirdest thing you've ever searched on the internet?",
"Have you ever pretended to understand something when you actually had absolutely no idea what was happening?",
"What is the most ridiculous excuse you've ever used to avoid doing something?",
"Who in this group would survive the longest in a zombie apocalypse, and who would be gone first?",
"What is the strangest nickname you've ever had?",
"What's one thing you do when you're alone that you would never do in public?",
"Have you ever sent a message to the wrong person and immediately regretted it?",
"Which person in this group would you swap lives with for one day?",
"What is the most childish thing you still do?",
"What's the most embarrassing photo currently sitting in your gallery?",
"Have you ever laughed at a completely inappropriate moment?",
"What is one ridiculous fear you have?",
"What's the weirdest food combination you genuinely enjoy?",
"Which member of this group would you absolutely NOT want as your roommate?",
"What is the longest you've pretended to be busy just because you didn't want to talk?",
"Have you ever practiced a conversation before actually having it?",
"What is the most embarrassing thing you've done because you thought nobody was watching?",
"Who in this group do you think would become famous first, and why?",
"What's one thing you've lied about because the truth was too embarrassing?",
"What is the weirdest thing you've ever done out of boredom?",
"Have you ever opened a message, panicked, and deliberately waited before replying?",
"Which person in this group would you choose to be your teammate in a completely ridiculous competition?",
"What is your most useless talent?",
"What's the funniest thing you've ever believed when you were younger?",
"Have you ever accidentally liked, reacted to, or sent something you absolutely didn't mean to?",
"What is the most embarrassing autocorrect or typo you've ever sent?",
"If your personality had a warning label, what would it say?",
"What is one thing everyone seems to like that you secretly don't understand the hype about?",
"Who in this group would be the funniest person to get stuck in an elevator with?",
"What is the weirdest excuse you've ever heard someone give?",
"Have you ever pretended to be asleep to avoid a conversation?",
"What is the most random thing that can instantly make you laugh?",
"If this group had a reality show, what would your role be?",
"What is one completely harmless secret about yourself that nobody here probably knows?",
"Which member of this group do you think would accidentally become an internet meme?",
"What is the most chaotic thing you've ever done simply because you were bored?"
    ];

    const randomTruth = truths[Math.floor(Math.random() * truths.length)];
    let responseText = `🎭 *TRUTH TIME* 🎭\n\n*Question:* ${randomTruth}`;
    
    if (sender.endsWith('@g.us')) {
        responseText += `\n\n> @${senderNumber}`;
    }

    try {
        await sleep(1000);
        await sock.sendMessage(sender, { 
            text: responseText, 
            mentions: [senderJid] 
        }, { quoted: m });

        // 🧠 Feed this action into OG's consciousness stream!
        logBotAction(sender, `I gave @${senderNumber} a Truth question: "${randomTruth}"`);
    } catch (error) {
        console.error("Truth command error:", error);
    }
}

async function handleDare({ sock, m, sender, senderNumber, senderJid, sleep, logBotAction }) {
    const dares = [
        "Send a voice note singing your favorite song right now.",
        "Change your WhatsApp status to 'I am the ultimate rizz master' for the next 1 hour.",
        "Text your best friend 'I have a confession to make' and don't explain why for 15 minutes.",
        "Send a selfie making the funniest face possible.",
        "Type a paragraph praising OG as the greatest AI bot ever created without using the letter 'e'.",
        "Call the 3rd person on your recent chat list and say 'Happy New Year' right now!",
        "Drop a voice note speaking in pure, heavy village accent for 10 seconds.",
	  "Send a 20-second voice note to the group speaking like a dramatic movie villain announcing that you have discovered the group's biggest secret.",
"Change your WhatsApp profile picture to the most ridiculous selfie you can take right now and keep it for 15 minutes.",
"Send a voice note singing the chorus of any song using only an exaggerated opera voice.",
"Type your next 5 messages in the group as if you are an extremely confused grandmother discovering WhatsApp for the first time.",
"Send a completely serious voice note explaining why you believe you are secretly the main character of this group.",
"Change your WhatsApp About to: 'Currently under investigation by the Group Council.' Keep it for 20 minutes.",
"Send a voice note pretending to be a sports commentator describing yourself walking from one room to another.",
"Let the group choose one harmless emoji, then use only that emoji in your next 10 group messages.",
"Send a voice note delivering a dramatic breakup speech to your pillow, chair, shoe, or any random object.",
"Change your profile picture to a photo of an everyday object and let everyone guess what it is.",
"Write a completely ridiculous 3-line autobiography about yourself and send it to the group with absolute seriousness.",
"Send a voice note saying 'I have something important to confess' and then confess that you just ate, slept, blinked, or breathed.",
"Use your next voice note to imitate a radio presenter introducing every member of the group as if they are celebrities.",
"Change your WhatsApp About to the most unnecessarily dramatic sentence you can invent.",
"Send 7 random emojis and challenge the group to create a story explaining what they mean.",
"Send a voice note pretending you are receiving an award and give an emotional acceptance speech thanking completely random things.",
"Change your profile picture to the funniest non-person photo you can find on your phone for 20 minutes.",
"Write your next message with your eyes closed and send exactly what you typed without correcting it.",
"Send a voice note arguing passionately that a completely ordinary object, such as a spoon or bucket, deserves more respect.",
"Describe yourself using only 5 emojis and refuse to explain them for 5 minutes.",
"Send a voice note pretending to be a very angry teacher giving the group a ridiculous homework assignment.",
"Change your WhatsApp About to 'CEO of Making Bad Decisions' for 20 minutes.",
"Send a voice note in which you dramatically announce what you had for your last meal as though it is breaking world news.",
"Create a ridiculous nickname for yourself and make the group call you that nickname for the next 10 minutes.",
"Send a voice note pretending to be an airport announcer giving a boarding announcement for absolutely nothing.",
"Change your profile picture to a completely random object near you and leave it there for 15 minutes.",
"Send a message consisting entirely of dramatic punctuation marks, then immediately follow it with 'Never mind.'",
"Send a voice note trying to make the group laugh without saying the words 'laugh,' 'funny,' or 'joke.'",
"Write a fake breaking-news headline about something that happened in this group today.",
"Change your WhatsApp About to 'Please respect my privacy during this difficult time' and refuse to explain why.",
"Send a voice note pretending to be a motivational speaker giving an inspirational speech about getting out of bed.",
"Use only GIFs or emojis for your next 5 messages in the group.",
"Send a voice note pretending to be a customer-service agent handling the most ridiculous complaint imaginable.",
"Create a completely fake conspiracy theory about something harmless in this group and explain it with maximum seriousness.",
"Change your profile picture to a picture of your shoe, cup, pillow, or another random object for 15 minutes.",
"Send a voice note introducing yourself as if you are a contestant entering the world's strangest talent competition.",
"Write a dramatic 5-line poem about something completely ordinary, like rice, slippers, Wi-Fi, or a mosquito.",
"Send a voice note pretending that you are giving a press conference because of a completely ridiculous scandal involving yourself.",
"Change your WhatsApp About to 'I know what you did 👀' for 15 minutes and give absolutely no explanation.",
"Send your next voice note in the most ridiculously exaggerated accent you can safely imitate, then immediately return to your normal voice."
    ];

    const randomDare = dares[Math.floor(Math.random() * dares.length)];
    let responseText = `🎯 *DARE TIME* 🎯\n\n*Challenge:* ${randomDare}`;
    
    if (sender.endsWith('@g.us')) {
        responseText += `\n\n> @${senderNumber}`;
    }

    try {
        await sleep(1000);
        await sock.sendMessage(sender, { 
            text: responseText, 
            mentions: [senderJid] 
        }, { quoted: m });

        // 🧠 Feed this action into OG's consciousness stream!
        logBotAction(sender, `I gave @${senderNumber} a Dare challenge: "${randomDare}"`);
    } catch (error) {
        console.error("Dare command error:", error);
    }
}

module.exports = { handleTruth, handleDare };