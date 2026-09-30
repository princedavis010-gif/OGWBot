// utils/mutedStorage.js
// Stores muted user JIDs per group JID: Map<groupJid, Set<userJid>>
const mutedGroups = new Map();

function muteUser(groupJid, userJid) {
    if (!mutedGroups.has(groupJid)) {
        mutedGroups.set(groupJid, new Set());
    }
    mutedGroups.get(groupJid).add(userJid);
}

function unmuteUser(groupJid, userJid) {
    if (mutedGroups.has(groupJid)) {
        mutedGroups.get(groupJid).delete(userJid);
    }
}

function isUserMuted(groupJid, userJid) {
    if (!mutedGroups.has(groupJid)) return false;
    return mutedGroups.get(groupJid).has(userJid);
}

module.exports = { muteUser, unmuteUser, isUserMuted };