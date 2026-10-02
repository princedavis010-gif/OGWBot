const cooldowns = new Map();

function normalizeGroupOrUser(value) {
    return String(value || '').trim().toLowerCase();
}

function getAllowlist() {
    const raw = String(process.env.ALLOWED_GROUPS || '').trim();
    if (!raw) return new Set();
    return new Set(raw.split(',').map((item) => normalizeGroupOrUser(item)).filter(Boolean));
}

function isGroupAllowed(groupJid) {
    const allowlist = getAllowlist();
    if (allowlist.size === 0) return true;
    return allowlist.has(normalizeGroupOrUser(groupJid));
}

function canUseCommand({ command, userId, groupId, cooldownMs }) {
    const normalizedCommand = String(command || '').trim().toLowerCase();
    const key = groupId
        ? `group:${normalizeGroupOrUser(groupId)}:${normalizedCommand}`
        : `user:${normalizeGroupOrUser(userId)}:${normalizedCommand}`;

    const now = Date.now();
    const lastUsed = cooldowns.get(key) || 0;
    const effectiveCooldown = Number(cooldownMs) || 30000;
    const remaining = lastUsed ? effectiveCooldown - (now - lastUsed) : 0;

    if (lastUsed && remaining > 0) {
        return {
            allowed: false,
            remaining: Math.max(0, remaining),
            retryAt: lastUsed + effectiveCooldown,
            key
        };
    }

    cooldowns.set(key, now);
    return {
        allowed: true,
        remaining: 0,
        retryAt: now + effectiveCooldown,
        key
    };
}

function formatCooldownMessage(ms) {
    const seconds = Math.max(1, Math.ceil(ms / 1000));
    return `${seconds}s`;
}

module.exports = {
    isGroupAllowed,
    canUseCommand,
    formatCooldownMessage,
    getAllowlist
};
