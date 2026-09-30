const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../data/userControl.json');

// Ensure data folder exists
if (!fs.existsSync(path.dirname(dataFile))) {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
}

// Load data or initialize defaults
let db = {
    blacklist: [],   // Array of blocked numbers/JIDs
    limits: {},      // { number: maxAllowedUses }
    usage: {}        // { number: currentUsageCount }
};

if (fs.existsSync(dataFile)) {
    try {
        db = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    } catch (e) {
        console.error("Failed to load userControl.json", e);
    }
}

function saveData() {
    fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
}

// Check if a number is completely blocked
function isBlacklisted(number) {
    return db.blacklist.includes(number);
}

// Check usage limits
function checkAndIncrementUsage(number, ownerNumber) {
    if (number === ownerNumber) return { allowed: true }; // Owner has no limits

    // Check if a limit is set for this user
    if (db.limits[number] !== undefined) {
        const maxLimit = db.limits[number];
        const currentUsage = db.usage[number] || 0;

        if (currentUsage >= maxLimit) {
            return { allowed: false, limit: maxLimit, current: currentUsage };
        }

        // Increment usage
        db.usage[number] = currentUsage + 1;
        saveData();
    }

    return { allowed: true };
}

// Management functions for owner
function blockUser(number) {
    if (!db.blacklist.includes(number)) {
        db.blacklist.push(number);
        saveData();
    }
}

function unblockUser(number) {
    db.blacklist = db.blacklist.filter(n => n !== number);
    saveData();
}

function setUserLimit(number, maxUses) {
    db.limits[number] = parseInt(maxUses);
    saveData();
}

function removeUserLimit(number) {
    delete db.limits[number];
    delete db.usage[number];
    saveData();
}

module.exports = {
    isBlacklisted,
    checkAndIncrementUsage,
    blockUser,
    unblockUser,
    setUserLimit,
    removeUserLimit
};