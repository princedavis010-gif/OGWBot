const fs = require('fs');
const path = require('path');

const dataDirectory = process.env.BOT_DATA_DIR
    ? path.resolve(process.env.BOT_DATA_DIR)
    : path.join(__dirname, '../data');
const dataFile = path.join(dataDirectory, 'antiLinkGroups.json');
let db = { enabledGroups: [] };

if (fs.existsSync(dataFile)) {
    try {
        const savedData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        db.enabledGroups = Array.isArray(savedData.enabledGroups) ? savedData.enabledGroups : [];
    } catch (error) {
        console.error('Failed to load antiLinkGroups.json:', error);
    }
}

function saveData() {
    fs.mkdirSync(dataDirectory, { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
}

function isAntiLinkEnabled(groupId) {
    return db.enabledGroups.includes(groupId);
}

function enableAntiLink(groupId) {
    if (!db.enabledGroups.includes(groupId)) {
        db.enabledGroups.push(groupId);
        saveData();
    }
}

function disableAntiLink(groupId) {
    db.enabledGroups = db.enabledGroups.filter((enabledGroup) => enabledGroup !== groupId);
    saveData();
}

module.exports = { isAntiLinkEnabled, enableAntiLink, disableAntiLink };