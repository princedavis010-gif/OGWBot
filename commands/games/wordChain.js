module.exports = {
    name: 'word',
    title: 'Word Chain',
    description: 'Take turns naming unused words that start with the previous word’s last letter.',
    minPlayers: 2,
    help: 'Play with .game word WORD. Take turns; each word must start with the previous word’s final letter.',
    createState() {
        return { phase: 'lobby', turnIndex: 0, words: [], used: [], scores: {}, turns: 0, turnLimit: 20 };
    },
    begin(session) {
        session.game.phase = 'playing';
        session.game.turnIndex = 0;
        session.game.words = [];
        session.game.used = [];
        session.game.turns = 0;
        session.players.forEach((player) => { session.game.scores[player.id] = 0; });
        return { text: `🔤 Word Chain started. ${session.players[0].name} goes first. Use .game word WORD. Use plain A-Z words, no repeats.` };
    },
    act(session, actor, action, args) {
        if (action !== 'word') return null;
        if (session.game.phase !== 'playing') return { text: 'Word Chain is not accepting words right now.' };
        const expected = session.players[session.game.turnIndex];
        if (actor.id !== expected.id) return { text: `It is ${expected.name}’s turn.` };
        const word = String(args[0] || '').toLowerCase();
        if (!/^[a-z]{2,24}$/.test(word)) return { text: 'Enter one word using 2 to 24 letters A-Z.' };
        if (session.game.used.includes(word)) return { text: 'That word has already been used.' };
        const previous = session.game.words[session.game.words.length - 1];
        if (previous && word[0] !== previous[previous.length - 1]) {
            return { text: `That word must start with “${previous[previous.length - 1]}”. Try again.` };
        }

        session.game.used.push(word);
        session.game.words.push(word);
        session.game.scores[actor.id] += 1;
        session.game.turns += 1;
        session.game.turnIndex = (session.game.turnIndex + 1) % session.players.length;
        if (session.game.turns >= session.game.turnLimit) {
            session.game.phase = 'ended';
            const scoreboard = session.players.map((player) => `${player.name}: ${session.game.scores[player.id]}`).join('\n');
            return { text: `🏁 Word Chain finished after ${session.game.turnLimit} words.\n${scoreboard}`, done: true };
        }
        const next = session.players[session.game.turnIndex];
        return { text: `${actor.name}: ${word}. ${next.name} is next; their word must start with “${word[word.length - 1]}”.` };
    },
    status(session) {
        const lastWord = session.game.words[session.game.words.length - 1] || 'none';
        const next = session.players[session.game.turnIndex]?.name || 'none';
        return `Word Chain: ${session.game.phase}. Last word: ${lastWord}. Next player: ${next}. Words played: ${session.game.turns}/${session.game.turnLimit}.`;
    }
};
