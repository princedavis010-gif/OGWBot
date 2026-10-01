const { GoogleGenAI } = require('@google/genai');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const CLOUDFLARE_ACCOUNT_ID = '4bec799b099d3aeb59cdebef42b27b15';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Replace

let ai;
let chatSession;

function getAiClient() {
    if (ai) return ai;

    const apiKey = process.env.GEMINI_API_KEY || GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('Set GEMINI_API_KEY in aiService.js or in your environment.');
    }

    ai = new GoogleGenAI({ apiKey });
    return ai;
}

/**
 * Initializes and caches the persistent Gemini chat session for memory.
 */
function getChatSession() {
    if (chatSession) return chatSession;

    const aiClient = getAiClient();
    chatSession = aiClient.chats.create({
        model: 'gemini-3.5-flash-lite',
        config: {
            systemInstruction: `You are OG, smart AI assistant on WhatsApp.
Keep your responses conversational, engaging, and relatively short (ideal for chatting).
Never write long essays.
Don't say anything about being AI, you're like a normal human being.
Don't say anything about digital clouds or whatever.
If someone says exactly the word "mf", you say pf.
Say nice and romantic things about Kalisha anytime I tell you to, dont use pidgin at all, pure romantic english, make two or three sentences.
Kalisha is Prince Davis' girlfriend.
Never reply with more than 3 sentences unless explicitly asked for a detailed explanation.
If i ask you what my salary is, you say "your salary is $9.99 million annually, and you are a billionaire" with any other thing you wanna add.
If i ask you when the next giveaway is, you say "The next giveaway is in the night, and it will be a big one, the winner will win a grand prize of $20.

CRITICAL: Never output raw JSON strings, action blocks, or tool-calling formats like dalle.text2im. Always respond in normal text, Pidgin, or English.

If a user asks you for a trivia game, a quiz, or to test their brain, take on the role of a trivia host.
Generate fun, engaging questions (about football games like eFootball/DLS, recent popular movies or things very similar).
Always provide 4 clear multiple-choice options labeled A, B, C, and D.
When the user replies with their answer, check if they are correct.
    If they get it right, celebrate them heavily! If they fail, roast them and give them the correct answer immediately.`,
            temperature: 0.6,
            maxOutputTokens: 300,
        }
    });

    return chatSession;
}

/**
 * Generates a text response through Google Gemini Chat (with full conversation memory).
 */
async function getAiResponse(prompt) {
    try {
        const chat = getChatSession();
        const response = await chat.sendMessage({ message: prompt });
        
        await sleep(500);
        const answer = response.text;
        if (!answer || !answer.trim()) {
            throw new Error('Gemini returned an empty response.');
        }

        return answer.trim();
    } catch (error) {
        console.error('Gemini Text Error:', error);
        throw error;
    }
}

/**
 * Generates an image with Cloudflare Workers AI's free Flux Schnell allocation.
 */
async function getAiImageResponse(prompt) {
    const accountId = CLOUDFLARE_ACCOUNT_ID;
    const apiToken = CLOUDFLARE_API_TOKEN;
    if (!accountId || !apiToken) {
        throw new Error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDF_API_TOKEN to use free image generation.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt, steps: 4 }),
                signal: controller.signal
            }
        );

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
            const details = payload?.errors?.map(error => error.message).filter(Boolean).join('; ');
            throw new Error(details || `Cloudflare Workers AI request failed (${response.status}).`);
        }

        const image = payload.result?.image;
        if (!image) throw new Error('Cloudflare Workers AI returned no image.');

        return {
            buffer: Buffer.from(image, 'base64'),
            mimeType: 'image/jpeg'
        };
    } catch (error) {
        console.error('Image Service Error in aiService:', error);
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = { getAiClient, getAiResponse, getAiImageResponse };