const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../data/welcomeGroups.json');

if (!fs.existsSync(path.dirname(dataFile))) {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
}

let db = { enabledGroups: [] };

if (fs.existsSync(dataFile)) {
    try {
        db = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    } catch (e) {
        console.error("Failed to load welcomeGroups.json", e);
    }
}

function saveData() {
    fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
}

function isWelcomeEnabled(groupId) {
    return db.enabledGroups.includes(groupId);
}

function enableWelcome(groupId) {
    if (!db.enabledGroups.includes(groupId)) {
        db.enabledGroups.push(groupId);
        saveData();
    }
}

function disableWelcome(groupId) {
    db.enabledGroups = db.enabledGroups.filter(g => g !== groupId);
    saveData();
}

module.exports = { isWelcomeEnabled, enableWelcome, disableWelcome };