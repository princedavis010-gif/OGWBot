function alivePlayers(session) {
    return session.players.filter((player) => !session.game.dead.includes(player.id));
}

function endState(session) {
    const alive = alivePlayers(session);
    const mafiaAlive = alive.filter((player) => session.game.roles[player.id] === 'mafia').length;
    const townAlive = alive.length - mafiaAlive;
    if (mafiaAlive === 0) return '🎉 Town wins. The mafia has been found.';
    if (mafiaAlive >= townAlive) return '🌙 Mafia wins. The town can no longer outvote them.';
    return null;
}

function beginNight(session) {
    session.game.phase = 'night';
    session.game.votes = {};
    const mafia = alivePlayers(session).find((player) => session.game.roles[player.id] === 'mafia');
    return {
        text: '🌙 Night falls. The mafia member has 60 seconds to privately send `.game kill NUMBER` to the bot, using a living player’s phone number. Roles stay private.',
        privateMessages: mafia ? [{ jid: mafia.jid, text: `You are the Mafia. Privately send .game kill NUMBER to choose a living player. Do not include spaces or punctuation in the phone number.` }] : []
    };
}

module.exports = {
    name: 'mafia',
    title: 'Mafia / Werewolf',
    description: 'Secret mafia role, private night elimination, group daytime vote. Roles are sent privately.',
    minPlayers: 4,
    help: `           
                  GAME RULES: Mafia / Werewolf\n\n
Minimum players: 4\n
Start with .game start mafia, let everyone join with .game join, then the host uses .game begin. The bot privately assigns one Mafia and Town roles to the others.\n
At night, Mafia privately messages the bot ".game kill NUMBER" using a living player’s full phone number. In the day, every living player can vote once with .game vote @player.\n
The vote resolves after all living players vote; a tie eliminates nobody. Roles are revealed when a player is eliminated.\n
Town wins by eliminating Mafia; Mafia wins when Mafia equals or outnumbers Town.`,
    createState() {
        return { phase: 'lobby', roles: {}, dead: [], votes: {}, round: 0 };
    },
    begin(session) {
        const mafiaIndex = Math.floor(Math.random() * session.players.length);
        session.players.forEach((player, index) => {
            session.game.roles[player.id] = index === mafiaIndex ? 'mafia' : 'town';
        });
        session.game.dead = [];
        session.game.round = 1;
        const messages = session.players.map((player) => ({
            jid: player.jid,
            text: session.game.roles[player.id] === 'mafia'
                ? 'Your secret role is MAFIA. At night, privately send `.game kill NUMBER` to the bot, replacing NUMBER with a living player phone number.'
                : 'Your secret role is TOWN. Discuss as a group and use `.game vote @player` during the day.'
        }));
        const night = beginNight(session);
        return { text: `🎭 Roles were sent privately. Do not reveal yours. ${night.text}`, privateMessages: messages };
    },
    kill(session, actor, targetNumber) {
        if (session.game.phase !== 'night') return { text: 'It is not night right now.' };
        if (session.game.roles[actor.id] !== 'mafia') return { text: 'Only the Mafia can make the night choice.' };
        const target = alivePlayers(session).find((player) => player.number === targetNumber || player.id === targetNumber);
        if (!target || target.id === actor.id) return { text: 'Choose a different living player by their full phone number.' };
        session.game.dead.push(target.id);
        const ending = endState(session);
        if (ending) {
            return { text: `☀️ Morning: ${target.name} was eliminated overnight. Their role was ${session.game.roles[target.id].toUpperCase()}.\n${ending}`, done: true };
        }
        session.game.phase = 'day';
        session.game.votes = {};
        return { text: `☀️ Morning: ${target.name} was eliminated overnight. Their role was ${session.game.roles[target.id].toUpperCase()}. Discuss, then vote with .game vote @player.` };
    },
    act(session, actor, action, args, targetNumber) {
        if (action !== 'vote') return null;
        if (session.game.phase !== 'day') return { text: 'Voting is only open during the day.' };
        if (session.game.dead.includes(actor.id)) return { text: 'Eliminated players cannot vote.' };
        const target = alivePlayers(session).find((player) => player.number === targetNumber || player.id === targetNumber);
        if (!target || target.id === actor.id) return { text: 'Mention a different living player to vote against.' };
        if (session.game.votes[actor.id]) return { text: 'You already voted this day.' };
        session.game.votes[actor.id] = target.id;

        const alive = alivePlayers(session);
        if (alive.some((player) => !session.game.votes[player.id])) {
            return { text: `Vote recorded for ${target.name}. ${Object.keys(session.game.votes).length}/${alive.length} votes received.` };
        }

        const counts = new Map();
        Object.values(session.game.votes).forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
        const highest = Math.max(...counts.values());
        const leaders = Array.from(counts.entries()).filter(([, count]) => count === highest);
        let resultText;
        if (leaders.length > 1) {
            resultText = 'The vote is tied. Nobody was eliminated.';
        } else {
            const eliminated = session.players.find((player) => player.id === leaders[0][0]);
            session.game.dead.push(eliminated.id);
            resultText = `${eliminated.name} was eliminated by the vote. Their role was ${session.game.roles[eliminated.id].toUpperCase()}.`;
        }

        const ending = endState(session);
        if (ending) return { text: `🗳️ ${resultText}\n${ending}`, done: true };
        session.game.round += 1;
        const nextNight = beginNight(session);
        return { text: `🗳️ ${resultText}\n${nextNight.text}`, privateMessages: nextNight.privateMessages };
    },
    status(session) {
        const alive = alivePlayers(session);
        const dead = session.players.filter((player) => session.game.dead.includes(player.id));
        return `Mafia / Werewolf: ${session.game.phase}. Round ${session.game.round}. Alive: ${alive.map((player) => player.name).join(', ') || 'none'}. Eliminated: ${dead.map((player) => player.name).join(', ') || 'none'}.`;
    }
};
