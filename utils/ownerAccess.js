function matchesOwnerNumber(senderNumber, ownerNumber, botNumber) {
    if (!senderNumber || senderNumber === 'unknown') return false;
    return senderNumber === ownerNumber || Boolean(botNumber && senderNumber === botNumber);
}

module.exports = { matchesOwnerNumber };