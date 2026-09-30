// 🧠 Shared activeTrivia storage so index.js can check user answers
const activeTrivia = new Map();

async function handleTrivia({ sock, m, sender, text, sleep }) {
    const chatId = m.key.remoteJid;
    const targetId = chatId || sender;

    if (!targetId.endsWith('@g.us')) {
        await sleep(1000);
        await sock.sendMessage(targetId, { text: "❌ Trivia can only be played inside a WhatsApp group!" });
        return;
    }

    if (activeTrivia.has(targetId)) {
        await sleep(1000);
        await sock.sendMessage(targetId, { text: "⚠️ There's already an active trivia question in this group! Answer it first." }, { quoted: m });
        return;
    }

    try {
        await sleep(1000);
        await sock.sendMessage(targetId, { text: "🧠 Fetching a fresh trivia question..." });

        // Fetch from Open Trivia Database API
        const res = await fetch('https://opentdb.com/api.php?amount=1&type=multiple');
        const data = await res.json();
        
        if (!data.results || data.results.length === 0) throw new Error("API failed");

        const qData = data.results[0];
        
        // Helper to decode HTML entities from API
        const decodeHtml = (html) => html.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&eacute;/g, 'é');

        const question = decodeHtml(qData.question);
        const correctAnswer = decodeHtml(qData.correct_answer);
        const incorrectAnswers = qData.incorrect_answers.map(decodeHtml);

        // Combine and shuffle options
        const options = [...incorrectAnswers, correctAnswer];
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }

        const correctIndex = options.indexOf(correctAnswer);
        const letters = ['A', 'B', 'C', 'D'];
        const correctLetter = letters[correctIndex];

        let triviaText = `🧠 *TRIVIA TIME* 🧠\n\n*Question:* ${question}\n\n`;
        options.forEach((opt, idx) => {
            triviaText += `*${letters[idx]}.* ${opt}\n`;
        });
        triviaText += `\n_Reply with the correct letter (A, B, C, or D) to win!_`;

        activeTrivia.set(targetId, {
            correctLetter: correctLetter.toLowerCase(),
            correctAnswer: correctAnswer,
            options: options
        });

        await sleep(1000);
        await sock.sendMessage(targetId, { text: triviaText }, { quoted: m });

    } catch (err) {
        console.error("Trivia fetch error, using fallback:", err);
        
        // Fallback question if API is down
        const fallback = {
            question: "Which programming language is primarily used for frontend web development alongside HTML and CSS?",
            correctLetter: "b",
            correctAnswer: "JavaScript",
            options: ["Python", "JavaScript", "C++", "Java"]
        };
        
        let triviaText = `🧠 *TRIVIA TIME* 🧠\n\n*Question:* ${fallback.question}\n\n`;
        fallback.options.forEach((opt, idx) => {
            triviaText += `*${['A', 'B', 'C', 'D'][idx]}.* ${opt}\n`;
        });
        triviaText += `\n_Reply with the correct letter (A, B, C, or D) to win!_`;

        activeTrivia.set(targetId, fallback);

        await sleep(1000);
        await sock.sendMessage(targetId, { text: triviaText }, { quoted: m });
    }
}

// Export both the main function and the activeTrivia map
module.exports = handleTrivia;
module.exports.activeTrivia = activeTrivia;