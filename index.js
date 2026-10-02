const { Redis } = require('@upstash/redis');
const { timingSafeEqual } = require('crypto');
const fs = require('fs');
const path = require('path');
const handleScr = require('./commands/scr');
const express = require('express');
const qrcode = require('qrcode');
const app = express();
app.use(express.urlencoded({ extended: false, limit: '8kb' }));
const PORT = process.env.PORT || 3000;
global.latestQR = null;
global.whatsappConnection = { status: 'connecting', method: null };
require('dotenv').config();
const PUBLIC_BASE_URL = String(process.env.RENDER_EXTERNAL_URL || 'https://og-core.onrender.com').replace(/\/+$/, '');
const {
    getMode: getCommandAccessMode,
    hasChainedDotCommands,
    isSelfOnly,
    parseAccessChange,
    resolveCommandName,
    setCommandMode,
    setMode: setCommandAccessMode
} = require('./utils/commandAccess');
const handleWelcomeOn = require('./commands/welcomeon');
const handleWelcomeOff = require('./commands/welcomeoff');
const handleBlock = require('./commands/block');
const handleUnblock = require('./commands/unblock');
const handleLimit = require('./commands/limit');
const handleUnlimit = require('./commands/unlimit');
const { getTargetUser } = require('./utils/targetHelper');
const { isBlacklisted, checkAndIncrementUsage, blockUser, unblockUser, setUserLimit, removeUserLimit } = require('./utils/userControl');
const { enableAntiLink, disableAntiLink, isAntiLinkEnabled } = require('./utils/antiLinkControl');
const { isGroupAllowed, canUseCommand, formatCooldownMessage } = require('./utils/antiSpam');
const handleMenu = require('./commands/menu');
const handleStatus = require('./commands/status');
const botStartTime = Math.floor(Date.now() / 1000);
let isPrivate = false;
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
const handleToImg = require('./commands/toImg');
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
const { getActivityAction, getActivityPhoneNumber, recordBotActivity } = require('./utils/activityLog');
const { matchesOwnerNumber } = require('./utils/ownerAccess');
const registerActivityDashboard = require('./routes/activityDashboard');
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
let botPhoneNumber = '';
const ENV_OWNER_NUMBER = String(process.env.OWNER_NUMBER || '').replace(/\D/g, '');
let OWNER_NUMBER = ENV_OWNER_NUMBER;
const PAIRING_SETUP_TOKEN = process.env.PAIRING_SETUP_TOKEN || '';
const ACTIVITY_DASHBOARD_PASSWORD = process.env.ACTIVITY_DASHBOARD_PASSWORD || '';
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
// const qrcode = require('qrcode-terminal');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function connectionStatusMarkup() {
    return `<p id="connection-status" role="status">Checking WhatsApp connection...</p>
        <script>
            async function refreshConnectionStatus() {
                try {
                    const response = await fetch('/connection-status', { cache: 'no-store' });
                    const status = await response.json();
                    const element = document.getElementById('connection-status');
                    if (status.status === 'connected') {
                        element.textContent = '✅ WhatsApp connected successfully' + (status.method ? ' via ' + status.method : '') + '.';
                        element.style.color = '#25D366';
                    } else if (status.status === 'disconnected') {
                        element.textContent = 'WhatsApp disconnected. Reconnecting...';
                        element.style.color = '#ffb84d';
                    } else {
                        element.textContent = 'Waiting for WhatsApp connection' + (status.method ? ' via ' + status.method : '') + '...';
                        element.style.color = '#f0d56b';
                    }
                } catch (error) {
                    document.getElementById('connection-status').textContent = 'Unable to check WhatsApp connection.';
                }
            }
            refreshConnectionStatus();
            setInterval(refreshConnectionStatus, 2000);
        </script>`;
}

function isValidPairingSetupToken(candidate) {
    const expectedToken = Buffer.from(PAIRING_SETUP_TOKEN);
    const submittedToken = Buffer.from(String(candidate || ''));
    return expectedToken.length >= 32 &&
        submittedToken.length === expectedToken.length &&
        timingSafeEqual(submittedToken, expectedToken);
}

function ownerNumberSetupMarkup() {
    const isConfigured = /^\d{7,15}$/.test(OWNER_NUMBER) && PAIRING_SETUP_TOKEN.length >= 32;
    const maskedOwnerNumber = isConfigured ? '*'.repeat(OWNER_NUMBER.length) : '';
    const maskedSetupToken = isConfigured ? '*'.repeat(PAIRING_SETUP_TOKEN.length) : '';

    return `<form id="owner-setup-form" action="/owner-number" method="POST" style="max-width: 420px; margin: 24px auto; text-align: left;">
        <label for="ownerNumber" style="display: block; color: rgb(19, 221, 150); font-family: Kavoon, system-ui; margin: 12px 0 6px;">Separate owner number (optional)</label>
        <input type="${isConfigured ? 'password' : 'tel'}" id="ownerNumber" name="ownerNumber" value="${maskedOwnerNumber}" placeholder="Defaults to OWNER_NUMBER or paired bot number" autocomplete="tel" ${isConfigured ? 'readonly' : ''} style="width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #475569; border-radius: 8px; background: #1e293b; color: #fff; text-align: center; margin-bottom: 15px;" />
        <label for="setupToken" style="display: block; color: rgb(19, 221, 150); font-family: Kavoon, system-ui; margin: 12px 0 6px;">Deployment setup token</label>
        <input type="password" id="setupToken" name="setupToken" value="${maskedSetupToken}" ${isConfigured ? 'readonly' : 'required'} autocomplete="off" style="width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #475569; border-radius: 8px; background: #1e293b; color: #fff; text-align: center; margin-bottom: 15px;" />
        <button type="button" id="edit-owner-setup" ${isConfigured ? '' : 'hidden'} style="padding: 12px 20px; background: #25D366; color: white; border: 0; border-radius: 8px; cursor: pointer; width: 100%; font-weight: bold; font-family: Kavoon, system-ui;">Edit</button>
        <button type="submit" id="save-owner-setup" ${isConfigured ? 'hidden' : ''} style="padding: 12px 20px; background: #25D366; color: white; border: 0; border-radius: 8px; cursor: pointer; width: 100%; font-weight: bold; font-family: Kavoon, system-ui;">Save owner number</button>
    </form>
    ${isConfigured ? `<script>
        document.getElementById('edit-owner-setup').addEventListener('click', () => {
            const ownerInput = document.getElementById('ownerNumber');
            const tokenInput = document.getElementById('setupToken');
            ownerInput.value = '';
            tokenInput.value = '';
            ownerInput.type = 'tel';
            ownerInput.placeholder = 'Leave blank to keep the saved owner number';
            tokenInput.type = 'password';
            ownerInput.readOnly = false;
            tokenInput.readOnly = false;
            tokenInput.required = true;
            document.getElementById('edit-owner-setup').hidden = true;
            document.getElementById('save-owner-setup').hidden = false;
            ownerInput.focus();
        });
    </script>` : ''}`;
}

function getSenderNumber(jid) {
    return jid ? jid.split('@')[0].split(':')[0] : '';
}

function isOwnerSenderNumber(senderNumber) {
    return matchesOwnerNumber(senderNumber, OWNER_NUMBER, botPhoneNumber);
}

function normalizePhoneNumber(value) {
    return String(value || '').replace(/\D/g, '');
}

function isOwnerOrBotNumber(candidate) {
    const cleanCandidate = normalizePhoneNumber(candidate);
    const protectedNumbers = new Set([
        normalizePhoneNumber(OWNER_NUMBER),
        normalizePhoneNumber(botPhoneNumber),
        normalizePhoneNumber(getSenderNumber(botJid))
    ].filter(Boolean));

    return Boolean(cleanCandidate) && protectedNumbers.has(cleanCandidate);
}

function isProtectedTargetJid(jid) {
    return isOwnerOrBotNumber(getSenderNumber(jid));
}

function hasProtectedTarget({ contextInfo, text, fallbackJid }) {
    const jids = [];

    if (Array.isArray(contextInfo?.mentionedJid)) {
        jids.push(...contextInfo.mentionedJid);
    }

    if (contextInfo?.participant) jids.push(contextInfo.participant);

    for (const jid of jids) {
        if (isProtectedTargetJid(jid)) return true;
    }

    const directNumberMatches = String(text || '').match(/@?(\d{7,15})/g) || [];
    for (const match of directNumberMatches) {
        if (isOwnerOrBotNumber(match)) return true;
    }

    return false;
}

async function isAdminActionAllowed(sock, sender, senderNumber, senderJid, m) {
    if (isOwnerSenderNumber(senderNumber) || isOwnerOrBotNumber(senderNumber)) return true;
    if (!sender.endsWith('@g.us')) return true;

    const senderIsAdmin = await isGroupAdmin(sock, sender, [senderJid, m.key.participantAlt].filter(Boolean));
    return senderIsAdmin;
}

const activityGroupMetadataCache = new Map();

async function getGroupParticipantPhoneNumber(sock, groupJid, participantJids) {
    const now = Date.now();
    let cached = activityGroupMetadataCache.get(groupJid);
    if (!cached || cached.expiresAt <= now) {
        const metadata = await sock.groupMetadata(groupJid);
        cached = { expiresAt: now + 5 * 60 * 1000, participants: metadata.participants || [] };
        activityGroupMetadataCache.set(groupJid, cached);
        if (activityGroupMetadataCache.size > 100) {
            activityGroupMetadataCache.delete(activityGroupMetadataCache.keys().next().value);
        }
    }

    const normalizedJids = new Set(participantJids.map((jid) => jid?.replace(/:\d+(?=@)/, '')).filter(Boolean));
    const participant = cached.participants.find((entry) =>
        [entry.id, entry.lid, entry.phoneNumber]
            .filter(Boolean)
            .some((jid) => normalizedJids.has(jid.replace(/:\d+(?=@)/, '')))
    );
    if (!participant) return null;

    return participant.phoneNumber || [participant.id, participant.lid]
        .find((jid) => jid && (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@hosted')));
}

function isConfiguredOwnerMessage(message, resolvedSenderNumber) {
    if (message.key?.fromMe) return true;
    if (isOwnerSenderNumber(resolvedSenderNumber)) return true;
    const senderJids = [
        message.key?.participant,
        message.key?.participantAlt,
        message.key?.remoteJid,
        message.key?.remoteJidAlt
    ];
    return senderJids.some((jid) => isOwnerSenderNumber(getSenderNumber(jid)));
}

function isPrivateForSender(jid, resolvedSenderNumber) {
    return isPrivate && !isOwnerSenderNumber(resolvedSenderNumber) && !isOwnerSenderNumber(getSenderNumber(jid));
}

async function isGroupAdmin(sock, groupJid, participantJids) {
    if (!groupJid.endsWith('@g.us')) return false;

    const metadata = await sock.groupMetadata(groupJid);
    const participant = metadata.participants?.find((entry) =>
        [entry.id, entry.jid, entry.lid, entry.phoneNumber].some((jid) => jid && participantJids.includes(jid))
    );
    return participant?.admin === 'admin' || participant?.admin === 'superadmin';
}

async function getConsciousAiResponse(jid, userMessage) {
    if (!chatHistories.has(jid)) chatHistories.set(jid, []);
    const history = chatHistories.get(jid);
    history.push({ role: 'user', parts: [{ text: userMessage }] });

    try {
        const response = await getAiClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: history,
            config: {
                systemInstruction: `You are OG, a street-smart, witty, and friendly AI WhatsApp companion created by Prince Davis. You speak with a cool blend of English and Nigerian Pidgin slang. You are fully conscious of what is happening in this chat, including any commands, trivia games, polls, or tools that were just used. Pick up the conversation naturally based on the latest context.`
            }
        });
        const aiReply = response.text;
        history.push({ role: 'model', parts: [{ text: aiReply }] });
        if (history.length > MAX_HISTORY_LENGTH) history.splice(0, history.length - MAX_HISTORY_LENGTH);
        return aiReply;
    } catch (error) {
        console.error('Conscious AI error:', error);
        return 'Omo, network dey shake small. Try talk to me again later!';
    }
}

function logBotAction(jid, botMessage) {
    if (!chatHistories.has(jid)) chatHistories.set(jid, []);
    chatHistories.get(jid).push({
        role: 'model',
        parts: [{ text: `[System/Bot Action Output]: ${botMessage}` }]
    });
}

const activeTrivia = new Map();
const SESSION_DIR = path.join(__dirname, 'session');
const LEGACY_SESSION_DIR = path.join(__dirname, 'auth_info');
let sessionClearInProgress = false;
const sessionBackupTasks = new Set();
const credentialSaveTasks = new Set();
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
});

registerActivityDashboard(app, {
    redis,
    password: ACTIVITY_DASHBOARD_PASSWORD,
    getConnectionStatus: () => global.whatsappConnection,
    resolveLid: (lid) => global.activeSock?.signalRepository?.lidMapping?.getPNForLID(lid)
});

async function saveOwnerNumber(ownerNumber) {
    const normalizedOwnerNumber = String(ownerNumber || '').replace(/\D/g, '');
    if (!/^\d{7,15}$/.test(normalizedOwnerNumber)) {
        throw new Error('Owner number must contain 7 to 15 digits.');
    }

    await redis.set('bot_owner_number', normalizedOwnerNumber);
    const savedValue = await redis.get('bot_owner_number');
    const savedOwnerNumber = String(savedValue || '').replace(/\D/g, '');
    if (savedOwnerNumber !== normalizedOwnerNumber) {
        throw new Error('Owner number was not confirmed in Redis after saving.');
    }

    OWNER_NUMBER = normalizedOwnerNumber;
    console.log('Owner number confirmed in Upstash Redis.');
    return normalizedOwnerNumber;
}

async function restoreOwnerNumber() {
    if (ENV_OWNER_NUMBER) {
        OWNER_NUMBER = ENV_OWNER_NUMBER;
        try {
            await saveOwnerNumber(ENV_OWNER_NUMBER);
        } catch (error) {
            console.error('Could not persist configured owner number to Redis:', error);
        }
        return;
    }

    const savedOwnerNumber = await redis.get('bot_owner_number');
    const normalizedOwnerNumber = String(savedOwnerNumber || '').replace(/\D/g, '');
    if (/^\d{7,15}$/.test(normalizedOwnerNumber)) {
        OWNER_NUMBER = normalizedOwnerNumber;
        console.log('Restored owner number from Upstash Redis.');
    } else {
        console.log('No valid owner number found in Upstash Redis yet.');
    }
}

async function restoreSession() {
    fs.mkdirSync(SESSION_DIR, { recursive: true });

    const sessionFiles = await redis.get('bot_session');
    if (sessionFiles && typeof sessionFiles === 'object' && !Array.isArray(sessionFiles)) {
        for (const [filename, content] of Object.entries(sessionFiles)) {
            if (path.basename(filename) !== filename) {
                throw new Error(`Invalid filename in saved WhatsApp session: ${filename}`);
            }
            const fileContent = typeof content === 'string' ? content : JSON.stringify(content);
            fs.writeFileSync(path.join(SESSION_DIR, filename), fileContent);
        }
        console.log('✅ Restored WhatsApp session from Upstash Redis.');
        return;
    }

    if (fs.existsSync(LEGACY_SESSION_DIR)) {
        const legacyFiles = fs.readdirSync(LEGACY_SESSION_DIR).filter((filename) =>
            fs.statSync(path.join(LEGACY_SESSION_DIR, filename)).isFile()
        );
        if (legacyFiles.length > 0) {
            for (const filename of legacyFiles) {
                fs.copyFileSync(path.join(LEGACY_SESSION_DIR, filename), path.join(SESSION_DIR, filename));
            }
            console.log('Migrating existing auth_info session to Upstash Redis.');
            await backupSession();
            return;
        }
    }

    console.log('ℹ️ No saved session in Redis; pair the bot on first startup.');
}

async function backupSession() {
    if (sessionClearInProgress || !fs.existsSync(SESSION_DIR)) return;

    const backupTask = (async () => {
        try {
            const sessionFiles = {};
            for (const filename of fs.readdirSync(SESSION_DIR)) {
                const filePath = path.join(SESSION_DIR, filename);
                if (fs.statSync(filePath).isFile()) {
                    sessionFiles[filename] = fs.readFileSync(filePath, 'utf8');
                }
            }

            if (!sessionClearInProgress && Object.keys(sessionFiles).length > 0) {
                await redis.set('bot_session', sessionFiles);
                console.log('🔄 WhatsApp session backed up to Upstash Redis.');
            }
        } catch (error) {
            console.error('❌ Failed to back up WhatsApp session to Redis:', error);
        }
    })();

    sessionBackupTasks.add(backupTask);
    try {
        await backupTask;
    } finally {
        sessionBackupTasks.delete(backupTask);
    }
}
async function connectToWhatsApp() {
    console.log("🚀 Initializing Baileys connection handler..."); // <-- Add this right here

    await restoreOwnerNumber();
    await restoreSession();
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state
    });
    global.activeSock = sock;
    let connectionIsOpen = false;
    let messageHandlersReady = false;
    let readyAnnouncementSent = false;

    const announceReady = async () => {
        if (!connectionIsOpen || readyAnnouncementSent || !botJid) return;
        if (global.activeSock !== sock) return;

        const singleCommandCheck = handleTagAll;

        for (let attempt = 0; attempt < 30; attempt++) {
            if (!connectionIsOpen || readyAnnouncementSent || !botJid || global.activeSock !== sock) return;
            const commandIsReady = messageHandlersReady && typeof singleCommandCheck === 'function';
            if (commandIsReady) break;
            console.log(`⏳ Waiting for a working command handler before ready announcement... (${attempt + 1}/30)`);
            await sleep(500);
        }

        if (!messageHandlersReady || typeof handleTagAll !== 'function') {
            console.warn('⚠️ Ready announcement delayed: the command handler is not ready yet.');
            return;
        }

        if (readyAnnouncementSent || global.activeSock !== sock) return;

        readyAnnouncementSent = true;
        global.whatsappConnection.status = 'connected';
        global.whatsappConnection.method ||= 'saved session';
        const selfChatJid = botJid.replace(/:\d+(?=@)/, '');
        if (!selfChatJid) return;

        try {
            const sentMessage = await sock.sendMessage(selfChatJid, {
                text: `✅ OG CORE connected successfully to WhatsApp via ${global.whatsappConnection.method} and is ready for commands.`
            });

            if (sentMessage?.key?.id) aiMessageKeys.add(sentMessage.key.id);
        } catch (error) {
            console.error('Could not send bot-ready confirmation to self-chat:', error);
        }
    };

    // 👈 ADD THIS LINE HERE so the web server can talk to your bot:

    // Your existing Baileys setup (useAuthState, makeWASocket, etc.)
    // ...

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

   /*     if (qr) {
            console.log('Scan this QR code with your WhatsApp app:\n');
            qrcode.generate(qr, { small: true });
        } */

            if (qr) {
        global.latestQR = qr;
        if (!global.whatsappConnection.method) global.whatsappConnection.method = 'QR code';
        global.whatsappConnection.status = 'awaiting-pairing';
        console.log('📸 QR code received from WhatsApp and saved to global variable!');
    }

    if (connection === 'open') {
        global.latestQR = null; // Clears it once you scan successfully
        global.whatsappConnection.status = 'connecting';
        global.whatsappConnection.method ||= 'saved session';
    }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            global.whatsappConnection.status = 'disconnected';
            if (global.activeSock === sock) {
                global.activeSock = null;
            }
            console.error(`Connection closed (status ${statusCode ?? 'unknown'}): ${lastDisconnect?.error?.message ?? 'unknown error'}`);
            if (shouldReconnect) {
                connectToWhatsApp().catch((error) => {
                    console.error('WhatsApp reconnect failed:', error);
                    process.exit(1);
                });
            } else if (!sessionClearInProgress) {
                sessionClearInProgress = true;
                try {
                    await Promise.allSettled([...sessionBackupTasks]);
                    await Promise.allSettled([...credentialSaveTasks]);
                    await Promise.allSettled([...sessionBackupTasks]);
                    await redis.del('bot_session', 'bot_creds');
                    fs.rmSync(SESSION_DIR, { recursive: true, force: true });
                    fs.rmSync(LEGACY_SESSION_DIR, { recursive: true, force: true });
                    console.error('WhatsApp rejected the saved session. Cleared stale credentials; a new pairing is required.');
                    global.latestQR = null;
                    global.whatsappConnection = { status: 'connecting', method: 'QR code' };
                    sessionClearInProgress = false;
                    connectToWhatsApp().catch((error) => {
                        console.error('Could not restart with a fresh WhatsApp session:', error);
                        process.exit(1);
                    });
                } catch (error) {
                    sessionClearInProgress = false;
                    console.error('Could not clear the rejected WhatsApp session from Redis/local storage:', error);
                }
            } else {
                console.log('Intentional WhatsApp logout; automatic pairing restart skipped.');
            }
        } else if (connection === 'open') {
            void backupSession();
            connectionIsOpen = true;
            botJid = sock.user?.id || '';
            botLid = sock.user?.lid || '';
            let botPhoneJid = botJid;
            if (!botPhoneJid.endsWith('@s.whatsapp.net') && !botPhoneJid.endsWith('@hosted')) {
                try {
                    botPhoneJid = await sock.signalRepository.lidMapping.getPNForLID(botJid);
                } catch {
                    botPhoneJid = '';
                }
            }
            const connectedPhoneNumber = getSenderNumber(botPhoneJid);
            botPhoneNumber = /^\d{7,15}$/.test(connectedPhoneNumber) ? connectedPhoneNumber : '';
            console.log(`📌 Saved Bot JID: ${botJid} | LID: ${botLid}`);

            if (!OWNER_NUMBER && botPhoneNumber) {
                try {
                    await saveOwnerNumber(botPhoneNumber);
                } catch (error) {
                    console.error('Could not persist the paired bot number as owner:', error);
                }
            }

            announceReady();
        }
    });


// Listen for group participant updates (Joins, leaves, etc.)
sock.ev.on('group-participants.update', async (update) => {
    if (global.activeSock !== sock) return;
    try {
        await handleWelcome({ sock, update, sleep });
    } catch (error) {
        console.error('Welcome handler failed:', error);
    }
});

    sock.ev.on('creds.update', async () => {
        if (sessionClearInProgress) return;
        const credentialSaveTask = (async () => {
            if (sessionClearInProgress) return;
            await saveCreds();
            await backupSession();
        })();
        credentialSaveTasks.add(credentialSaveTask);
        try {
            await credentialSaveTask;
        } catch (error) {
            console.error('Failed to save WhatsApp credentials:', error);
        } finally {
            credentialSaveTasks.delete(credentialSaveTask);
        }
    });

    // Listen for incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const m of messages) {
        try {
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
        const senderIdentity = await getActivityPhoneNumber({
            message: m,
            senderJid,
            senderNumber: m.key.fromMe ? botPhoneNumber : '',
            getSenderNumber,
            resolveLid: (jid) => sock.signalRepository.lidMapping.getPNForLID(jid),
            resolveGroupPhone: (participantJids) => getGroupParticipantPhoneNumber(sock, sender, participantJids)
        });
        const senderNumber = senderIdentity.phoneNumber;

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

        const getContextInfo = () => {
            return msgContent.extendedTextMessage?.contextInfo ||
                   msgContent.imageMessage?.contextInfo ||
                   msgContent.videoMessage?.contextInfo || null;
        };
        const contextInfo = getContextInfo();

        const activityAction = getActivityAction({ text, contextInfo, botJid, botLid, getSenderNumber });
        if (activityAction) {
            const activityIdentity = await getActivityPhoneNumber({
                message: m,
                senderJid,
                senderNumber,
                getSenderNumber,
                resolveLid: (jid) => sock.signalRepository.lidMapping.getPNForLID(jid),
                resolveGroupPhone: (participantJids) => getGroupParticipantPhoneNumber(sock, sender, participantJids)
            });
            void recordBotActivity(redis, {
                userNumber: activityIdentity.phoneNumber,
                userLid: activityIdentity.userLid,
                chatJid: sender,
                action: activityAction
            }).catch((error) => {
                console.error('Could not record bot activity:', error.message);
            });
        }

        if (isPrivateForSender(senderJid, senderNumber)) return;

        if (isBlacklisted(senderNumber) && !isOwnerSenderNumber(senderNumber)) return;

        if (!isOwnerSenderNumber(senderNumber)) {
            const usageCheck = checkAndIncrementUsage(senderNumber, OWNER_NUMBER);
            if (!usageCheck.allowed) {
                await sock.sendMessage(sender, {
                    text: `❌ You have exhausted your allowed interaction limit (${usageCheck.current}/${usageCheck.limit}) for this bot.`
                }, { quoted: m });
                return;
            }
        }

        if (await checkAntiLink({ sock, m, sender, text, senderNumber, senderJid })) continue;

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

        const normalizedText = text.trim().toLowerCase();
        if (normalizedText === '.status') {
            await handleStatus({
                sock,
                m,
                sender,
                senderNumber,
                botPhoneNumber,
                ownerNumber: OWNER_NUMBER,
                connection: global.whatsappConnection
            });
            return;
        }

        if (normalizedText === '.activity') {
            if (!isConfiguredOwnerMessage(m, senderNumber)) {
                await sock.sendMessage(sender, { text: '❌ ❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
                return;
            }

            const ownerChat = sender.endsWith('@g.us')
                ? `${OWNER_NUMBER}@s.whatsapp.net`
                : sender;
            const message = ACTIVITY_DASHBOARD_PASSWORD.length >= 32
                ? `🔒 Private activity dashboard: ${PUBLIC_BASE_URL}/admin/activity`
                : 'Activity dashboard is disabled. Set ACTIVITY_DASHBOARD_PASSWORD in this deployment first.';

            await sock.sendMessage(ownerChat, { text: message }, { quoted: sender.endsWith('@g.us') ? undefined : m });
            return;
        }

        if (normalizedText === '.logout' || normalizedText === '.clearsession') {
            if (!isOwnerSenderNumber(senderNumber) && !m.key.fromMe) {
                await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
                return;
            }

            sessionClearInProgress = true;
            try {
                await Promise.allSettled([...sessionBackupTasks]);
                await Promise.allSettled([...credentialSaveTasks]);
                await Promise.allSettled([...sessionBackupTasks]);
                await redis.del('bot_session', 'bot_creds');
                fs.rmSync(SESSION_DIR, { recursive: true, force: true });
                fs.rmSync(LEGACY_SESSION_DIR, { recursive: true, force: true });

                try {
                    await sock.sendMessage(sender, {
                        text: '✅ Cloud and local session data cleared. Revoking WhatsApp session and restarting now.'
                    }, { quoted: m });
                } catch (sendError) {
                    console.error('Could not send logout confirmation:', sendError);
                }

                const logoutRequest = sock.logout().catch((logoutError) => {
                    console.error('WhatsApp session revocation failed:', logoutError);
                });
                setTimeout(() => process.exit(0), 2000);
                await logoutRequest;
            } catch (error) {
                sessionClearInProgress = false;
                console.error('Failed to clear WhatsApp session:', error);
                await sock.sendMessage(sender, {
                    text: '❌ Session could not be fully cleared. Check the server logs before retrying.'
                }, { quoted: m });
            }
            return;
        }

        if (normalizedText === '.admin' || normalizedText === '.group') {
            if (!isOwnerSenderNumber(senderNumber)) {
                await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
                return;
            }

            const mode = normalizedText === '.admin' ? 'admin' : 'group';
            setCommandAccessMode(mode);
            const message = mode === 'admin'
                ? '🔒 Admin mode enabled. Only group admins and Owner can use bot commands.'
                : '🔓 Group mode enabled. Admin-only command access is off.';
            await sock.sendMessage(sender, { text: message }, { quoted: m });
            return;
        }

        if (/^\.(admin|group)(?:\s|$)/.test(normalizedText)) {
            await sock.sendMessage(sender, { text: 'Use .admin or .group by itself, in a separate message.' }, { quoted: m });
            return;
        }

        const accessChange = parseAccessChange(text);
        if (accessChange) {
            if (!isOwnerSenderNumber(senderNumber)) {
                await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
                return;
            }

            setCommandMode(accessChange.command, accessChange.mode);
            const accessLabel = accessChange.mode === 'self' ? 'owner-only' : 'available to the group';
            await sock.sendMessage(sender, {
                text: `✅ .${accessChange.command} is now ${accessLabel}.`
            }, { quoted: m });
            return;
        }

        if (hasChainedDotCommands(text)) {
            await sock.sendMessage(sender, {
                text: 'Use one command per message. Only a command followed by .self or .public can be combined.'
            }, { quoted: m });
            return;
        }

        const commandName = resolveCommandName(text);
        if (commandName) {
            if (isSelfOnly(commandName) && !isOwnerSenderNumber(senderNumber)) {
                await sock.sendMessage(sender, { text: '🔒 This command is reserved for the bot owner.' }, { quoted: m });
                return;
            }

            const staysPublicInAdminMode = ['taker', 'sticker', 'toimg'].includes(commandName);
            if (getCommandAccessMode() === 'admin' && !isOwnerSenderNumber(senderNumber) && !staysPublicInAdminMode) {
                let senderIsAdmin = false;
                try {
                    senderIsAdmin = await isGroupAdmin(sock, sender, [senderJid, m.key.participantAlt].filter(Boolean));
                } catch (error) {
                    console.error('Failed to check group admin status:', error);
                }

                if (!senderIsAdmin) {
                    await sock.sendMessage(sender, {
                        text: '🔒 Admin mode is enabled. Only group admins can use bot commands.'
                    }, { quoted: m });
                    return;
                }
            }
        }

        // Print to terminal if logs are enabled
        if (showTerminalLogs) {
            console.log(`Received message: "${text}" from ${sender}`);
        }

        // Turn Terminal Logs OFF
        if (text.toLowerCase() === '.off') {
            if (!isOwnerSenderNumber(senderNumber) && !isOwnerOrBotNumber(senderNumber)) {
                await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
                return;
            }
            showTerminalLogs = false;
            await sleep(1000);
            await sock.sendMessage(sender, { text: 'Terminal Disabled' });
            return;
        }

        // Turn Terminal Logs ON
        if (text.toLowerCase() === '.on') {
            if (!isOwnerSenderNumber(senderNumber) && !isOwnerOrBotNumber(senderNumber)) {
                await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
                return;
            }
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
    if (!await isAdminActionAllowed(sock, sender, senderNumber, senderJid, m)) {
        await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝙶𝚁𝙾𝚄𝙿 𝙰𝙳𝙼𝙸𝙽𝚂 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
        return;
    }
    if (hasProtectedTarget({ contextInfo, text, fallbackJid: m.key.participant || senderJid })) {
        await sock.sendMessage(sender, { text: '❌ You cannot kick the owner.' }, { quoted: m });
        return;
    }
    await handleKick(sock, m, text, sender, sleep);
    return;
}

        // 👑 Promote Command Handler
if (text.toLowerCase().startsWith('.promote')) {
    if (!await isAdminActionAllowed(sock, sender, senderNumber, senderJid, m)) {
        await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝙶𝚁𝙾𝚄𝙿 𝙰𝙳𝙼𝙸𝙽𝚂 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
        return;
    }
    if (hasProtectedTarget({ contextInfo, text, fallbackJid: m.key.participant || senderJid })) {
        await sock.sendMessage(sender, { text: 'The owner? 😒 Really?.' }, { quoted: m });
        return;
    }
    await handlePromote(sock, m, text, sender, sleep);
    return;
}

		// 📉 Demote Command Handler
if (text.toLowerCase().startsWith('.demote')) {
    if (!await isAdminActionAllowed(sock, sender, senderNumber, senderJid, m)) {
        await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝙶𝚁𝙾𝚄𝙿 𝙰𝙳𝙼𝙸𝙽𝚂 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
        return;
    }
    if (hasProtectedTarget({ contextInfo, text, fallbackJid: m.key.participant || senderJid })) {
        await sock.sendMessage(sender, { text: '❌ You cannot demote the owner.' }, { quoted: m });
        return;
    }
    await handleDemote(sock, m, text, sender, sleep);
    return;
}

// 📊 .unlimit / .removelimit Command Handler
if (text.toLowerCase().startsWith('.unlimit') || text.toLowerCase().startsWith('.removelimit')) {
    if (!isOwnerSenderNumber(senderNumber) && !isOwnerOrBotNumber(senderNumber)) {
        await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳.' }, { quoted: m });
        return;
    }
    if (hasProtectedTarget({ contextInfo, text })) {
        await sock.sendMessage(sender, { text: '❌ You cannot change the usage limit for the owner or bot number.' }, { quoted: m });
        return;
    }
    await handleUnlimit({ sock, m, text, sender, senderNumber, OWNER_NUMBER, botPhoneNumber, sleep, getContextInfo });
    return;
}

		// 🔒 Lock Command Handler
if (text.toLowerCase().startsWith('.lock')) {
    if (!await isAdminActionAllowed(sock, sender, senderNumber, senderJid, m)) {
        await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝙶𝚁𝙾𝚄𝙿 𝙰𝙳𝙼𝙸𝙽𝚂 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
        return;
    }
    if (hasProtectedTarget({ contextInfo, text, fallbackJid: m.key.participant || senderJid })) {
        await sock.sendMessage(sender, { text: '❌ You cannot lock the owner.' }, { quoted: m });
        return;
    }
    await handleLock(sock, m, text, sender, sleep);
    return;
}

if (text.toLowerCase().startsWith('.scr')) {
    if (!isOwnerSenderNumber(senderNumber) && !isOwnerOrBotNumber(senderNumber)) {
        await sock.sendMessage(sender, { text: '❌ Only the owner or bot number can use .scr.' }, { quoted: m });
        return;
    }
    if (sender.endsWith('@g.us') && !isGroupAllowed(sender)) {
        await sock.sendMessage(sender, { text: '🛡️ This group is not enabled for automatic sticker edits.' }, { quoted: m });
        return;
    }
    const rateLimit = canUseCommand({ command: 'scr', userId: senderJid, groupId: sender.endsWith('@g.us') ? sender : null, cooldownMs: 30000 });
    if (!rateLimit.allowed) {
        await sock.sendMessage(sender, { text: `⏳ Please wait ${formatCooldownMessage(rateLimit.remaining)} before using .scr again.` }, { quoted: m });
        return;
    }
    await handleScr.handle(sock, m, { from: sender, quoted: contextInfo?.quotedMessage });
    return;
}

		// 🔓 Unlock Command Handler
if (text.toLowerCase().startsWith('.unlock')) {
    if (!await isAdminActionAllowed(sock, sender, senderNumber, senderJid, m)) {
        await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝙶𝚁𝙾𝚄𝙿 𝙰𝙳𝙼𝙸𝙽𝚂 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
        return;
    }
    if (hasProtectedTarget({ contextInfo, text, fallbackJid: m.key.participant || senderJid })) {
        await sock.sendMessage(sender, { text: "❌ You could'nt lock the owner in the first place." }, { quoted: m });
        return;
    }
    await handleUnlock(sock, m, text, sender, sleep);
    return;
}

// 🚫 .block (Reply to user or tag them)
        if (text.toLowerCase().startsWith('.block')) {
    if (!await isAdminActionAllowed(sock, sender, senderNumber, senderJid, m)) {
        await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝙶𝚁𝙾𝚄𝙿 𝙰𝙳𝙼𝙸𝙽𝚂 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
        return;
    }
    if (hasProtectedTarget({ contextInfo, text, fallbackJid: m.key.participant || senderJid })) {
        await sock.sendMessage(sender, { text: '❌ You cannot block the owner.' }, { quoted: m });
        return;
    }
    await handleBlock({ sock, m, text, sender, senderNumber, OWNER_NUMBER, botPhoneNumber, sleep, getContextInfo });
    return;
}

if (text.toLowerCase().startsWith('.unblock')) {
    if (!await isAdminActionAllowed(sock, sender, senderNumber, senderJid, m)) {
        await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝙶𝚁𝙾𝚄𝙿 𝙰𝙳𝙼𝙸𝙽𝚂 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
        return;
    }
    if (hasProtectedTarget({ contextInfo, text, fallbackJid: m.key.participant || senderJid })) {
        await sock.sendMessage(sender, { text: '❌ You cannot unblock the owner.' }, { quoted: m });
        return;
    }
    await handleUnblock({ sock, m, text, sender, senderNumber, OWNER_NUMBER, botPhoneNumber, sleep, getContextInfo });
    return;
}

if (text.toLowerCase().startsWith('.limit')) {
    if (!isOwnerSenderNumber(senderNumber) && !isOwnerOrBotNumber(senderNumber)) {
        await sock.sendMessage(sender, { text: '❌ Only the owner or bot number can use .limit.' }, { quoted: m });
        return;
    }
    if (hasProtectedTarget({ contextInfo, text })) {
        await sock.sendMessage(sender, { text: '❌ You cannot change the usage limit for the owner or bot number.' }, { quoted: m });
        return;
    }
    await handleLimit({ sock, m, text, sender, senderNumber, OWNER_NUMBER, botPhoneNumber, sleep, getContextInfo });
    return;
}

		// 📊 .poll Command (Create interactive WhatsApp polls)
		if (/^\.poll(?:\s|$)/i.test(text.trim())) {
    if (!await isAdminActionAllowed(sock, sender, senderNumber, senderJid, m)) {
        await sock.sendMessage(sender, { text: '❌ Only group admins can use .poll.' }, { quoted: m });
        return;
    }
    const pollCommands = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (pollCommands.some((line) => !/^\.poll(?:\s|$)/i.test(line))) {
        await sock.sendMessage(sender, {
            text: '❌ Put each poll on its own line, and start every line with .poll.'
        }, { quoted: m });
        return;
    }

    for (const pollCommand of pollCommands) {
        await handlePollCommand({ sock, m, text: pollCommand, sender, sleep });
    }
    return;
}

		// 🧠 .trivia Command (Interactive Group Quiz Game)
		// 🧠 .trivia Command Trigger
if (text.toLowerCase() === '.trivia') {
    await handleTrivia({ sock, m, sender, text, sleep });
    return;
}

if (text.toLowerCase() === '.welcome on') {
    await handleWelcomeOn({ sock, m, sender, senderNumber, OWNER_NUMBER, botPhoneNumber, sleep });
    return;
}

if (text.toLowerCase() === '.welcome off') {
    await handleWelcomeOff({ sock, m, sender, senderNumber, OWNER_NUMBER, botPhoneNumber, sleep });
    return;
}

const antiLinkCommand = text.trim().toLowerCase();
if (antiLinkCommand === '.antilink on' || antiLinkCommand === '.antilink off') {
    if (!sender.endsWith('@g.us')) {
        await sock.sendMessage(sender, { text: '❌ Use .antilink on or .antilink off inside a group.' }, { quoted: m });
        return;
    }
    if (!isOwnerSenderNumber(senderNumber)) {
        await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳.' }, { quoted: m });
        return;
    }
    if (!isGroupAllowed(sender)) {
        await sock.sendMessage(sender, { text: '🛡️ This group is not enabled for anti-link automation.' }, { quoted: m });
        return;
    }
    const rateLimit = canUseCommand({ command: 'antilink', userId: senderJid, groupId: sender, cooldownMs: 120000 });
    if (!rateLimit.allowed) {
        await sock.sendMessage(sender, { text: `⏳ Please wait ${formatCooldownMessage(rateLimit.remaining)} before toggling anti-link again.` }, { quoted: m });
        return;
    }

    if (antiLinkCommand === '.antilink on') {
        enableAntiLink(sender);
        await sock.sendMessage(sender, { text: '✅ Anti-link enabled for this group.' }, { quoted: m });
    } else {
        disableAntiLink(sender);
        await sock.sendMessage(sender, { text: '✅ Anti-link disabled for this group.' }, { quoted: m });
    }
    return;
}

if (antiLinkCommand === '.antilink') {
    if (!sender.endsWith('@g.us')) {
        await sock.sendMessage(sender, { text: '❌ Anti-link settings are available inside a group.' }, { quoted: m });
        return;
    }
    const state = isAntiLinkEnabled(sender) ? 'enabled' : 'disabled';
    await sock.sendMessage(sender, { text: `ℹ️ Anti-link is ${state} for this group. Use .antilink on or .antilink off to change it.` }, { quoted: m });
    return;
}

        // 🗣️ Text-to-Speech Command Handler
if (text.toLowerCase().startsWith('.tts')) {
    if (!await isAdminActionAllowed(sock, sender, senderNumber, senderJid, m)) {
        await sock.sendMessage(sender, { text: '❌ Only group admins can use .tts.' }, { quoted: m });
        return;
    }
    await handleTTS(sock, m, text, sender, sleep);
    return;
}

        // Private Mode Switch
        if (text.toLowerCase() === '.private') {
            if (!isOwnerSenderNumber(senderNumber) && !isOwnerOrBotNumber(senderNumber)) {
                await sock.sendMessage(sender, { text: `❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳` });
                return;
            }
            isPrivate = true;
            await sleep(1000);
            await sock.sendMessage(sender, { text: "Prince Davis, I'm all yours now. 😁" });
            return;
        }

        // Public Mode Switch
        if (text.toLowerCase() === '.public') {
            if (!isOwnerSenderNumber(senderNumber) && !isOwnerOrBotNumber(senderNumber)) {
                await sock.sendMessage(sender, { text: `❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳` });
                return;
            }
            isPrivate = false;
            await sleep(1000);
            await sock.sendMessage(sender, { text: "🌍 Y'all have fun now. 🥲" });
            return;
        }

	if (text.toLowerCase() === '.restart') {
            if (!isOwnerSenderNumber(senderNumber) && !isOwnerOrBotNumber(senderNumber)) {
                await sock.sendMessage(sender, { text: `❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳` });
                return;
            }
            await sock.sendMessage(sender, {
                text: '🔄 Restarting the WhatsApp connection now. I will confirm when commands are ready.'
            }, { quoted: m });

            console.log('Restart requested by owner; reconnecting the WhatsApp socket.');
            global.whatsappConnection.status = 'restarting';
            void sock.end(new Error('WhatsApp restart requested by owner')).catch((error) => {
                console.error('Could not close the WhatsApp socket for restart:', error);
            });
            return;
        }

	if (text.toLowerCase() === '.kill') {
            if (!isOwnerSenderNumber(senderNumber) && !isOwnerOrBotNumber(senderNumber)) {
                await sock.sendMessage(sender, { text: `❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳` });
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
if (text.toLowerCase().startsWith('.tagall') || text.toLowerCase().startsWith('.everyone') || text.trim() === '📢') {
    if (!sender.endsWith('@g.us')) {
        await sock.sendMessage(sender, { text: '❌ Tagall only works inside a group.' }, { quoted: m });
        return;
    }
    if (!await isAdminActionAllowed(sock, sender, senderNumber, senderJid, m)) {
        await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
        return;
    }
    if (!isGroupAllowed(sender)) {
        await sock.sendMessage(sender, { text: '🛡️ This group is not enabled for tagall.' }, { quoted: m });
        return;
    }
    const rateLimit = canUseCommand({ command: 'tagall', userId: senderJid, groupId: sender, cooldownMs: 0 * 60 * 1000 });
    if (!rateLimit.allowed) {
        await sock.sendMessage(sender, { text: `⏳ Please wait ${formatCooldownMessage(rateLimit.remaining)} before using tagall again.` }, { quoted: m });
        return;
    }
    await handleTagAll(sock, m, text, sender, sleep);
    return;
}

        // .imagine / .image Command
       if (text.toLowerCase().startsWith('$img') || text.toLowerCase().startsWith('gen') || text.toLowerCase().startsWith('.imagine')) {
    await handleImagine({ sock, m, sender, text, sleep });
    return;
}

if (text.toLowerCase().startsWith('.alive')) {
    if (!isOwnerSenderNumber(senderNumber) && !isOwnerOrBotNumber(senderNumber)) {
        await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
        return;
    }
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

 if (!isOwnerSenderNumber(senderNumber)) {
                await sock.sendMessage(sender, { text: `❌ Access Denied! You're not the owner.` });
                return;
            }

    await handleQuoteToggle({ sock, m, sender, text, senderNumber, OWNER_NUMBER, botPhoneNumber, sleep });
    return;
}

// 🎵 Song Downloader Command (.song, .music, .mp3)
if (text.toLowerCase().startsWith('.song') || text.toLowerCase().startsWith('.music') || text.toLowerCase().startsWith('.vibe')) {
    await handleSong({ sock, m, sender, text, sleep });
    return;
}

if (text.toLowerCase().startsWith('.removebg') || text.toLowerCase().startsWith('.rbg')) {
    await handleRemoveBg({ sock, m, sender, sleep, getContextInfo });
    return;
}

if (text.toLowerCase() === '.toimg' || text.toLowerCase() === '.toimage' || text.toLowerCase().startsWith('.toimg')) {
    if (sender.endsWith('@g.us') && !isGroupAllowed(sender)) {
        await sock.sendMessage(sender, { text: '🛡️ This group is not enabled for sticker conversion actions.' }, { quoted: m });
        return;
    }
    const rateLimit = canUseCommand({ command: 'toimg', userId: senderJid, groupId: sender.endsWith('@g.us') ? sender : null, cooldownMs: 30000 });
    if (!rateLimit.allowed) {
        await sock.sendMessage(sender, { text: `⏳ Please wait ${formatCooldownMessage(rateLimit.remaining)} before using .toimg again.` }, { quoted: m });
        return;
    }
    await handleToImg({ sock, m, sender, sleep, getContextInfo });
    return;
}

if (text.toLowerCase() === '.list' || text.toLowerCase() === '.help' || text.toLowerCase() === '.h' || text.toLowerCase() === '.chat') {
    await handleMenu({ sock, m, sender, sleep });
    return;
}

if (text.toLowerCase().startsWith('.add') || text.toLowerCase().startsWith('.addmember')) {
    if (!await isAdminActionAllowed(sock, sender, senderNumber, senderJid, m)) {
        await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝙶𝚁𝙾𝚄𝙿 𝙰𝙳𝙼𝙸𝙽𝚂 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
        return;
    }
    if (hasProtectedTarget({ contextInfo, text, fallbackJid: m.key.participant || senderJid })) {
        await sock.sendMessage(sender, { text: 'The owner is in the chat already.' }, { quoted: m });
        return;
    }
    await handleAdd({ sock, m, sender, text, sleep });
    return;
}

if (text.toLowerCase().startsWith('.mylove')) {
    await handleMyLove({ sock, m, sender, senderNumber, senderJid, sleep, getContextInfo });
    return;
}

// 🚀 PLACE YOUR COMMAND TRIGGERS RIGHT AFTER
    if (text.toLowerCase() === '.vv' || text.toLowerCase() === '.antiviewonce') {
        if (!isOwnerSenderNumber(senderNumber) && !isOwnerOrBotNumber(senderNumber)) {
            await sock.sendMessage(sender, { text: '❌ Only the owner or bot number can use .vv.' }, { quoted: m });
            return;
        }
        await handleVV({ sock, m, sender, sleep, getContextInfo, OWNER_NUMBER });
        return;
    };

// 🔇 .mute Command (Group Admin Only)
		if (text.toLowerCase().startsWith('.mute')) {
            if (!await isAdminActionAllowed(sock, sender, senderNumber, senderJid, m)) {
                await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝙶𝚁𝙾𝚄𝙿 𝙰𝙳𝙼𝙸𝙽𝚂 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
                return;
            }
            if (hasProtectedTarget({ contextInfo, text, fallbackJid: m.key.participant || senderJid })) {
                await sock.sendMessage(sender, { text: '❌ You cannot mute the owner.' }, { quoted: m });
                return;
            }
			await handleMute({ sock, m, sender, text, sleep, senderJid });
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
            if (!await isAdminActionAllowed(sock, sender, senderNumber, senderJid, m)) {
                await sock.sendMessage(sender, { text: '❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.\n\n— 𝙾𝙽𝙻𝚈 𝙶𝚁𝙾𝚄𝙿 𝙰𝙳𝙼𝙸𝙽𝚂 𝙲𝙰𝙽 𝚄𝚂𝙴 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳' }, { quoted: m });
                return;
            }
            if (hasProtectedTarget({ contextInfo, text, fallbackJid: m.key.participant || senderJid })) {
                await sock.sendMessage(sender, { text: "❌ You could'nt mute the owner in the first place." }, { quoted: m });
                return;
            }
			await handleUnmute({ sock, m, sender, text, sleep, getContextInfo });
			return;
		}

		// 🎨 Sticker Command Handler
if (text.toLowerCase() === '.s' || text.toLowerCase().startsWith('.s ')) {
    if (sender.endsWith('@g.us') && !isGroupAllowed(sender)) {
        await sock.sendMessage(sender, { text: '🛡️ This group is not enabled for sticker creation.' }, { quoted: m });
        return;
    }
    const rateLimit = canUseCommand({ command: 'sticker', userId: senderJid, groupId: sender.endsWith('@g.us') ? sender : null, cooldownMs: 30000 });
    if (!rateLimit.allowed) {
        await sock.sendMessage(sender, { text: `⏳ Please wait ${formatCooldownMessage(rateLimit.remaining)} before using .s again.` }, { quoted: m });
        return;
    }
    await handleSticker(sock, m, text, sender, sleep);
    return;
}

        if (text.toLowerCase().startsWith('.welcome')) {
    if (!await isAdminActionAllowed(sock, sender, senderNumber, senderJid, m)) {
        await sock.sendMessage(sender, { text: '❌ Only group admins can use .welcome.' }, { quoted: m });
        return;
    }
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
            if (getCommandAccessMode() === 'admin' && !isOwnerSenderNumber(senderNumber)) {
                let senderIsAdmin = false;
                try {
                    senderIsAdmin = await isGroupAdmin(sock, sender, [senderJid, m.key.participantAlt].filter(Boolean));
                } catch (error) {
                    console.error('Failed to check group admin status for AI:', error);
                }

                if (!senderIsAdmin) {
                    await sock.sendMessage(sender, {
                        text: '🔒 Admin mode is enabled. Only group admins can use the bot.'
                    }, { quoted: m });
                    return;
                }
            }

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
        } catch (error) {
            console.error(`Failed to process WhatsApp message in ${m.key?.remoteJid || 'unknown chat'}:`, error);
        }
    }
    });

    messageHandlersReady = true;
    announceReady();
}

connectToWhatsApp().catch((error) => {
    console.error('WhatsApp startup failed. Check Upstash Redis configuration and connectivity:', error);
    process.exit(1);
});

app.get('/connection-status', (req, res) => {
    res.set('Cache-Control', 'no-store').json(global.whatsappConnection);
});

app.post('/owner-number', async (req, res) => {
    if (!isValidPairingSetupToken(req.body.setupToken)) {
        return res.status(403).send('Pairing setup is not authorized. Check this deployment\'s setup token.');
    }

    const separateOwnerNumber = String(req.body.ownerNumber || '').replace(/\D/g, '');
    if (separateOwnerNumber && !/^\d{7,15}$/.test(separateOwnerNumber)) {
        return res.status(400).send('Enter a valid owner number with country code.');
    }
    if (ENV_OWNER_NUMBER && separateOwnerNumber && separateOwnerNumber !== ENV_OWNER_NUMBER) {
        return res.status(409).send('OWNER_NUMBER in this Render deployment is authoritative. Update it in Render to change the owner.');
    }

    const ownerNumber = ENV_OWNER_NUMBER || separateOwnerNumber || OWNER_NUMBER || getSenderNumber(botJid);
    if (!ownerNumber) {
        return res.status(409).send('Pair the bot first or set OWNER_NUMBER in this deployment, then save the owner number.');
    }

    try {
        await saveOwnerNumber(ownerNumber);
        res.redirect('/qr');
    } catch (error) {
        console.error('Could not save owner number:', error);
        res.status(500).send('Could not save owner number to this deployment\'s Upstash database.');
    }
});

app.get('/', (req, res) => {
    res.send(`
        
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Fruktur:ital@0;1&family=Kavoon&family=Rubik+Dirt&family=Rubik+Doodle+Shadow&family=Rubik+Glitch&family=Rubik+Wet+Paint&display=swap"
        rel="stylesheet">
    
    <title>OG CORE</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px 20px;
            color: yellowgreen;
            background-attachment: fixed;
            background-image: linear-gradient(150deg, #0f172a, #1e1b4b); 312e81);
        }

        h2 {
            color: rgb(221, 187, 15);
            text-shadow: black 1px 1px;
            font-family: "Rubik Wet Paint", system-ui;
            font-weight: 1;
            font-size: 38px;
        }

        a{
            font-family: "Kavoon", system-ui;
            font-weight: 0.5;
        }

        p {
            color: rgb(19, 221, 150);
        }
        .container {
            max-width: 400px;
            margin: 0 auto;
        }
        .btn {
            display: block;
            margin: 15px 0;
            padding: 12px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
        }
        .btn-browser {
            background-color: #0088cc;
            color: white;
        }
        .btn-playstore {
            background-color: #24292e;
            color: white;
            font-size: 15px;
        }
    </style>
</head>
<body>

    <div class="container">
        <h2>OG CORE</h2>
                ${connectionStatusMarkup()}
      <!--  <p>If the app did not open, CapCut might not be installed on your device.</p> -->
        <br>
        
        <!-- Option 1: Open in the web browser -->
        <a href="https://og-core.onrender.com/qr" class="btn btn-browser">
            Click here to scan QR
        </a>
        
        <!-- Connect WhatsApp with Pairing Code -->
        <a href="https://og-core.onrender.com/pair" class="btn btn-playstore" target="_blank">
            Click here to get Pairing Code
        </a>
    </div>

</body>
</html>

        
       <!-- OGWBot is running smoothly 24/7! Go to /qr for QR code or /pair for pairing code. --> `); 
});

app.get('/qr', async (req, res) => {
    if (!global.latestQR) {
        return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Kavoon&family=Rubik+Wet+Paint&display=swap" rel="stylesheet">
                <title>OG CORE - WhatsApp Connection</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 50px 20px;
                        color: yellowgreen;
                        background-attachment: fixed;
                        background-image: linear-gradient(150deg, #0f172a, #1e1b4b);
                        margin: 0;
                    }
                    h2 {
                        color: rgb(221, 187, 15);
                        text-shadow: black 1px 1px;
                        font-family: "Rubik Wet Paint", system-ui;
                        font-size: 32px;
                        margin-bottom: 20px;
                    }
                    p {
                        color: rgb(19, 221, 150);
                        margin-top: 15px;
                        font-family: "Kavoon", system-ui;
                        font-size: 14px;
                    }
                    .container {
                        max-width: 400px;
                        margin: 0 auto;
                        padding: 30px;
                        background: rgba(30, 27, 75, 0.4);
                        border-radius: 12px;
                        border: 1px solid rgba(255,255,255,0.1);
                    }
                    .btn {
                        display: block;
                        margin: 15px 0;
                        padding: 12px;
                        border-radius: 8px;
                        background: #25D366;
                        color: white;
                        font-family: "Kavoon", system-ui;
                        font-weight: bold;
                        text-decoration: none;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>OG CORE</h2>
                    ${connectionStatusMarkup()}
                    ${ownerNumberSetupMarkup()}
                    <p>QR code is not available yet. Refresh this page or use a pairing code.</p>
                    <a href="/qr" class="btn">Refresh QR</a>
                    <a href="/pair" class="btn">Use pairing code</a>
                </div>
            </body>
            </html>`);
    }
    try {
        const qrImageURL = await qrcode.toDataURL(global.latestQR);
        res.send(`

                <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Fruktur:ital@0;1&family=Kavoon&family=Rubik+Dirt&family=Rubik+Doodle+Shadow&family=Rubik+Glitch&family=Rubik+Wet+Paint&display=swap" rel="stylesheet">
            <title>OG CORE - QR Scan</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 50px 20px;
                    color: yellowgreen;
                    background-attachment: fixed;
                    background-image: linear-gradient(150deg, #0f172a, #1e1b4b);
                    margin: 0;
                }
                h2 {
                    color: rgb(221, 187, 15);
                    text-shadow: black 1px 1px;
                    font-family: "Rubik Wet Paint", system-ui;
                    font-weight: 1;
                    font-size: 32px;
                    margin-bottom: 20px;
                }
                a {
                    font-family: "Kavoon", system-ui;
                    font-weight: 0.5;
                }
                p {
                    color: rgb(19, 221, 150);
                    margin-top: 15px;
                    font-family: "Kavoon", system-ui;
                    font-size: 14px;
                }
                .container {
                    max-width: 400px;
                    margin: 0 auto;
                    padding: 30px;
                    background: rgba(30, 27, 75, 0.4);
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .btn {
                    display: block;
                    margin: 15px 0;
                    padding: 12px;
                    border-radius: 8px;
                    background: #25D366;
                    color: white;
                    font-family: "Kavoon", system-ui;
                    font-weight: bold;
                    text-decoration: none;
                }
                .qr-image {
                    width: min(300px, 100%);
                    height: auto;
                    border: 5px solid #25D366;
                    border-radius: 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>OG CORE - QR Scan</h2>
                ${connectionStatusMarkup()}
                ${ownerNumberSetupMarkup()}
                <br>
                <img class="qr-image" src="${qrImageURL}" alt="QR Code" />
                <br>
                <a href="/qr" class="btn">Refresh QR</a>
                <a href="/pair" class="btn">Use pairing code</a>
            </div>
        </body>
        </html>

        <!--    <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h2>Scan this QR Code with WhatsApp</h2>
                <img src="${qrImageURL}" alt="WhatsApp QR Code" style="width: 300px; height: 300px; border: 5px solid #25D366; border-radius: 10px;" />
                <p>Refresh this page if it expires.</p>
            </div> -->
        `);
    } catch (err) {
        res.status(500).send('Error generating QR code image');
    }
});

// --- /pair ROUTE FOR PHONE NUMBER LINKING ---
global.pairingCode = null;

app.post('/pair', async (req, res) => {
    if (!isValidPairingSetupToken(req.body.setupToken)) {
        return res.status(403).send('Pairing setup is not authorized. Check the setup token configured for this deployment.');
    }

    const botNumber = String(req.body.phone || '').replace(/\D/g, '');
    const separateOwnerNumber = String(req.body.ownerNumber || '').replace(/\D/g, '');
    if (ENV_OWNER_NUMBER && separateOwnerNumber && separateOwnerNumber !== ENV_OWNER_NUMBER) {
        return res.status(409).send('OWNER_NUMBER in this Render deployment is authoritative. Update it in Render to change the owner.');
    }
    const ownerNumber = ENV_OWNER_NUMBER || separateOwnerNumber || OWNER_NUMBER || botNumber;
    if (!/^\d{7,15}$/.test(botNumber) || !/^\d{7,15}$/.test(ownerNumber)) {
        return res.status(400).send('Enter valid phone numbers with country codes.');
    }
    if (!global.activeSock) {
        return res.status(503).send('WhatsApp is still initializing. Refresh and try again shortly.');
    }

    try {
        const code = await global.activeSock.requestPairingCode(botNumber);
        await saveOwnerNumber(ownerNumber);
        global.whatsappConnection.status = 'awaiting-pairing';
        global.whatsappConnection.method = 'pairing code';

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Kavoon&family=Rubik+Wet+Paint&display=swap" rel="stylesheet">
                <title>OG CORE - Pairing Code</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 50px 20px;
                        color: yellowgreen;
                        background-attachment: fixed;
                        background-image: linear-gradient(150deg, #0f172a, #1e1b4b);
                        margin: 0;
                    }
                    h2 {
                        color: rgb(221, 187, 15);
                        text-shadow: black 1px 1px;
                        font-family: "Rubik Wet Paint", system-ui;
                        font-size: 28px;
                        margin-bottom: 15px;
                    }
                    p {
                        color: rgb(19, 221, 150);
                        font-size: 14px;
                        margin: 10px 0;
                        font-family: "Kavoon", system-ui;
                        text-align: left;
                    }
                    .container {
                        max-width: 420px;
                        margin: 0 auto;
                        padding: 30px;
                        background: rgba(30, 27, 75, 0.4);
                        border-radius: 12px;
                        border: 1px solid rgba(255,255,255,0.1);
                    }
                    .code-display {
                        font-size: 38px;
                        font-weight: bold;
                        letter-spacing: 4px;
                        background: #0f172a;
                        display: inline-block;
                        padding: 15px 20px;
                        border-radius: 10px;
                        color: rgb(221, 187, 15);
                        margin: 15px 0;
                        border: 1px dashed rgb(19, 221, 150);
                        font-family: monospace;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>OG CORE</h2>
                    ${connectionStatusMarkup()}
                    ${ownerNumberSetupMarkup()}
                    <h3 style="color: rgb(221, 187, 15); font-family: 'Kavoon'; margin-bottom: 5px;">Your Pairing Code:</h3>
                    <div class="code-display">${code?.match(/.{1,4}/g)?.join('-') || code}</div>
                    <p>1. Open WhatsApp on your phone.</p>
                    <p>2. Go to <b>Linked Devices</b> &gt; <b>Link a Device</b> &gt; <b>Link with phone number instead</b>.</p>
                    <p>3. Type this code in!</p>
                    <p>Owner controls are assigned to the configured owner number.</p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Pairing setup failed:', error);
        res.status(500).send('Could not generate the pairing code. Check the server logs and try again.');
    }
});

app.get('/pair', async (req, res) => {
    const phoneNumber = req.query.phone;

    if (phoneNumber) {
        return res.status(405).send('Submit pairing details using the protected pairing form.');
    }

    // 1. If phone number is not provided, show the form
    if (!phoneNumber) {
        return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Fruktur:ital@0;1&family=Kavoon&family=Rubik+Dirt&family=Rubik+Doodle+Shadow&family=Rubik+Glitch&family=Rubik+Wet+Paint&display=swap" rel="stylesheet">
                <title>OG CORE - Pairing Code</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 50px 20px;
                        color: yellowgreen;
                        background-attachment: fixed;
                        background-image: linear-gradient(150deg, #0f172a, #1e1b4b);
                        margin: 0;
                    }
                    h2 {
                        color: rgb(221, 187, 15);
                        text-shadow: black 1px 1px;
                        font-family: "Rubik Wet Paint", system-ui;
                        font-weight: 1;
                        font-size: 32px;
                        margin-bottom: 20px;
                    }
                    p {
                        color: rgb(19, 221, 150);
                        margin-top: 15px;
                        font-family: "Kavoon", system-ui;
                        font-size: 14px;
                    }
                    .container {
                        max-width: 400px;
                        margin: 0 auto;
                        padding: 30px;
                        background: rgba(30, 27, 75, 0.4);
                        border-radius: 12px;
                        border: 1px solid rgba(255,255,255,0.1);
                    }
                    label {
                        display: block;
                        color: rgb(19, 221, 150);
                        font-family: "Kavoon", system-ui;
                        text-align: left;
                        margin: 12px 0 6px;
                    }
                    input[type="text"],
                    input[type="tel"],
                    input[type="password"] {
                        padding: 12px;
                        font-size: 16px;
                        width: 100%;
                        border-radius: 8px;
                        border: 1px solid #475569;
                        background: #1e293b;
                        color: #fff;
                        box-sizing: border-box;
                        outline: none;
                        text-align: center;
                        margin-bottom: 15px;
                    }
                    input[type="text"]:focus,
                    input[type="tel"]:focus,
                    input[type="password"]:focus {
                        border-color: rgb(221, 187, 15);
                    }
                    button[type="submit"] {
                        padding: 12px 20px;
                        font-size: 16px;
                        background-color: #25D366;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        width: 100%;
                        font-weight: bold;
                        font-family: "Kavoon", system-ui;
                    }
                    button[type="submit"]:hover {
                        background-color: #20ba5a;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>OG CORE</h2>
                    ${connectionStatusMarkup()}
                    <form action="/pair" method="POST">
                        <label for="phone">Bot WhatsApp number</label>
                        <input type="tel" id="phone" name="phone" placeholder="e.g. 2348123456789" required autocomplete="tel" />
                        <label for="ownerNumber">Owner number (optional)</label>
                        <input type="tel" id="ownerNumber" name="ownerNumber" placeholder="Defaults to OWNER_NUMBER or bot number" autocomplete="tel" />
                        <label for="setupToken">Deployment setup token</label>
                        <input type="password" id="setupToken" name="setupToken" required autocomplete="off" />
                        <button type="submit">Get Code</button>
                    </form>
                    <p>Use country codes without a plus sign. Leave owner number blank to use OWNER_NUMBER; if unset, the paired bot number is used.</p>
                </div>
            </body>
            </html>
        `);
    }

    // 2. Check if active socket is ready
    if (!global.activeSock) {
        return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Rubik+Wet+Paint&display=swap" rel="stylesheet">
                <style>
                    body { text-align: center; padding: 50px; background: #0f172a; color: yellowgreen; font-family: sans-serif; }
                    h2 { color: rgb(221, 187, 15); font-family: "Rubik Wet Paint", system-ui; }
                </style>
            </head>
            <body>
                <div style="max-width: 400px; margin: 0 auto; padding: 30px; background: rgba(30, 27, 75, 0.4); border-radius: 12px;">
                    <h2>OG CORE</h2>
                    <p style="color: #ff4d4d; margin-top: 15px;">Bot socket is not initialized yet. Please wait a few seconds and refresh.</p>
                </div>
            </body>
            </html>
        `);
    }

    // 3. Request pairing code and display result
    try {
        const cleanedPhone = phoneNumber.replace(/[^0-9]/g, '');
        global.whatsappConnection.status = 'awaiting-pairing';
        global.whatsappConnection.method = 'pairing code';
        const code = await global.activeSock.requestPairingCode(cleanedPhone);
        
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Kavoon&family=Rubik+Wet+Paint&display=swap" rel="stylesheet">
                <title>OG CORE - Pairing Code</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 50px 20px;
                        color: yellowgreen;
                        background-attachment: fixed;
                        background-image: linear-gradient(150deg, #0f172a, #1e1b4b);
                        margin: 0;
                    }
                    h2 {
                        color: rgb(221, 187, 15);
                        text-shadow: black 1px 1px;
                        font-family: "Rubik Wet Paint", system-ui;
                        font-size: 28px;
                        margin-bottom: 15px;
                    }
                    p {
                        color: rgb(19, 221, 150);
                        font-size: 14px;
                        margin: 10px 0;
                        font-family: "Kavoon", system-ui;
                        text-align: left;
                    }
                    .container {
                        max-width: 420px;
                        margin: 0 auto;
                        padding: 30px;
                        background: rgba(30, 27, 75, 0.4);
                        border-radius: 12px;
                        border: 1px solid rgba(255,255,255,0.1);
                    }
                    .code-display {
                        font-size: 38px;
                        font-weight: bold;
                        letter-spacing: 4px;
                        background: #0f172a;
                        display: inline-block;
                        padding: 15px 20px;
                        border-radius: 10px;
                        color: rgb(221, 187, 15);
                        margin: 15px 0;
                        border: 1px dashed rgb(19, 221, 150);
                        font-family: monospace;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>OG CORE</h2>
                    ${connectionStatusMarkup()}
                    <h3 style="color: rgb(221, 187, 15); font-family: 'Kavoon'; margin-bottom: 5px;">Your Pairing Code:</h3>
                    <div class="code-display">
                        ${code?.match(/.{1,4}/g)?.join('-') || code}
                    </div>
                    <p>1. Open WhatsApp on your phone.</p>
                    <p>2. Go to <b>Linked Devices</b> &gt; <b>Link a Device</b> &gt; <b>Link with phone number instead</b>.</p>
                    <p>3. Type this code in!</p>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        console.error("Pairing code error:", err);
        res.status(500).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { text-align: center; padding: 50px; background: #0f172a; color: #ff4d4d; font-family: sans-serif; }
                </style>
            </head>
            <body>
                <div style="max-width: 400px; margin: 0 auto; padding: 30px; background: rgba(30, 27, 75, 0.4); border-radius: 12px;">
                    <h2>Error generating pairing code:</h2>
                    <p>${err.message}</p>
                </div>
            </body>
            </html>
        `);
    }
});

 /*app.get('/pair', async (req, res) => {
    const phoneNumber = req.query.phone;

    if (!phoneNumber) {
        return res.send(`

            <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Fruktur:ital@0;1&family=Kavoon&family=Rubik+Dirt&family=Rubik+Doodle+Shadow&family=Rubik+Glitch&family=Rubik+Wet+Paint&display=swap" rel="stylesheet">
            <title>OG CORE - Pairing Code</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 50px 20px;
                    color: yellowgreen;
                    background-attachment: fixed;
                    background-image: linear-gradient(150deg, #0f172a, #1e1b4b);
                    margin: 0;
                }
                h2 {
                    color: rgb(221, 187, 15);
                    text-shadow: black 1px 1px;
                    font-family: "Rubik Wet Paint", system-ui;
                    font-weight: 1;
                    font-size: 38px;
                }
                a, button {
                    font-family: "Kavoon", system-ui;
                    font-weight: 0.5;
                }
                p {
                    color: rgb(19, 221, 150);
                }
                .container {
                    max-width: 400px;
                    margin: 0 auto;
                }
                input[type="text"] {
                    width: 100%;
                    padding: 12px;
                    margin: 15px 0;
                    border-radius: 8px;
                    border: 1px solid #475569;
                    background: #1e293b;
                    color: #fff;
                    font-size: 16px;
                    box-sizing: border-box;
                    outline: none;
                    text-align: center;
                }
                .btn {
                    display: block;
                    width: 100%;
                    margin: 15px 0;
                    padding: 12px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                    border: none;
                    cursor: pointer;
                    font-size: 16px;
                }
                .btn-browser {
                    background-color: #0088cc;
                    color: white;
                }
                .btn-playstore {
                    background-color: #24292e;
                    color: white;
                    font-size: 15px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>OG CORE</h2>
                <p>Enter your WhatsApp phone number with country code (e.g. 2348123456789)</p>
                <br>
                <form action="/code" method="GET">
                    <input type="text" name="phone" placeholder="2348123456789" required autocomplete="off">
                    <button type="submit" class="btn btn-browser">Get Pairing Code</button>
                </form>
                <a href="/" class="btn btn-playstore">Back to Home</a>
            </div>
        </body>
        </html>
    `)
};

// Result page that generates and displays the code
app.get('/code', async (req, res) => {
    const phone = req.query.phone;
    let codeResultHTML = '';

    if (!phone) {
        codeResultHTML = '<p style="color: #ff4d4d;">Phone number is missing!</p>';
    } else {
        try {
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            if (typeof sock !== 'undefined' && sock.requestPairingCode) {
                let code = await sock.requestPairingCode(cleanPhone);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                codeResultHTML = `
                    <p>Your Pairing Code:</p>
                    <div style="background: #0f172a; padding: 15px; border-radius: 8px; font-size: 24px; font-family: monospace; color: rgb(221, 187, 15); font-weight: bold; letter-spacing: 2px; margin: 15px 0; border: 1px dashed rgb(19, 221, 150);">
                        ${code}
                    </div>
                `;
            } else {
                codeResultHTML = '<p style="color: #ff4d4d;">Bot socket is not ready yet. Try again shortly.</p>';
            }
        } catch (err) {
            codeResultHTML = `<p style="color: #ff4d4d;">Error: ${err.message}</p>`;
        }
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Fruktur:ital@0;1&family=Kavoon&family=Rubik+Dirt&family=Rubik+Doodle+Shadow&family=Rubik+Glitch&family=Rubik+Wet+Paint&display=swap" rel="stylesheet">
            <title>OG CORE - Your Code</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 50px 20px;
                    color: yellowgreen;
                    background-attachment: fixed;
                    background-image: linear-gradient(150deg, #0f172a, #1e1b4b);
                    margin: 0;
                }
                h2 {
                    color: rgb(221, 187, 15);
                    text-shadow: black 1px 1px;
                    font-family: "Rubik Wet Paint", system-ui;
                    font-weight: 1;
                    font-size: 38px;
                }
                a {
                    font-family: "Kavoon", system-ui;
                    font-weight: 0.5;
                }
                p {
                    color: rgb(19, 221, 150);
                }
                .container {
                    max-width: 400px;
                    margin: 0 auto;
                }
                .btn {
                    display: block;
                    margin: 15px 0;
                    padding: 12px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                }
                .btn-browser {
                    background-color: #0088cc;
                    color: white;
                }
                .btn-playstore {
                    background-color: #24292e;
                    color: white;
                    font-size: 15px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>OG CORE</h2>
                <br>
                ${codeResultHTML}
                <br>
                <a href="/pair" class="btn btn-browser">Try Another Number</a>
                <a href="/" class="btn btn-playstore">Back to Home</a>
            </div>
        </body>
        </html>

           <!-- <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h2>Generate WhatsApp Pairing Code</h2>
                <form action="/pair" method="GET">
                    <input type="text" name="phone" placeholder="e.g. 2348123456789" style="padding: 10px; font-size: 16px; width: 250px; border-radius: 5px; border: 1px solid #ccc;" required />
                    <button type="submit" style="padding: 10px 20px; font-size: 16px; background-color: #25D366; color: white; border: none; border-radius: 5px; cursor: pointer;">Get Code</button>
                </form>
                <p style="color: gray; margin-top: 15px;">Enter your phone number with country code (no + sign).</p>
            </div>
        `);
    }

    if (!global.activeSock) {
        return res.send(`<h2>Bot socket is not initialized yet. Please wait a few seconds and refresh.</h2>`);
    }

    try {
        const cleanedPhone = phoneNumber.replace(/[^0-9]/g, '');
        const code = await global.activeSock.requestPairingCode(cleanedPhone);
        
        res.send(`
            <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h2>Your WhatsApp Pairing Code:</h2>
                <div style="font-size: 48px; font-weight: bold; letter-spacing: 5px; background: #f0f0f0; display: inline-block; padding: 20px 30px; border-radius: 10px; color: #25D366; margin: 20px 0;">
                    ${code?.match(/.{1,4}/g)?.join('-') || code}
                </div>
                <p>1. Open WhatsApp on your phone.</p>
                <p>2. Go to <b>Linked Devices</b> > <b>Link a Device</b> > <b>Link with phone number instead</b>.</p>
                <p>3. Type this code in!</p>
            </div>
        `);
    } catch (err) {
        console.error("Pairing code error:", err);
        res.status(500).send(`<h2>Error generating pairing code: ${err.message}</h2>`);
    }
}); */

// 3. Listen on port (Must be the absolute last thing in the file)
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
