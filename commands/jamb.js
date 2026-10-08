const fs = require('fs');
const path = require('path');

let pdfParse = null;
try {
    pdfParse = require('pdf-parse');
} catch (error) {
    pdfParse = null;
}

const lessonsFile = path.join(__dirname, '../data/jambLessons.json');
const dataFolder = path.join(__dirname, '../data');
const fallbackLessons = {
    general: {
        title: 'JAMB General Practice',
        questions: [
            { question: 'Which part of the sentence is the subject in: "The teacher praised the students."?', options: ['the teacher', 'praised', 'the students', 'the sentence'], answer: 0 },
            { question: 'What is the capital of Nigeria?', options: ['Lagos', 'Abuja', 'Kano', 'Port Harcourt'], answer: 1 },
            { question: 'Which of these is a prime number?', options: ['8', '9', '11', '15'], answer: 2 },
            { question: 'The opposite of "ancient" is:', options: ['Old', 'Historic', 'Modern', 'Early'], answer: 2 },
            { question: 'A person who writes poems is called a:', options: ['Teacher', 'Poet', 'Doctor', 'Artist'], answer: 1 }
        ]
    }
};

const sessions = new Map();

function ensureLessonFile() {
    const directory = path.dirname(lessonsFile);
    fs.mkdirSync(directory, { recursive: true });
    if (!fs.existsSync(lessonsFile)) {
        fs.writeFileSync(lessonsFile, JSON.stringify(fallbackLessons, null, 2));
    }
}

function normalizeLessonKey(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'general';
}

function inferLessonTitle(fileName) {
    const clean = path.basename(fileName, path.extname(fileName)).replace(/[-_]+/g, ' ');
    return clean.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function extractOptions(blockText) {
    const matches = [...blockText.matchAll(/(?:^|\s)(?:[A-D]|[1-4])[\).\-:]\s*([^\n]+(?:\n(?!\s*(?:[A-D]|[1-4])[\).\-:]).+)*)/gi)];
    if (!matches.length) return [];

    const options = [];
    for (const match of matches) {
        const text = match[1].replace(/\s+/g, ' ').trim();
        if (text && !options.includes(text)) {
            options.push(text);
        }
        if (options.length >= 4) break;
    }
    return options;
}

function parseQuestionsFromText(fileName, text) {
    const cleaned = String(text || '')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/\s*\n\s*\n\s*/g, '\n\n')
        .trim();

    const blocks = cleaned.split(/\n\s*\n+/).map((block) => block.trim()).filter(Boolean);
    const questions = [];

    for (const block of blocks) {
        const normalized = block.replace(/\s+/g, ' ');
        if (!/[A-D][\).\-:]\s*/i.test(block)) continue;

        const questionMatch = normalized.match(/(.+?)(?=\s(?:[A-D][\).\-:]|[1-4][\).\-:]))/i);
        if (!questionMatch) continue;

        const questionText = questionMatch[1].replace(/^(?:QUESTION|Q)\s*\d*[:.-]?\s*/i, '').trim();
        if (!questionText || questionText.length < 8) continue;

        const options = extractOptions(block);
        if (options.length < 2) continue;

        const answerMatch = block.match(/(?:answer|ans)\s*[:.-]?\s*([A-D])/i);
        const answerIndex = answerMatch ? answerMatch[1].toUpperCase().charCodeAt(0) - 65 : null;

        questions.push({
            question: questionText,
            options: options.slice(0, 4),
            answer: Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < options.length ? answerIndex : 0
        });
    }

    if (questions.length === 0 && /\b[A-D][\).\-:]\s*[/i.test(cleaned)) {
        const lines = cleaned.split(/\n+/).map((line) => line.trim()).filter(Boolean);
        let currentQuestion = null;
        let currentOptions = [];
        for (const line of lines) {
            if (!/[A-D][\).\-:]\s*/i.test(line)) {
                if (currentQuestion && currentOptions.length) {
                    questions.push({ question: currentQuestion, options: currentOptions.slice(0, 4), answer: 0 });
                    currentQuestion = null;
                    currentOptions = [];
                }
                if (!currentQuestion) currentQuestion = line;
                continue;
            }
            const optionMatch = line.match(/([A-D])[\).\-:]\s*(.+)/i);
            if (optionMatch) {
                currentOptions.push(optionMatch[2].trim());
            }
        }
        if (currentQuestion && currentOptions.length) {
            questions.push({ question: currentQuestion, options: currentOptions.slice(0, 4), answer: 0 });
        }
    }

    return questions.slice(0, 40);
}

async function buildLessonsFromPdfs() {
    if (!pdfParse) {
        return fallbackLessons;
    }

    const pdfFiles = fs.existsSync(dataFolder)
        ? fs.readdirSync(dataFolder).filter((file) => file.toLowerCase().endsWith('.pdf')).sort()
        : [];

    if (!pdfFiles.length) {
        return fallbackLessons;
    }

    const lessons = {};
    for (const pdfFile of pdfFiles) {
        const filePath = path.join(dataFolder, pdfFile);
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(fileBuffer);
            const questions = parseQuestionsFromText(pdfFile, data.text || '');
            if (!questions.length) continue;

            const lessonKey = normalizeLessonKey(pdfFile.replace(/\.pdf$/i, ''));
            lessons[lessonKey] = {
                title: inferLessonTitle(pdfFile),
                questions
            };
        } catch (error) {
            console.error(`Unable to parse ${pdfFile}:`, error.message);
        }
    }

    if (!Object.keys(lessons).length) {
        return fallbackLessons;
    }

    fs.writeFileSync(lessonsFile, JSON.stringify(lessons, null, 2));
    return lessons;
}

async function loadLessons() {
    ensureLessonFile();
    try {
        const raw = fs.readFileSync(lessonsFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            return parsed;
        }
    } catch (error) {
        console.error('Could not read JAMB lessons file:', error.message);
    }

    return buildLessonsFromPdfs();
}

function getLessonByName(name, lessons) {
    const key = String(name || 'general').trim().toLowerCase();
    if (!key) return null;
    if (lessons[key]) return lessons[key];
    const match = Object.entries(lessons).find(([lessonKey, lesson]) => (
        lessonKey.toLowerCase() === key ||
        String(lesson.title || '').toLowerCase() === key
    ));
    return match ? match[1] : null;
}

function normalizeQuestion(rawQuestion) {
    if (!rawQuestion || typeof rawQuestion !== 'object') return null;
    const options = Array.isArray(rawQuestion.options) ? rawQuestion.options.map(String) : [];
    const answer = Number(rawQuestion.answer);
    if (!rawQuestion.question || options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length) {
        return null;
    }
    return {
        question: String(rawQuestion.question),
        options,
        answer
    };
}

function buildLessonList(lessons) {
    return Object.entries(lessons)
        .map(([key, lesson]) => {
            const questions = Array.isArray(lesson.questions) ? lesson.questions.length : 0;
            return `${key}: ${lesson.title || 'Unnamed lesson'} (${questions} questions)`;
        })
        .join('\n');
}

function createSession(lessonName, lesson) {
    const questions = (Array.isArray(lesson.questions) ? lesson.questions : [])
        .map(normalizeQuestion)
        .filter(Boolean);

    return {
        lessonName,
        title: lesson.title || lessonName,
        questions,
        currentIndex: 0,
        score: 0,
        answered: 0,
        total: questions.length,
        phase: 'playing'
    };
}

function renderQuestion(session) {
    const current = session.questions[session.currentIndex];
    if (!current) return '🎉 This JAMB lesson is complete.';
    return [
        `📚 ${session.title}`,
        `Question ${session.currentIndex + 1}/${session.questions.length}`,
        current.question,
        ...current.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`),
        '',
        'Reply with .jamb answer A, B, C, or D.'
    ].join('\n');
}

async function handleJambLesson({ sock, m, sender, text }) {
    const commandText = String(text || '').trim();
    if (!/^\.jamb(?:\s|$)/i.test(commandText)) {
        return false;
    }

    const parts = commandText.split(/\s+/);
    const action = (parts[1] || 'help').toLowerCase();
    const lessons = loadLessons();
    const session = sessions.get(sender);

    if (action === 'help' || action === 'h') {
        const lessonList = buildLessonList(lessons);
        await sock.sendMessage(sender, {
            text: [
                '📚 JAMB LESSON MODE',
                '',
                'Commands:',
                '.jamb list',
                '.jamb refresh',
                '.jamb start [lessonName]',
                '.jamb answer A',
                '.jamb status',
                '.jamb stop',
                '',
                `Available lessons:\n${lessonList}`,
                '',
                'Example: .jamb start general'
            ].join('\n')
        }, { quoted: m });
        return true;
    }

    if (action === 'refresh') {
        const rebuilt = await buildLessonsFromPdfs();
        const lessonList = buildLessonList(rebuilt);
        await sock.sendMessage(sender, { text: `📚 JAMB lessons refreshed from the PDF files in the data folder.\n\n${lessonList}` }, { quoted: m });
        return true;
    }

    if (action === 'list') {
        const lessonList = buildLessonList(lessons);
        await sock.sendMessage(sender, { text: `📚 Available JAMB lessons:\n${lessonList}` }, { quoted: m });
        return true;
    }

    if (action === 'stop') {
        if (session) sessions.delete(sender);
        await sock.sendMessage(sender, { text: '🛑 JAMB lesson stopped.' }, { quoted: m });
        return true;
    }

    if (action === 'status') {
        if (!session) {
            await sock.sendMessage(sender, { text: '📚 No active JAMB lesson is running. Start one with .jamb start general.' }, { quoted: m });
            return true;
        }
        const progress = session.currentIndex + 1;
        await sock.sendMessage(sender, {
            text: `📚 ${session.title}\nScore: ${session.score}/${session.total}\nProgress: ${Math.min(progress, session.total)}/${session.total}`
        }, { quoted: m });
        return true;
    }

    if (action === 'start') {
        const lessonName = parts[2] || 'general';
        const lesson = getLessonByName(lessonName, lessons);
        if (!lesson) {
            await sock.sendMessage(sender, { text: `❌ Lesson not found. Use .jamb list to see available lessons.\nExample: .jamb start general` }, { quoted: m });
            return true;
        }

        const newSession = createSession(lessonName, lesson);
        if (!newSession.questions.length) {
            await sock.sendMessage(sender, { text: `❌ ${lesson.title || lessonName} has no valid questions yet.` }, { quoted: m });
            return true;
        }

        sessions.set(sender, newSession);
        await sock.sendMessage(sender, { text: renderQuestion(newSession) }, { quoted: m });
        return true;
    }

    if (action === 'answer') {
        if (!session) {
            await sock.sendMessage(sender, { text: '📚 There is no active JAMB lesson. Start one with .jamb start general.' }, { quoted: m });
            return true;
        }

        const letter = String(parts[2] || '').trim().toUpperCase();
        if (!/^[A-D]$/.test(letter)) {
            await sock.sendMessage(sender, { text: 'Use a valid answer like: .jamb answer A' }, { quoted: m });
            return true;
        }

        const current = session.questions[session.currentIndex];
        if (!current) {
            await sock.sendMessage(sender, { text: `🎉 ${session.title} finished. Final score: ${session.score}/${session.total}.` }, { quoted: m });
            sessions.delete(sender);
            return true;
        }

        const selectedIndex = letter.charCodeAt(0) - 65;
        const isCorrect = selectedIndex === current.answer;
        session.answered += 1;
        if (isCorrect) session.score += 1;

        const answerLine = isCorrect ? '✅ Correct!' : `❌ Wrong. Correct answer: ${String.fromCharCode(65 + current.answer)}.`;
        const nextIndex = session.currentIndex + 1;

        if (nextIndex >= session.questions.length) {
            const finalText = [
                answerLine,
                '',
                `🏁 Lesson finished: ${session.title}`,
                `Final score: ${session.score}/${session.total}`
            ].join('\n');
            await sock.sendMessage(sender, { text: finalText }, { quoted: m });
            sessions.delete(sender);
            return true;
        }

        session.currentIndex = nextIndex;
        await sock.sendMessage(sender, {
            text: [
                answerLine,
                '',
                `Score: ${session.score}/${session.total}`,
                '',
                renderQuestion(session)
            ].join('\n')
        }, { quoted: m });
        return true;
    }

    await sock.sendMessage(sender, { text: '📚 JAMB lesson mode is active. Use .jamb help for the commands.' }, { quoted: m });
    return true;
}

module.exports = handleJambLesson;
module.exports.sessions = sessions;
