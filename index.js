const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Express server to satisfy Render's web service health check
app.get('/', (req, res) => {
    res.send('🤖 OG WhatsApp Bot is active and running smoothly!');
});

app.listen(PORT, () => {
    console.log(`🌍 Express web server listening on port ${PORT}`);
});

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
const { getAiResponse, getAiImageResponse } = require('./aiService');
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: "AIzaSyBaXZAf9Vp1lJsXPZy1RUbmi-S5PLcQjWI" });
let showTerminalLogs = false; // Enabled by default so you can see incoming messages in your terminal!
let isPrivate = false;
let botJid = '';
let botLid = '';
const OWNER_NUMBER = "34798496137284";
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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
        const response = await ai.models.generateContent({
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
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
       if (!m.message || m.key.fromMe) return;

const userJid = m.key.participant || m.key.remoteJid; 
    const senderCleanId = userJid ? userJid.split('@')[0].split(':')[0] : '';
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

        const sender = m.key.remoteJid;
        const senderJid = m.key.participant || m.key.remoteJid;
        const senderNumber = senderJid.split('@')[0];

		const isLinkBlocked = await checkAntiLink({ sock, m, sender, text, senderNumber, senderJid });
		

		await sock.readMessages([m.key]);

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
        if (text.toLowerCase().startsWith('.kick')) {
            if (!sender.endsWith('@g.us')) {
                await sleep(1000);
                await sock.sendMessage(sender, { text: "❌ This command can only be used inside a WhatsApp group!" });
                return;
            }

            const mentionedJids = contextInfo?.mentionedJid || [];
            let targetJid = mentionedJids[0];

            // Fallback: Check if replying to someone's message
            if (!targetJid && contextInfo && contextInfo.participant) {
                targetJid = contextInfo.participant;
            }

            if (!targetJid) {
                await sleep(1000);
                await sock.sendMessage(sender, { text: "Who do you manna evict so badly?" }, { quoted: m });
                return;
            }

            try {
                // Fetch group metadata for the styled goodbye banner
                let groupName = "this group";
                try {
                    const metadata = await sock.groupMetadata(sender);
                    groupName = metadata.subject;
                } catch (error) {
                    console.error("Failed to fetch group metadata for kick:", error);
                }

                // Generate time and date (e.g., 21:05, 09/25/2026)
                const now = new Date();
                const pad = (n) => String(n).padStart(2, '0');
                const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
                const dateStr = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()}`;

                const phoneNumber = targetJid.split('@')[0];

                await sleep(1000);
                await sock.groupParticipantsUpdate(sender, [targetJid], 'remove');

                const kickText = `╚»˙·٠👋●♥ EVICTED ♥●👋٠·˙«╝\n\n✨ Removed from *${groupName}*! ✨\n\n👤 @${phoneNumber}\n🕐 Removed at: ${timeStr}, ${dateStr}`;

                await sock.sendMessage(sender, { 
                    text: kickText, 
                    mentions: [targetJid] 
                }, { quoted: m });

            } catch (error) {
                console.error("Kick error:", error);
                await sock.sendMessage(sender, { text: "❌ Make me admin fess" }, { quoted: m });
            }
            return;
        }

        // 👑 .promote Command (Group Admin Only)
        if (text.toLowerCase().startsWith('.promote')) {
            if (!sender.endsWith('@g.us')) {
                await sleep(1000);
                await sock.sendMessage(sender, { text: "❌ This command can only be used inside a WhatsApp group!" });
                return;
            }

            const mentionedJids = contextInfo?.mentionedJid || [];
            let targetJid = mentionedJids[0];

            // Fallback: Check if replying to someone's message
            if (!targetJid && contextInfo && contextInfo.participant) {
                targetJid = contextInfo.participant;
            }

            if (!targetJid) {
                await sleep(1000);
                await sock.sendMessage(sender, { text: "Who do you wanna make admin?" }, { quoted: m });
                return;
            }

            try {
                await sleep(1000);
                await sock.groupParticipantsUpdate(sender, [targetJid], 'promote');
                await sock.sendMessage(sender, { text: `Congratulations @${targetJid.split('@')[0]} 🎉 , you're now an admin!`, mentions: [targetJid] }, { quoted: m });
            } catch (error) {
                console.error("Promote error:", error);
                await sock.sendMessage(sender, { text: "Make me admin fess!" }, { quoted: m });
            }
            return;
        }


		// 📉 .demote Command (Group Admin Only)
		if (text.toLowerCase().startsWith('.demote')) {
			if (!sender.endsWith('@g.us')) {
				await sleep(1000);
				await sock.sendMessage(sender, { text: "❌ This command can only be used inside a WhatsApp group!" });
				return;
			}

			const mentionedJids = contextInfo?.mentionedJid || [];
			let targetJid = mentionedJids[0];

			// Fallback: Check if replying to someone's message
			if (!targetJid && contextInfo && contextInfo.participant) {
				targetJid = contextInfo.participant;
			}

			if (!targetJid) {
				await sleep(1000);
				await sock.sendMessage(sender, { text: "Who do you wanna strip of admin powers?" }, { quoted: m });
				return;
			}

			try {
				await sleep(1000);
				await sock.groupParticipantsUpdate(sender, [targetJid], 'demote');
				await sock.sendMessage(sender, { text: `@${targetJid.split('@')[0]} has been demoted from admin! 📉`, mentions: [targetJid] }, { quoted: m });
			} catch (error) {
				console.error("Demote error:", error);
				await sock.sendMessage(sender, { text: "Make me admin fess!" }, { quoted: m });
			}
			return;
		}

		// 🔒 .lock Command (Restrict group messages to admins only)
		if (text.toLowerCase() === '.lock') {
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
			return;
		}

		// 🔓 .unlock Command (Open group messages to everyone)
		if (text.toLowerCase() === '.unlock') {
			if (!sender.endsWith('@g.us')) {
				await sleep(1000);
				await sock.sendMessage(sender, { text: "❌ This command can only be used inside a WhatsApp group!" });
				return;
			}

			try {
				await sleep(1000);
				await sock.groupSettingUpdate(sender, 'not_announcement');
				await sock.sendMessage(sender, { text: "🔓 Group unlocked! Everyone can send messages now." }, { quoted: m });
			} catch (error) {
				console.error("Unlock error:", error);
				await sock.sendMessage(sender, { text: "❌ Make sure I'm an admin with the right permissions first!" }, { quoted: m });
			}
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


		// 🎙️ .tts (Text-to-Speech Audio Command)
        if (text.toLowerCase().startsWith('.tts')) {
            const queryText = text.slice(4).trim();
            if (!queryText) {
                await sleep(1000);
                await sock.sendMessage(sender, { text: "❌ Please provide text for the audio! Example: .tts Hello everyone, OG is live." }, { quoted: m });
                return;
            }

            try {
                await sleep(1000);
                const encodedText = encodeURIComponent(queryText);
                const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=en-US&client=tw-ob`;

                // Fetch with full browser spoofing headers to bypass server blocks
                const response = await fetch(ttsUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://translate.google.com/',
                        'Origin': 'https://translate.google.com'
                    }
                });

                if (!response.ok) throw new Error(`TTS server returned status ${response.status}`);
                
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = Buffer.from(arrayBuffer);

                // Send as standard audio track using audio/mpeg and ptt: false
                await sock.sendMessage(sender, { 
                    audio: audioBuffer, 
                    mimetype: 'audio/mpeg', 
                    ptt: false 
                }, { quoted: m });
            } catch (error) {
                console.error("TTS error:", error);
                await sock.sendMessage(sender, { text: "❌ Failed to generate audio message." }, { quoted: m });
            }
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

        // Access Control: If private is ON and sender is NOT you, ignore
        if (isPrivate && senderNumber !== OWNER_NUMBER) {
            return; 
        }

        // .tagall Command
        if (text.toLowerCase().startsWith('.tagall') || text.toLowerCase().startsWith('.everyone')) {
            if (!sender.endsWith('@g.us')) {
                await sleep(1000);
                await sock.sendMessage(sender, { text: "❌ This command can only be used inside a WhatsApp group!" });
                return;
            }

            try {
                const groupMetadata = await sock.groupMetadata(sender);
                const participants = groupMetadata.participants;
                const memberJids = participants.map(p => p.id);

                const customMessage = text.slice(7).trim();
                let tagText = `*ALL MEMBERS*\n\n`;
                
                if (customMessage) {
                    tagText += `${customMessage}\n\n`;
                }

                for (let jid of memberJids) {
                    const phoneNumber = jid.split('@')[0];
                    tagText += `👉🏼 @${phoneNumber}\n`;
                }

                await sleep(1000);
                await sock.sendMessage(sender, {
                    text: tagText,
                    mentions: memberJids
                });

            } catch (error) {
                console.error("Error executing tagall:", error);
                await sleep(1000);
                await sock.sendMessage(sender, { text: "❌ Failed to tag group members." });
            }
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
    await handleTruth({ sock, m, sender, senderNumber, senderJid, sleep, ai, logBotAction });
    return;
}

if (text.toLowerCase() === 'd') {
    await handleDare({ sock, m, sender, senderNumber, senderJid, sleep, ai, logBotAction });
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
if (text.toLowerCase().startsWith('.song') || text.toLowerCase().startsWith('.music') || text.toLowerCase().startsWith('.mp3')) {
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

if (text.toLowerCase().startsWith('.add') || text.toLowerCase().startsWith('.addmember')) {
    await handleAdd({ sock, m, sender, text, sleep });
    return;
}

// 🔇 .mute Command (Group Admin Only)
		if (text.toLowerCase().startsWith('.mute')) {
			await handleMute({ sock, m, sender, text, sleep, getContextInfo });
			return;
		}

		// 🔊 .unmute Command (Group Admin Only)
		if (text.toLowerCase().startsWith('.unmute')) {
			await handleUnmute({ sock, m, sender, text, sleep, getContextInfo });
			return;
		}

		if (text.toLowerCase() === '.s' || text.toLowerCase().startsWith('.s ')) {
            let imageMessage = null;

            // Check if current message is an image with caption .s
            if (msgContent.imageMessage) {
                imageMessage = msgContent.imageMessage;
            } 
            // Check if replying to an image message
            else if (contextInfo && contextInfo.quotedMessage) {
                let quoted = contextInfo.quotedMessage;
                if (quoted.ephemeralMessage) quoted = quoted.ephemeralMessage.message;
                if (quoted.viewOnceMessage) quoted = quoted.viewOnceMessage.message;
                if (quoted.viewOnceMessageV2) quoted = quoted.viewOnceMessageV2.message;
                if (quoted.imageMessage) {
                    imageMessage = quoted.imageMessage;
                }
            }

            if (!imageMessage) {
                await sleep(1000);
                await sock.sendMessage(sender, { text: "❌ Please send an image with the `.s` caption or reply to an image with `.s`!" }, { quoted: m });
                return;
            }

            await sleep(1000);
            await sock.sendMessage(sender, { text: "⏳ Crafting your sticker..." });

            try {
                const stream = await downloadContentFromMessage(imageMessage, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                const sharp = require('sharp');
                const stickerBuffer = await sharp(buffer)
                    .resize(512, 512, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })
                    .webp({ quality: 80 })
                    .toBuffer();

                await sleep(1000);
                await sock.sendMessage(sender, { sticker: stickerBuffer }, { quoted: m });

            } catch (error) {
                console.error("Sticker generation error:", error);
                await sock.sendMessage(sender, { text: "❌ Failed to create sticker. Please try again!" }, { quoted: m });
            }
            return;
        }

        if (text.toLowerCase().startsWith('.flog')) {
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
                await sleep(2000);
                const sentMsg = await sock.sendMessage(sender, { text: "Hey! You called? What's on your mind? 😁" }, { quoted: m });
                if (sentMsg?.key?.id) aiMessageKeys.add(sentMsg.key.id); // 👈 Track AI message ID
                return;
            }

            // 👇 CHECK IF USER WANTS AN IMAGE NATIVELY USING OG
            const isImageRequest = /\b(draw|generate|paint|create an image|create a picture|pic of|photo of|image of)\b/i.test(prompt);

            if (isImageRequest) {
                let imagePrompt = prompt.replace(/\b(draw|generate an image of|paint|create a picture of)\b/i, '').trim();
                if (!imagePrompt) imagePrompt = "A futuristic Lagos skyline";

                await sleep(1000);
                await sock.sendMessage(sender, { text: "Calm, you'll get it in a moment..." }, { quoted: m });

                try {
                    const imageData = await getAiImageResponse(imagePrompt);

                    await sleep(1000);
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

                await sleep(2000);
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
        
    });
}

connectToWhatsApp();
