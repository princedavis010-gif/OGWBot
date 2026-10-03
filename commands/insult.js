const insults = [
    'Your brain has a screensaver, and it is buffering.',
    'You bring loading-screen energy to every conversation.',
    'Your comebacks arrive by standard shipping.',
    'Your plans have more holes than a tea strainer.',
    'You have the timing of a software update during a presentation.',
    'You could get lost in a straight hallway.',
    'Your train of thought just took an unscheduled stop.',
    'You make a group project feel like a solo project.',
    'Your ideas are still waiting for the terms and conditions to load.',
    'You have the urgency of a Monday morning alarm snooze.',
    'If common sense were a subscription, yours expired quietly.',
    'You are the reason instructions come with pictures.',
    'Your confidence is doing all the work today.',
    'You have a remarkable talent for making simple things mysterious.',
    'Your attention span just left the chat.',
    'You could turn a shortcut into a scenic route.',
    'Your logic took the day off without telling anyone.',
    'You bring a plot twist to basic arithmetic.',
    'Your best idea is still stuck in drafts.',
    'You have the focus of a browser with forty-seven tabs open.',
    'You are proof that a pause button would be useful in real life.',
    'Your brain is running on battery saver mode.',
    'You could make a one-step task into a trilogy.',
    'Your timing is so adventurous it ignores the schedule.',
    'You have the energy of an email marked “just circling back.”',
    'Your decision-making process deserves its own documentary.',
    'You bring suspense to questions with obvious answers.',
    'Your excuses have better attendance than your plans.',
    'You are a walking reminder to save your work often.',
    'Your thoughts are taking turns, but nobody knows whose turn it is.',
    'You could overthink a yes-or-no question.',
    'Your inner monologue needs a project manager.',
    'You have the confidence of autocorrect changing a correct word.',
    'Your productivity is currently on a coffee break.',
    'You make “almost ready” sound like a long-term strategy.',
    'Your common sense is on a very flexible schedule.',
    'You could make a checklist forget what it was checking.',
    'Your focus has the commitment level of a free trial.',
    'You bring “I meant to do that” energy to every mistake.',
    'Your brain opened a new tab and forgot why.',
    'You turn confidence into a renewable resource.',
    'Your plans are so ambitious even your calendar is skeptical.',
    'You could make a simple explanation need a sequel.',
    'Your sense of direction is mostly a suggestion.',
    'You make background noise seem well organized.',
    'You bring everyone so much joy when you leave the room!',
    'I would agree with you, but then we would both be wrong.',
    'You are not stupid; you just have bad luck thinking.',
    'Your secrets are always safe with me. I never even listen to them.',
    'You are proof that even evolution takes a break sometimes.',
    'You have something on your chin... no, the third one down.',
    'You are like a software update. Whenever I see you, I think, "Do I really need this right now?"',
    'You bring everyone happiness... you know, when you leave.',
    'You are like a penny—two-faced and not worth much.',
    'You have something on your mind... oh wait, never mind.',
    'You are the reason they put directions on shampoo bottles.',
    'You are like a cloud. Always floating around with no real purpose.',
    'Your jokes are like expired milk—sour and hard to digest.',
    'You are like a candle in the wind... useless when things get tough.',
    'You have something unique—your ability to annoy everyone equally.',
    'You are like a Wi-Fi signal—always weak when needed most.',
    'You are proof that not everyone needs a filter to be unappealing.',
    'Your energy is like a black hole—it just sucks the life out of the room.',
    'You have the perfect face for radio.',
    'You are like a traffic jam—nobody wants you, but here you are.',
    'You are like a broken pencil—pointless.',
    'Your ideas are so original, I am sure I have heard them all before.',
    'You are living proof that even mistakes can be productive.',
    'You are not lazy; you are just highly motivated to do nothing.',
    'Your brain is running Windows 95—slow and outdated.',
    'You are like a speed bump—nobody likes you, but everyone has to deal with you.',
    'You are like a cloud of mosquitoes—just irritating.',
    'You bring people together... to talk about how annoying you are.'
];

let remainingInsults = [...insults];

async function handleInsult({ sock, m, sender, sleep, getContextInfo }) {
    if (!sender.endsWith('@g.us')) {
        await sock.sendMessage(sender, { text: '❌ Use .insult inside a group.' }, { quoted: m });
        return;
    }

    const contextInfo = getContextInfo ? getContextInfo() : null;
    const targetJid = contextInfo?.mentionedJid?.[0] ||
        (contextInfo?.quotedMessage ? contextInfo.participant : null);

    if (!targetJid) {
        await sock.sendMessage(sender, {
            text: '❌ Mention someone or reply to their message with .insult.'
        }, { quoted: m });
        return;
    }

    if (remainingInsults.length === 0) {
        await sock.sendMessage(sender, {
            text: 'I have used every insult in this session. Add more to commands/insult.js or restart the bot to reset the list.'
        }, { quoted: m });
        return;
    }

    const insultIndex = Math.floor(Math.random() * remainingInsults.length);
    const [insult] = remainingInsults.splice(insultIndex, 1);
    const targetNumber = targetJid.split('@')[0].split(':')[0];

    await sleep(500);
    await sock.sendMessage(sender, {
        text: `@${targetNumber}, ${insult}`,
        mentions: [targetJid]
    }, { quoted: m });
}

module.exports = handleInsult;
module.exports.insults = insults;