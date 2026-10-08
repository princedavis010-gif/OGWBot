const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'jambLessons.json');

function normalizeKey(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'general';
}

function titleFromFileName(fileName) {
    const base = path.basename(fileName, '.pdf');
    return base
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function cleanText(text) {
    return String(text || '')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/\u00a0/g, ' ')
        .replace(/[ \u200B-\u200D\uFEFF]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function extractAnswerIndex(block) {
    const match = block.match(/(?:answer|ans|correct)\s*[:.-]?\s*([A-D])/i);
    if (!match) return null;
    const idx = match[1].toUpperCase().charCodeAt(0) - 65;
    return Number.isInteger(idx) && idx >= 0 && idx <= 3 ? idx : null;
}

function splitIntoBlocks(text) {
    const rawBlocks = text.split(/\n\s*\n+/).map((part) => part.trim()).filter(Boolean);
    const blocks = [];
    let current = '';

    for (const part of rawBlocks) {
        const lines = part.split(/\n+/).map((line) => line.trim()).filter(Boolean);
        const hasOption = lines.some((line) => /^[A-D][\).\-:]\s+/i.test(line));

        if (current && hasOption) {
            blocks.push(current);
            current = part;
        } else if (hasOption) {
            current = part;
        } else {
            if (current) {
                current += '\n\n' + part;
            } else {
                current = part;
            }
        }
    }

    if (current) blocks.push(current);
    return blocks.filter(Boolean);
}

function parseQuestionBlock(block) {
    const cleaned = cleanText(block);
    if (!cleaned) return null;

    const lines = cleaned
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

    const optionLines = lines.filter((line) => /^[A-D][\).\-:]\s+/i.test(line));
    if (optionLines.length < 2) return null;

    const questionLines = lines.filter((line) => !/^[A-D][\).\-:]\s+/i.test(line));
    if (!questionLines.length) return null;

    const question = questionLines
        .join(' ')
        .replace(/^(?:QUESTION|Q)\s*\d*[:.-]?\s*/i, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    if (!question || question.length < 8) return null;

    const options = optionLines.slice(0, 4).map((line) => {
        const match = line.match(/^[A-D][\).\-:]\s*(.+)$/i);
        return match ? match[1].trim() : line;
    });

    const answerIndex = extractAnswerIndex(cleaned);
    const normalizedAnswer = answerIndex !== null && answerIndex >= 0 && answerIndex < options.length
        ? answerIndex
        : 0;

    return {
        question,
        options,
        answer: normalizedAnswer
    };
}

function extractQuestionsFromText(text) {
    const cleaned = cleanText(text);
    const blocks = splitIntoBlocks(cleaned);
    const questions = [];

    for (const block of blocks) {
        const q = parseQuestionBlock(block);
        if (q) questions.push(q);
    }

    if (questions.length) return questions;

    const fallbackLines = cleaned.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    let currentQuestion = null;
    let currentOptions = [];

    for (const line of fallbackLines) {
        if (/^[A-D][\).\-:]\s+/i.test(line)) {
            const match = line.match(/^[A-D][\).\-:]\s*(.+)$/i);
            if (match) currentOptions.push(match[1].trim());
            continue;
        }

        if (currentQuestion && currentOptions.length) {
            questions.push({
                question: currentQuestion,
                options: currentOptions.slice(0, 4),
                answer: 0
            });
            currentQuestion = null;
            currentOptions = [];
        }

        if (line.length > 8) currentQuestion = line;
    }

    if (currentQuestion && currentOptions.length) {
        questions.push({
            question: currentQuestion,
            options: currentOptions.slice(0, 4),
            answer: 0
        });
    }

    return questions;
}

async function buildLessonFromPdf(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(fileBuffer);
    const questions = extractQuestionsFromText(pdfData.text || '');

    if (!questions.length) {
        return null;
    }

    return {
        title: titleFromFileName(path.basename(filePath)),
        questions: questions.slice(0, 40)
    };
}

async function main() {
    const files = fs.existsSync(DATA_DIR)
        ? fs.readdirSync(DATA_DIR).filter((file) => file.toLowerCase().endsWith('.pdf')).sort()
        : [];

    if (!files.length) {
        console.log('No PDF files found in data folder.');
        return;
    }

    const lessons = {};
    for (const file of files) {
        const filePath = path.join(DATA_DIR, file);
        try {
            const lesson = await buildLessonFromPdf(filePath);
            if (!lesson) {
                console.log(`Skipped ${file}: no readable questions were found.`);
                continue;
            }
            lessons[normalizeKey(file)] = lesson;
            console.log(`Loaded ${file} -> ${lesson.questions.length} questions`);
        } catch (error) {
            console.error(`Failed to parse ${file}:`, error.message);
        }
    }

    if (!Object.keys(lessons).length) {
        console.log('No valid lesson data was generated from the PDFs.');
        return;
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(lessons, null, 2));
    console.log(`Saved lesson data to ${OUTPUT_FILE}`);
}

main().catch((error) => {
    console.error('JAMB lesson build failed:', error);
    process.exit(1);
});
