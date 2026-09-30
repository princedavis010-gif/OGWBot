require('dotenv').config();
const handleWelcomeOn = require('./commands/welcomeon');
const handleWelcomeOff = require('./commands/welcomeoff');
const handleBlock = require('./commands/block');
const handleUnblock = require('./commands/unblock');
const handleLimit = require('./commands/limit');
const handleUnlimit = require('./commands/unlimit');
const { getTargetUser } = require('./utils/targetHelper');
const { isBlacklisted, checkAndIncrementUsage, blockUser, unblockUser, setUserLimit, removeUserLimit } = require('./utils/userControl');
const handleMenu = require('./commands/menu');
const botStartTime = Math.floor(Date.now() / 1000);
let isPrivate = true;
const handleTaker = require('./commands/taker');
const handleVV = require('./commands/vv');
const handleSticker = require('./commands/sticker');
const handleTTS = require('./commands/tts');
const handleUnlock = require('./commands/unlock');
const handleLock = require('./commands/lock');
const handleKick = require('./commands/kick');
const handleDemote = require('./commands/demote');
const handlePromote = require('./commands/promote'); // Adjust path if needed
const handleTagAll = require('./commands/tagall'); // Adjust path if it's in a folder
const handleAdd = require('./commands/add');
const handleToImg = require('./commands/toimg');
const handleWelcome = require('./commands/welcome');
const handleRemoveBg = require('./commands/handleRemoveBg');
const handleTrivia = require('./commands/trivia');
const handlePollCommand = require('./commands/poll');
const handleSong = require('./commands/song');
const { handleQuoteToggle, isQuoteAiEnabled } = require('./commands/quoteToggle');
const { isUserMuted } = require('./utils/mutedStorage');
const { handleMute, handleUnmute } = require('./commands/mute');
const { handleFlirt } = require('./commands/flirt');
const { handleTruth, handleDare } = require('./commands/truthDare');
const checkAntiLink = require('./utils/antilink');
const handleAlive = require('./commands/alive');
const handleImagine = require('./commands/imagine');
const handleFlog = require('./commands/flog');
const handleMyLove = require('./commands/mylove');
const chatHistories = new Map(); // Key: JID, Value: Array of message turns
const MAX_HISTORY_LENGTH = 15;   // Keeps the last 15 turns to save memory and tokens
const aiMessageKeys = new Set();
const { getAiClient, getAiResponse, getAiImageResponse } = require('./aiService');
let showTerminalLogs = false; // Enabled by default so you can see incoming messages in your terminal!
let botJid = '';
let botLid = '';
const OWNER_NUMBER = "34798496137284";
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getSenderNumber(jid) {
    return jid ? jid.split('@')[0].split(':')[0] : '';
}

function isPrivateForSender(jid) {
    return isPrivate && getSenderNumber(jid) !== OWNER_NUMBER;
}

// 🧠 Conscious AI Helper Functions
async function getConsciousAiResponse(jid, userMessage) {
    if (!chatHistories.has(jid)) {
        chatHistories.set(jid, []);
    }
    
    const history = chatHistories.get(jid);

    // Push user input into history
    history.push({
        role: 'user',
        parts: [{ text: userMessage }]
    });

    try {
        const response = await getAiClient().models.generateContent({
            model: 'gemini-2.5-flash', // Or your preferred model variant
            contents: history,
            config: {
                systemInstruction: `You are OG, a street-smart, witty, and friendly AI WhatsApp companion created by Prince Davis. You speak with a cool blend of English and Nigerian Pidgin slang. You are fully conscious of what is happening in this chat, including any commands, trivia games, polls, or tools that were just used. Pick up the conversation naturally based on the latest context.`
            }
        });

        const aiReply = response.text;

        // Push model response into history
        history.push({
            role: 'model',
            parts: [{ text: aiReply }]
        });

        // Trim history if it exceeds the limit
        if (history.length > MAX_HISTORY_LENGTH) {
            history.splice(0, history.length - MAX_HISTORY_LENGTH);
        }

        return aiReply;
    } catch (error) {
        console.error("Conscious AI error:", error);
        return "Omo, network dey shake small. Try talk to me again later! 😅";
    }
}

function logBotAction(jid, botMessage) {
    if (!chatHistories.has(jid)) {
        chatHistories.set(jid, []);
    }
    const history = chatHistories.get(jid);
    history.push({
        role: 'model',
        parts: [{ text: `[System/Bot Action Output]: ${botMessage}` }]
    });
}

const activeTrivia = new Map(); // Tracks active trivia sessions per group JID

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('Scan this QR code with your WhatsApp app:\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('🤖 Bot successfully connected to WhatsApp!');
            botJid = sock.user?.id || '';
            botLid = sock.user?.lid || '';
            console.log(`📌 Saved Bot JID: ${botJid} | LID: ${botLid}`);
        }
    });


// Listen for group participant updates (Joins, leaves, etc.)
sock.ev.on('group-participants.update', async (update) => {
    await handleWelcome({ sock, update, sleep });
});

    sock.ev.on('creds.update', saveCreds);

    // Listen for incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const m of messages) {
        if (!m.message) continue;

        // If the message was sent by your account (fromMe):
        if (m.key.fromMe) {
            // If the bot itself generated and sent this message, ignore it to prevent infinite loops.
            if (aiMessageKeys.has(m.key.id)) {
                continue;
            }
            // Otherwise, it means YOU manually typed it on your phone app! Allow it to process.
        }

        // 2. Ignore any message sent before the bot started up
        const messageTimestamp = m.messageTimestamp;
        if (messageTimestamp && messageTimestamp < botStartTime) {
            continue; // Skip old offline messages
        }

        const sender = m.key.remoteJid;
        const senderJid = m.key.participant || sender;
        
        // 🔑 THE FIX: Calculate senderNumber, but force it to OWNER_NUMBER if you typed it from the burner phone
        let senderNumber = getSenderNumber(senderJid);
        if (m.key.fromMe) {
            senderNumber = OWNER_NUMBER;
        }

        if (isPrivateForSender(senderJid)) return;

        // 🚫 1. Check if user is completely blacklisted
        if (isBlacklisted(senderNumber) && senderNumber !== OWNER_NUMBER) {
            return; // Ignore them completely
        }

        // ⏳ 2. Check if user exceeded their global usage limit (Owner bypasses)
        if (senderNumber !== OWNER_NUMBER) {
            const usageCheck = checkAndIncrementUsage(senderNumber, OWNER_NUMBER);
            if (!usageCheck.allowed) {
                await sock.sendMessage(sender, { 
                    text: `❌ You have exhausted your allowed interaction limit (${usageCheck.current}/${usageCheck.limit}) for this bot.` 
                }, { quoted: m });
                return;
            }
        }

        const userJid = senderJid;
        const senderCleanId = senderNumber;
        const senderName = m.pushName || 'Unknown';

        // 🔍 Global Terminal Logger for every incoming message
        if (showTerminalLogs) {
            console.log(`\n📨 [Global Message Logger]`);
            console.log(`👤 Sender JID: ${userJid}`);
            console.log(`🔑 Clean ID: ${senderCleanId}`);
            console.log(`🏷️ Push Name: ${senderName}`);
            console.log(`----------------------------------------\n`);
        }

        // Robust message text extraction (handles ephemeral, view-once, and captions)
        let msgContent = m.message;
        if (msgContent.ephemeralMessage) msgContent = msgContent.ephemeralMessage.message;
        if (msgContent.viewOnceMessage) msgContent = msgContent.viewOnceMessage.message;
        if (msgContent.viewOnceMessageV2) msgContent = msgContent.viewOnceMessageV2.message;

        let text = '';
        if (msgContent.conversation) {
            text = msgContent.conversation;
        } else if (msgContent.extendedTextMessage) {
            text = msgContent.extendedTextMessage.text;
        } else if (msgContent.imageMessage && msgContent.imageMessage.caption) {
            text = msgContent.imageMessage.caption;
        } else if (msgContent.videoMessage && msgContent.videoMessage.caption) {
            text = msgContent.videoMessage.caption;
        }

        if (!text) return; // Ignore messages without text

		const isLinkBlocked = await checkAntiLink({ sock, m, sender, text, senderNumber, senderJid });
		

        sock.readMessages([m.key]).catch((error) => {
            console.error('Failed to mark message as read:', error);
        });

// 🔇 Check if the user is muted in this group
if (sender.endsWith('@g.us') && isUserMuted(sender, senderJid)) {
    try {
        // Delete their message instantly
        await sock.sendMessage(sender, { delete: m.key });
        return; // Stop processing this message completely
    } catch (error) {
        console.error("Failed to delete muted user message (Is the bot an admin?):", error);
    }
}

		const getContextInfo = () => {
            return msgContent.extendedTextMessage?.contextInfo || 
                   msgContent.imageMessage?.contextInfo || 
                   msgContent.videoMessage?.contextInfo || null;
        };

		const contextInfo = getContextInfo();

        // Print to terminal if logs are enabled
        if (showTerminalLogs) {
            console.log(`Received message: "${text}" from ${sender}`);
        }

        // Turn Terminal Logs OFF
        if (text.toLowerCase() === '.off') {
            showTerminalLogs = false;
            await sleep(1000);
            await sock.sendMessage(sender, { text: 'Terminal Disabled' });
            return;
        }

        // Turn Terminal Logs ON
        if (text.toLowerCase() === '.on') {
            showTerminalLogs = true;
            await sleep(1000);
            await sock.sendMessage(sender, { text: 'Terminal Enabled' });
            return;
        }

		// Check active trivia answers in group chats
		if (sender.endsWith('@g.us') && activeTrivia.has(sender)) {
			const trivia = activeTrivia.get(sender);
			const cleanText = text.toLowerCase().trim();
			
			const isLetterMatch = cleanText === trivia.correctLetter;
			const isTextMatch = cleanText === trivia.correctAnswer.toLowerCase();

			if (isLetterMatch || isTextMatch) {
				activeTrivia.delete(sender); // Clear active trivia
				await sleep(1000);
				await sock.sendMessage(sender, {
					text: `🎉 Correct! @${senderNumber} got the right answer: *${trivia.correctAnswer}*! 🏆`,
					mentions: [senderJid]
				}, { quoted: m });
				return;
			}
		}

            // 👢 .kick Command (Group Admin Only)
        // 🥾 Kick Command Handler
if (text.toLowerCase().startsWith('.kick')) {
    await handleKick(sock, m, text, sender, sleep);
    return;
}

        // 👑 Promote Command Handler
if (text.toLowerCase().startsWith('.promote')) {
    await handlePromote(sock, m, text, sender, sleep);
    return;
}

		// 📉 Demote Command Handler
if (text.toLowerCase().startsWith('.demote')) {
    await handleDemote(sock, m, text, sender, sleep);
    return;
}

// 📊 .unlimit / .removelimit Command Handler
if (text.toLowerCase().startsWith('.unlimit') || text.toLowerCase().startsWith('.removelimit')) {
    await handleUnlimit({ sock, m, text, sender, senderNumber, OWNER_NUMBER, sleep, getContextInfo });
    return;
}

		// 🔒 Lock Command Handler
if (text.toLowerCase().startsWith('.lock')) {
    await handleLock(sock, m, text, sender, sleep);
    return;
}

		// 🔓 Unlock Command Handler
if (text.toLowerCase().startsWith('.unlock')) {
    await handleUnlock(sock, m, text, sender, sleep);
    return;
}

// 🚫 .block (Reply to user or tag them)
        if (text.toLowerCase().startsWith('.block')) {
    await handleBlock({ sock, m, text, sender, senderNumber, OWNER_NUMBER, sleep, getContextInfo });
    return;
}

if (text.toLowerCase().startsWith('.unblock')) {
    await handleUnblock({ sock, m, text, sender, senderNumber, OWNER_NUMBER, sleep, getContextInfo });
    return;
}

if (text.toLowerCase().startsWith('.limit')) {
    await handleLimit({ sock, m, text, sender, senderNumber, OWNER_NUMBER, sleep, getContextInfo });
    return;
}

		// 📊 .poll Command (Create interactive WhatsApp polls)
		if (text.toLowerCase().startsWith('.poll')) {
    await handlePollCommand({ sock, m, text, sender, sleep });
    return;
}

		// 🧠 .trivia Command (Interactive Group Quiz Game)
		// 🧠 .trivia Command Trigger
if (text.toLowerCase() === '.trivia') {
    await handleTrivia({ sock, m, sender, text, sleep });
    return;
}

if (text.toLowerCase() === '.welcome on') {
    await handleWelcomeOn({ sock, m, sender, senderNumber, OWNER_NUMBER, sleep });
    return;
}

if (text.toLowerCase() === '.welcome off') {
    await handleWelcomeOff({ sock, m, sender, senderNumber, OWNER_NUMBER, sleep });
    return;
}

        // 🗣️ Text-to-Speech Command Handler
if (text.toLowerCase().startsWith('.tts')) {
    await handleTTS(sock, m, text, sender, sleep);
    return;
}

        // Private Mode Switch
        if (text.toLowerCase() === '.private') {
            if (senderNumber !== OWNER_NUMBER) {
                await sock.sendMessage(sender, { text: `❌ Access Denied! You're not the owner.` });
                return;
            }
            isPrivate = true;
            await sleep(1000);
            await sock.sendMessage(sender, { text: "Prince Davis, I'm all yours now. 😁" });
            return;
        }

        // Public Mode Switch
        if (text.toLowerCase() === '.public') {
            if (senderNumber !== OWNER_NUMBER) {
                await sock.sendMessage(sender, { text: `❌ Access Denied! You're not the owner.` });
                return;
            }
            isPrivate = false;
            await sleep(1000);
            await sock.sendMessage(sender, { text: "🌍 Y'all have fun now. 🥲" });
            return;
        }

	if (text.toLowerCase() === '.restart') {
            if (senderNumber !== OWNER_NUMBER) {
                await sock.sendMessage(sender, { text: `❌ Access Denied! You're not the owner.` });
                return;
            }
            await sleep(1500);
            await sock.sendMessage(sender, { text: "🔄 Restarting bot system... Back online in a few seconds!" }, { quoted: m });
            
            console.log("⚠️ Bot restart triggered via command.");
            
            setTimeout(() => {
                process.exit(0);
            }, 1000);
            return;
        }

	if (text.toLowerCase() === '.kill') {
            if (senderNumber !== OWNER_NUMBER) {
                await sock.sendMessage(sender, { text: `❌ Access Denied! You're not the owner.` });
                return;
            }
            await sleep(1500);
            await sock.sendMessage(sender, { text: "FORCE SHUTDOWN!" }, { quoted: m });
            
            console.log("⚠️ Bot killed triggered via command.");
            
            setTimeout(() => {
                process.exit(0);
            }, 1000);
            return;
        }

        // 📢 Tagall / Everyone Command Handler
if (text.toLowerCase().startsWith('.tagall') || text.toLowerCase().startsWith('.everyone')) {
    await handleTagAll(sock, m, text, sender, sleep);
    return;
}

        // .imagine / .image Command
       if (text.toLowerCase().startsWith('$img') || text.toLowerCase().startsWith('gen')) {
    await handleImagine({ sock, m, sender, text, sleep });
    return;
}

if (text.toLowerCase().startsWith('.alive')) {
    await handleAlive({ sock, m, sender, senderNumber, senderJid, sleep });
    return;
}

if (text.toLowerCase() === 't') {
    await handleTruth({ sock, m, sender, senderNumber, senderJid, sleep, logBotAction });
    return;
}

if (text.toLowerCase() === 'd') {
    await handleDare({ sock, m, sender, senderNumber, senderJid, sleep, logBotAction });
    return;
}

const cleanText = text.toLowerCase().trim();
if (cleanText === '.flirt' || cleanText.startsWith('.flirt ') || 
    cleanText === '.flirty' || cleanText.startsWith('.flirty ') || 
    cleanText === '.pickuplines' || cleanText.startsWith('.pickuplines ')) {
    await handleFlirt({ sock, m, sender, senderNumber, senderJid, sleep, logBotAction });
    return;
}

// 💬 Quote Toggle Commands (.quoteon / .quoteoff)
if (text.toLowerCase() === '.life' || text.toLowerCase() === '.death') {

 if (senderNumber !== OWNER_NUMBER) {
                await sock.sendMessage(sender, { text: `❌ Access Denied! You're not the owner.` });
                return;
            }

    await handleQuoteToggle({ sock, m, sender, text, senderNumber, OWNER_NUMBER, sleep });
    return;
}

// 🎵 Song Downloader Command (.song, .music, .mp3)
if (text.toLowerCase().startsWith('play me') || text.toLowerCase().startsWith('.music') || text.toLowerCase().startsWith('.vibe')) {
    await handleSong({ sock, m, sender, text, sleep });
    return;
}

if (text.toLowerCase().startsWith('.removebg') || text.toLowerCase().startsWith('.rbg')) {
    await handleRemoveBg({ sock, m, sender, sleep, getContextInfo });
    return;
}

if (text.toLowerCase() === '.toimg' || text.toLowerCase() === '.toimage' || text.toLowerCase().startsWith('.toimg')) {
    await handleToImg({ sock, m, sender, sleep, getContextInfo });
    return;
}

if (text.toLowerCase() === '.list' || text.toLowerCase() === '.h' || text.toLowerCase() === '.chat') {
    await handleMenu({ sock, m, sender, sleep });
    return;
}

if (text.toLowerCase().startsWith('.add') || text.toLowerCase().startsWith('.addmember')) {
    await handleAdd({ sock, m, sender, text, sleep });
    return;
}

// 🚀 PLACE YOUR COMMAND TRIGGERS RIGHT AFTER
    if (text.toLowerCase() === 'broo' || text.toLowerCase() === '.antiviewonce') {
        await handleVV({ sock, m, sender, sleep, getContextInfo, OWNER_NUMBER });
        return;
    };

// 🔇 .mute Command (Group Admin Only)
		if (text.toLowerCase().startsWith('.mute')) {
			await handleMute({ sock, m, sender, text, sleep, getContextInfo });
			return;
		}

// Inside your command dispatcher / switch block:
const textLower = text ? text.toLowerCase().trim() : '';

if (textLower === '.st' || textLower === 'i want it' || textLower.startsWith('.st') || textLower.startsWith('.st')) {
    await handleTaker({ sock, m, text, sender, sleep, getContextInfo });
    return;
}

		// 🔊 .unmute Command (Group Admin Only)
		if (text.toLowerCase().startsWith('.unmute')) {
			await handleUnmute({ sock, m, sender, text, sleep, getContextInfo });
			return;
		}

		// 🎨 Sticker Command Handler
if (text.toLowerCase() === '.s' || text.toLowerCase().startsWith('.s ')) {
    await handleSticker(sock, m, text, sender, sleep);
    return;
}

        if (text.toLowerCase().startsWith('hi')) {
    await handleFlog({ sock, m, sender, senderNumber, senderJid, sleep, getContextInfo });
    return;
}

// 🧠 Active Trivia Answer Checker (Group Chats)


       // AI Chatbot Trigger: Mentioning the bot, quoting the bot, or typing "Hey OG"
        if (text.startsWith('.')) return;

        const mentionedJids = contextInfo?.mentionedJid || [];
        
        const getCleanNumber = (jid) => {
            if (!jid) return '';
            return jid.split('@')[0].split(':')[0];
        };

        const botNumber = getCleanNumber(botJid);
        const botLidNumber = getCleanNumber(botLid);

        const isMentioned = mentionedJids.some(jid => {
            const cleanJidNum = getCleanNumber(jid);
            return cleanJidNum === botNumber || (botLidNumber && cleanJidNum === botLidNumber);
        });
        
        const isGroup = sender.endsWith('@g.us');
        let isQuotingBot = false;
        
        // 👈 Only allow quote-replies if the quoted message was an actual AI response
        if (contextInfo && contextInfo.stanzaId) {
            if (aiMessageKeys.has(contextInfo.stanzaId)) {
                isQuotingBot = true;
            }
        }

        const isAiTriggered = isMentioned || (isQuoteAiEnabled() && isQuotingBot) || text.toLowerCase().startsWith('hey og');

        if (isAiTriggered) {
            let prompt = text;

            if (text.toLowerCase().startsWith('hey og')) {
                prompt = text.slice(6).trim();
                if (prompt.startsWith(',')) {
                    prompt = prompt.slice(1).trim();
                }
            } else if (isMentioned) {
                prompt = text.replace(/@\d+/g, '').trim();
            }

            // If tagged or triggered with nothing else
            if (!prompt) {
                await sock.sendPresenceUpdate('composing', sender);
                const sentMsg = await sock.sendMessage(sender, { text: "Hey! You called? What's on your mind? 😁" }, { quoted: m });
                if (sentMsg?.key?.id) aiMessageKeys.add(sentMsg.key.id); // 👈 Track AI message ID
                return;
            }

            // 👇 CHECK IF USER WANTS AN IMAGE NATIVELY USING OG
            const isImageRequest = /\b(draw|generate|paint|create an image|create a picture|pic of|photo of|image of)\b/i.test(prompt);

            if (isImageRequest) {
                let imagePrompt = prompt.replace(/\b(draw|generate an image of|paint|create a picture of)\b/i, '').trim();
                if (!imagePrompt) imagePrompt = "A futuristic Lagos skyline";

                await sock.sendMessage(sender, { text: "Calm, you'll get it in a moment..." }, { quoted: m });

                try {
                    const imageData = await getAiImageResponse(imagePrompt);

                    const sentMsg = await sock.sendMessage(sender, { 
                        image: imageData.buffer, 
                        caption: `*Here you go as you asked*, *${imagePrompt}*` 
                    }, { quoted: m });
                    if (sentMsg?.key?.id) aiMessageKeys.add(sentMsg.key.id); // 👈 Track AI message ID

                } catch (imgError) {
                    console.error("Image gen failure:", imgError);
                    await sock.sendMessage(sender, { text: "😭 Emotional Damage. Something went wrong." });
                }
                return;
            }

            // Otherwise, handle regular text chat
            try {
                const replyText = await getAiResponse(prompt);

                const sentMsg = await sock.sendMessage(sender, { text: replyText }, { quoted: m });
                
                // 👈 Track this message ID so you can reply to it for continuous chat
                if (sentMsg?.key?.id) {
                    aiMessageKeys.add(sentMsg.key.id);
                    if (aiMessageKeys.size > 100) {
                        const firstKey = aiMessageKeys.values().next().value;
                        aiMessageKeys.delete(firstKey); // Prevent memory bloat
                    }
                }

            } catch (error) {
                console.error("Gemini API Error:", error);
                await sock.sendMessage(sender, { text: "Calm, one at a time please. 🙂" });
            }
            return;
        }
    }
    });
}

connectToWhatsApp();