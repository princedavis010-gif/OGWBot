const fs = require('fs');
const path = require('path');

const commandNames = new Set([
    'add', 'admin', 'alive', 'antilink', 'antiviewonce', 'block', 'chat', 'death', 'demote',
    'dare', 'everyone', 'flirt', 'flirty', 'group', 'h', 'imagine', 'kick',
    'life', 'limit', 'list', 'lock', 'music', 'mylove', 'mute', 'off', 'on', 'pickuplines',
    'poll', 'promote', 'public', 'private', 'quote', 'rbg', 'removelimit',
    'removebg', 'restart', 's', 'scr', 'st', 'status', 'tagall', 'toimage', 'toimg',
    'trivia', 'tts', 'unblock', 'unlimit', 'unlock', 'unmute', 'vibe', 'welcome',
    'everyone', 'song', 'taker', 'sticker', 'truth', 'flog', 'kill'
]);

const commandAliases = {
    addmember: 'add',
    everyone: 'tagall',
    flirty: 'flirt',
    help: 'list',
    h: 'list',
    chat: 'list',
    music: 'song',
    pickuplines: 'flirt',
    rbg: 'removebg',
    removelimit: 'unlimit',
    s: 'sticker',
    st: 'taker',
    toimage: 'toimg',
    vibe: 'song',
    life: 'quote',
    death: 'quote'
};

const dataDirectory = process.env.BOT_DATA_DIR
    ? path.resolve(process.env.BOT_DATA_DIR)
    : path.join(__dirname, '../data');
const dataFile = path.join(dataDirectory, 'commandAccess.json');
let settings = { mode: 'group', commandModes: {} };

if (fs.existsSync(dataFile)) {
    try {
        const savedSettings = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        settings = {
            mode: savedSettings.mode === 'admin' ? 'admin' : 'group',
            commandModes: savedSettings.commandModes && typeof savedSettings.commandModes === 'object'
                ? savedSettings.commandModes
                : {}
        };
    } catch (error) {
        console.error('Failed to load commandAccess.json:', error);
    }
}

function saveSettings() {
    fs.mkdirSync(dataDirectory, { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(settings, null, 2));
}

function normalizeCommand(token) {
    const name = token.toLowerCase().replace(/^\./, '');
    return commandAliases[name] || (commandNames.has(name) ? name : null);
}

function resolveCommandName(text) {
    const normalized = text.trim().toLowerCase();
    if (!normalized) return null;

    if (normalized.startsWith('.')) {
        return normalizeCommand(normalized.split(/\s+/, 1)[0]);
    }

    if (normalized === 't') return 'truth';
    if (normalized === 'd') return 'dare';
    if (normalized === 'broo') return 'antiviewonce';
    if (normalized === 'i want it') return 'taker';
    if (normalized.startsWith('play me')) return 'song';
    if (normalized.startsWith('custom..')) return 'flog';
    if (normalized.startsWith('$img') || normalized.startsWith('gen')) return 'imagine';

    return null;
}

function parseAccessChange(text) {
    const match = text.trim().match(/^(\.[a-z][a-z0-9_-]*)\s+\.(self|public)$/i);
    if (!match) return null;

    const command = normalizeCommand(match[1]);
    if (command === 'admin' || command === 'group') return null;
    return command ? { command, mode: match[2].toLowerCase() } : null;
}

function hasChainedDotCommands(text) {
    if (!text.trim().startsWith('.')) return false;
    if (parseAccessChange(text)) return false;

    return text.trim().split(/\s+/).slice(1).some((token) => /^\.[a-z][a-z0-9_-]*$/i.test(token));
}

function getMode() {
    return settings.mode;
}

function setMode(mode) {
    settings.mode = mode === 'admin' ? 'admin' : 'group';
    saveSettings();
}

function isSelfOnly(command) {
    return settings.commandModes[command] === 'self';
}

function setCommandMode(command, mode) {
    if (mode === 'self') {
        settings.commandModes[command] = 'self';
    } else {
        delete settings.commandModes[command];
    }
    saveSettings();
}

module.exports = {
    getMode,
    hasChainedDotCommands,
    isSelfOnly,
    parseAccessChange,
    resolveCommandName,
    setCommandMode,
    setMode
};