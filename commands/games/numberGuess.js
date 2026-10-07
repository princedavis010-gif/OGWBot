module.exports = {
    name: 'number',
    title: 'Number Guess',
    description: 'Race to guess a secret number from 1 to 100.',
    minPlayers: 2,
    help: 'Players: at least 2. Start with .game start number, let everyone join, then the host uses .game begin. The bot secretly picks a whole number from 1 to 100. Everyone who joined can guess with .game guess NUMBER. The bot says whether each guess is too high or low. The first correct guess wins and ends the game.',
    createState() {
        return { phase: 'lobby', secret: null, guesses: 0 };
    },
    begin(session) {
        session.game.secret = Math.floor(Math.random() * 100) + 1;
        session.game.guesses = 0;
        session.game.phase = 'playing';
        return { text: '🔢 Number Guess started. I picked a number from 1 to 100. Use .game guess NUMBER; first correct guess wins.' };
    },
    act(session, actor, action, args) {
        if (action !== 'guess') return null;
        if (session.game.phase !== 'playing') return { text: 'This round is not accepting guesses.' };
        const guess = Number(args[0]);
        if (!Number.isInteger(guess) || guess < 1 || guess > 100) return { text: 'Enter a whole number from 1 to 100.' };
        session.game.guesses += 1;
        if (guess === session.game.secret) {
            return { text: `🎯 ${actor.name} guessed ${guess} correctly in ${session.game.guesses} total guesses!`, done: true };
        }
        return { text: `${guess} is too ${guess < session.game.secret ? 'low' : 'high'}. ${session.game.guesses} guesses so far.` };
    },
    status(session) {
        return `Number Guess: ${session.game.phase}. Players: ${session.players.map((player) => player.name).join(', ')}. Guesses: ${session.game.guesses}.`;
    }
};
