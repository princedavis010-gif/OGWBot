const questions = [
    { question: 'Which planet is known as the Red Planet?', options: ['Earth', 'Mars', 'Venus', 'Jupiter'], answer: 1 },
    { question: 'How many sides does a hexagon have?', options: ['Five', 'Six', 'Seven', 'Eight'], answer: 1 },
    { question: 'Which ocean is the largest?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3 },
    { question: 'What is the chemical symbol for gold?', options: ['Ag', 'Au', 'Gd', 'Go'], answer: 1 },
    { question: 'Which sport uses a shuttlecock?', options: ['Tennis', 'Badminton', 'Squash', 'Table tennis'], answer: 1 },
    { question: 'What is the capital of Japan?', options: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'], answer: 2 },
    { question: 'How many minutes are in two hours?', options: ['100', '110', '120', '140'], answer: 2 },
    { question: 'Which animal is the largest mammal?', options: ['Elephant', 'Blue whale', 'Giraffe', 'Orca'], answer: 1 },
    { question: 'What is the opposite of the word “ancient”?', options: ['Old', 'Historic', 'Modern', 'Early'], answer: 2 },
    { question: 'Which instrument has keys, pedals, and strings?', options: ['Flute', 'Piano', 'Drum', 'Trumpet'], answer: 1 }
];

function questionText(state) {
    const item = state.current;
    return `🧠 Round ${state.round}/${state.roundLimit}: ${item.question}\n${item.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join('\n')}\nAnswer with .game answer A, B, C, or D.`;
}

function scoreText(session) {
    return session.players
        .map((player) => `${player.name}: ${session.game.scores[player.id] || 0}`)
        .sort((a, b) => Number(b.split(': ')[1]) - Number(a.split(': ')[1]))
        .join('\n');
}

module.exports = {
    name: 'trivia',
    title: 'Trivia',
    description: 'Answer multiple-choice questions; scores are tracked for joined players.',
    minPlayers: 1,
    help: 'Answer the current question with .game answer A, .game answer B, .game answer C, or .game answer D.',
    createState() {
        return { phase: 'lobby', round: 0, roundLimit: 5, current: null, used: [], scores: {}, answered: {} };
    },
    begin(session) {
        session.players.forEach((player) => { session.game.scores[player.id] = 0; });
        session.game.phase = 'playing';
        return this.nextQuestion(session);
    },
    nextQuestion(session) {
        if (session.game.round >= session.game.roundLimit) {
            session.game.phase = 'ended';
            return { text: `🏁 Trivia finished! Final scores:\n${scoreText(session)}`, done: true };
        }
        const unused = questions.map((_, index) => index).filter((index) => !session.game.used.includes(index));
        const questionIndex = unused[Math.floor(Math.random() * unused.length)];
        session.game.used.push(questionIndex);
        session.game.current = questions[questionIndex];
        session.game.round += 1;
        session.game.answered = {};
        return { text: questionText(session.game) };
    },
    act(session, actor, action, args) {
        if (action !== 'answer') return null;
        if (session.game.phase !== 'playing') return { text: 'Trivia is not accepting answers right now.' };
        if (session.game.answered[actor.id]) return { text: 'Your answer for this round is already recorded.' };
        const answer = String(args[0] || '').toUpperCase();
        if (!/^[A-D]$/.test(answer)) return { text: 'Choose A, B, C, or D.' };
        const answerIndex = answer.charCodeAt(0) - 65;
        session.game.answered[actor.id] = true;
        const correct = answerIndex === session.game.current.answer;
        if (correct) session.game.scores[actor.id] += 1;
        const response = `${actor.name}: ${correct ? 'correct!' : 'not quite.'} Current score: ${session.game.scores[actor.id]}.`;
        if (session.players.every((player) => session.game.answered[player.id])) {
            const next = this.nextQuestion(session);
            return { text: `${response}\n\n${next.text}`, done: next.done };
        }
        return { text: `${response} Waiting for ${session.players.filter((player) => !session.game.answered[player.id]).map((player) => player.name).join(', ')}.` };
    },
    status(session) {
        return `Trivia: ${session.game.phase}, round ${session.game.round}/${session.game.roundLimit}. Scores:\n${scoreText(session)}`;
    }
};
