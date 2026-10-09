const TEMP_EMAIL_API = 'https://www.1secmail.com/api/v1/';
const burnerMailboxes = new Map();

async function fetchJson(url) {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'User-Agent': 'OGWBot/1.0'
        }
    });

    if (!response.ok) {
        throw new Error(`Temporary email API error: ${response.status}`);
    }

    return response.json();
}

function formatInboxMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
        return '📭 No emails yet. Give it a moment and check again.';
    }

    const lines = messages.slice(0, 5).map((message, index) => {
        const from = (message.from || 'Unknown sender').replace(/<.*$/, '').trim();
        const subject = (message.subject || 'No subject').trim() || 'No subject';
        const id = message.id || 'N/A';
        return `${index + 1}. ${from} — ${subject}\n   ID: ${id}`;
    });

    return `📬 Latest emails:\n${lines.join('\n\n')}`;
}

async function generateMailbox() {
    const result = await fetchJson(`${TEMP_EMAIL_API}?action=genRandomMailbox&count=1`);
    const mailbox = Array.isArray(result) ? result[0] : null;

    if (!mailbox || typeof mailbox !== 'string' || !mailbox.includes('@')) {
        throw new Error('No temporary email was generated.');
    }

    return mailbox;
}

async function fetchInbox(mailbox) {
    const [login, domain] = String(mailbox).split('@');
    if (!login || !domain) {
        throw new Error('Invalid mailbox address.');
    }

    const result = await fetchJson(`${TEMP_EMAIL_API}?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`);
    return Array.isArray(result) ? result : [];
}

module.exports = async function handleBurnerEmail({ sock, m, sender, senderJid, text, sleep }) {
    const rawText = String(text || '').trim();
    const lowerText = rawText.toLowerCase();
    const key = senderJid || sender;
    const savedMailbox = burnerMailboxes.get(key);

    if (lowerText === '.burner inbox' || lowerText === '.burner check' || lowerText.startsWith('.burner inbox ') || lowerText.startsWith('.burner check ')) {
        if (!savedMailbox) {
            await sock.sendMessage(sender, {
                text: '📭 You do not have a generated burner email yet. Send .burner to create one first.'
            }, { quoted: m });
            return;
        }

        try {
            await sleep(700);
            const messages = await fetchInbox(savedMailbox);
            const summary = formatInboxMessages(messages);

            await sock.sendMessage(sender, {
                text: `🪄 Active burner email:\n*${savedMailbox}*\n\n${summary}`
            }, { quoted: m });
            return;
        } catch (error) {
            console.error('Burner inbox fetch failed:', error);
            await sock.sendMessage(sender, {
                text: '⚠️ I could not fetch the inbox right now. Try again in a bit.'
            }, { quoted: m });
            return;
        }
    }

    try {
        await sleep(700);
        const mailbox = await generateMailbox();
        burnerMailboxes.set(key, mailbox);

        await sock.sendMessage(sender, {
            text: `🪄 Your disposable email is ready:\n*${mailbox}*\n\nUse .burner inbox to check messages.\nThis address is temporary and may expire after a while.`
        }, { quoted: m });
    } catch (error) {
        console.error('Burner email generation failed:', error);
        await sock.sendMessage(sender, {
            text: '⚠️ The temporary email service is unavailable right now. Please try again in a moment.'
        }, { quoted: m });
    }
};
