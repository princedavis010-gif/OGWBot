const games = {
    mafia: require('./werewolf'),
    number: require('./numberGuess'),
    trivia: require('./trivia'),
    word: require('./wordChain')
};

const sessions = new Map();

function playerId(senderNumber, senderJid) {
    const number = String(senderNumber || '').replace(/\D/g, '');
    return number || String(senderJid || '').split('@')[0].split(':')[0];
}

function normalizeJid(jid) {
    return String(jid || '').replace(/:\d+(?=@)/, '');
}

function createPlayer({ id, senderJid, senderNumber, name, message }) {
    const number = String(senderNumber || '').replace(/\D/g, '');
    const phoneJid = /^\d{7,15}$/.test(number) ? `${number}@s.whatsapp.net` : '';
    const aliases = [senderJid, message.key?.participantAlt, phoneJid].filter(Boolean);
    return {
        id,
        number,
        name,
        jid: phoneJid || message.key?.participantAlt || senderJid,
        aliases
    };
}

function getPlayer(session, id) {
    return session.players.find((player) => player.id === id);
}

function usageText() {
    return [
        '🎮 GROUP GAMES',
        '.game list',
        '.game start mafia|number|trivia|word',
        '.game join',
        '.game begin',
        '.game status',
        '.game leave',
        '.game stop',
        'Game actions: .game vote @player, .game kill NUMBER (private), .game guess NUMBER, .game answer A-D, .game word WORD'
    ].join('\n');
}

async function sendPrivateMessages(sock, messages) {
    for (const message of messages || []) {
        try {
            await sock.sendMessage(message.jid, { text: message.text });
        } catch (error) {
            console.error('Could not send game role privately:', error.message);
        }
    }
}

async function applyResult(sock, sender, session, result, quoted) {
    if (result?.privateMessages) await sendPrivateMessages(sock, result.privateMessages);
    if (result?.text) await sock.sendMessage(sender, { text: result.text }, quoted ? { quoted } : undefined);
    if (result?.done) sessions.delete(session.groupId);
}

function createLobbyText(game, player) {
    return `${game.title} lobby opened by ${player.name}.\nJoin with .game join. Minimum players: ${game.minPlayers}. Host: .game begin`;
}

async function handlePrivateGameMessage({ sock, text, senderNumber, senderJid }) {
    const parts = text.trim().split(/\s+/);
    if (parts.length !== 3 || parts[0].toLowerCase() !== '.game' || parts[1].toLowerCase() !== 'kill') return false;

    const id = playerId(senderNumber, senderJid);
    const targetNumber = parts[2].replace(/\D/g, '');
    if (!targetNumber) return true;

    const session = Array.from(sessions.values()).find((entry) => entry.gameName === 'mafia' && entry.game.phase === 'night' && getPlayer(entry, id));
    if (!session) return false;

    const actor = getPlayer(session, id);
    const result = games.mafia.kill(session, actor, targetNumber);
    if (result) await applyResult(sock, session.groupId, session, result);
    return true;
}

async function handleGameMessage({ sock, m, sender, text, senderNumber, senderJid, contextInfo }) {
    const parts = String(text || '').trim().split(/\s+/).filter(Boolean);
    const subcommand = (parts[1] || '').toLowerCase();
    const actorId = playerId(senderNumber, senderJid);
    const isGroup = sender.endsWith('@g.us');

    if (!isGroup) {
        const handled = await handlePrivateGameMessage({ sock, text, senderNumber, senderJid });
        if (!handled) {
            await sock.sendMessage(sender, { text: 'Game setup uses a group chat. Mafia players send `.game kill NUMBER` here in private.' }, { quoted: m });
        }
        return;
    }

    if (subcommand === 'list') {
        const lines = Object.values(games).map((game) => `${game.name}: ${game.description}`);
        await sock.sendMessage(sender, { text: `Available games:\n${lines.join('\n')}\n\nStart one with .game start <name>.` }, { quoted: m });
        return;
    }

    if (subcommand === 'start') {
        const gameName = (parts[2] || '').toLowerCase();
        const game = games[gameName];
        if (!game) {
            await sock.sendMessage(sender, { text: 'Choose a game: mafia, number, trivia, or word. Use .game list for details.' }, { quoted: m });
            return;
        }
        if (sessions.has(sender)) {
            await sock.sendMessage(sender, { text: 'A game is already active in this group. Use .game status or .game stop.' }, { quoted: m });
            return;
        }

        const host = createPlayer({ id: actorId, senderJid, senderNumber, name: m.pushName || 'Host', message: m });
        const session = {
            groupId: sender,
            gameName,
            hostId: actorId,
            players: [host],
            game: game.createState()
        };
        sessions.set(sender, session);
        await sock.sendMessage(sender, { text: createLobbyText(game, host) }, { quoted: m });
        return;
    }

    const session = sessions.get(sender);
    if (!session) {
        await sock.sendMessage(sender, { text: 'No game is active here. Start one with .game start <name>.' }, { quoted: m });
        return;
    }

    const game = games[session.gameName];
    const actor = getPlayer(session, actorId);

    if (subcommand === 'join') {
        if (session.game.phase !== 'lobby') {
            await sock.sendMessage(sender, { text: 'This game has already started.' }, { quoted: m });
            return;
        }
        if (actor) {
            await sock.sendMessage(sender, { text: 'You already joined this lobby.' }, { quoted: m });
            return;
        }
        session.players.push(createPlayer({ id: actorId, senderJid, senderNumber, name: m.pushName || 'Player', message: m }));
        await sock.sendMessage(sender, { text: `${m.pushName || 'Player'} joined ${game.title}. Players: ${session.players.length}.` }, { quoted: m });
        return;
    }

    if (subcommand === 'leave') {
        if (session.game.phase !== 'lobby') {
            await sock.sendMessage(sender, { text: 'You can only leave before the game begins.' }, { quoted: m });
            return;
        }
        if (!actor) {
            await sock.sendMessage(sender, { text: 'You are not in this lobby.' }, { quoted: m });
            return;
        }
        session.players = session.players.filter((player) => player.id !== actorId);
        if (!session.players.length) {
            sessions.delete(sender);
            await sock.sendMessage(sender, { text: 'The empty lobby was closed.' }, { quoted: m });
            return;
        }
        if (session.hostId === actorId) session.hostId = session.players[0].id;
        await sock.sendMessage(sender, { text: `${m.pushName || 'Player'} left. Players: ${session.players.length}.` }, { quoted: m });
        return;
    }

    if (subcommand === 'stop') {
        if (actorId !== session.hostId) {
            await sock.sendMessage(sender, { text: 'Only the game host can stop this game.' }, { quoted: m });
            return;
        }
        sessions.delete(sender);
        await sock.sendMessage(sender, { text: `${game.title} has been stopped.` }, { quoted: m });
        return;
    }

    if (subcommand === 'status') {
        await sock.sendMessage(sender, { text: game.status(session) }, { quoted: m });
        return;
    }

    if (subcommand === 'begin') {
        if (actorId !== session.hostId) {
            await sock.sendMessage(sender, { text: 'Only the game host can start the game.' }, { quoted: m });
            return;
        }
        if (session.players.length < game.minPlayers) {
            await sock.sendMessage(sender, { text: `${game.title} needs at least ${game.minPlayers} players. Current players: ${session.players.length}.` }, { quoted: m });
            return;
        }
        const result = game.begin(session);
        await applyResult(sock, sender, session, result, m);
        return;
    }

    if (!actor) {
        await sock.sendMessage(sender, { text: 'Join the game first with .game join.' }, { quoted: m });
        return;
    }

    const targetJid = contextInfo?.mentionedJid?.[0] || '';
    const normalizedTargetJid = normalizeJid(targetJid);
    const mentionedPlayer = targetJid && session.players.find((player) =>
        player.aliases.some((alias) => normalizeJid(alias) === normalizedTargetJid)
    );
    const targetNumber = mentionedPlayer?.number || (targetJid ? targetJid.split('@')[0].split(':')[0] : (parts[2] || '').replace(/\D/g, ''));
    const result = game.act(session, actor, subcommand, parts.slice(2), targetNumber);
    if (!result) {
        await sock.sendMessage(sender, { text: game.help }, { quoted: m });
        return;
    }
    await applyResult(sock, sender, session, result, m);
}

module.exports = { handleGameMessage };
