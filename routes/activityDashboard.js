const { createHmac, timingSafeEqual } = require('crypto');

const SESSION_COOKIE = 'og_activity_session';
const SESSION_DURATION_MS = 30 * 60 * 1000;

function signSession(password, expiresAt) {
    return createHmac('sha256', password).update(expiresAt).digest('hex');
}

function hasValidSession(req, password) {
    const cookie = String(req.headers.cookie || '').split(';').map((part) => part.trim())
        .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
    if (!cookie) return false;

    const [expiresAt, signature] = cookie.slice(SESSION_COOKIE.length + 1).split('.');
    if (!/^\d+$/.test(expiresAt || '') || Number(expiresAt) <= Date.now() || !signature) return false;

    const expected = Buffer.from(signSession(password, expiresAt), 'hex');
    const supplied = Buffer.from(signature, 'hex');
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function loginPage(showError) {
    return `<!doctype html>
    <html lang="en"><head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex, nofollow, noarchive">
        <title>OG CORE Activity Login</title>
        <style>
            body { margin: 0; padding: 48px 20px; background: linear-gradient(150deg, #0f172a, #1e1b4b); color: #e5e7eb; font: 16px Arial, sans-serif; }
            main { max-width: 420px; margin: 0 auto; padding: 28px; background: rgba(30, 27, 75, .55); border: 1px solid rgba(255,255,255,.14); border-radius: 8px; }
            h1 { margin-top: 0; color: #ddbb0f; font-size: 26px; }
            label { display: block; margin: 18px 0 7px; color: #13dd96; }
            input { box-sizing: border-box; width: 100%; padding: 12px; border: 1px solid #475569; border-radius: 6px; background: #1e293b; color: #fff; }
            button { width: 100%; margin-top: 16px; padding: 12px; border: 0; border-radius: 6px; background: #25d366; color: #fff; font-weight: 700; cursor: pointer; }
            .error { color: #ff8e8e; }
        </style>
    </head><body><main>
        <h1>OG CORE Activity</h1>
        ${showError ? '<p class="error">Incorrect dashboard password.</p>' : ''}
        <form action="/admin/activity/login" method="POST">
            <label for="password">Dashboard password</label>
            <input id="password" name="password" type="password" autocomplete="current-password" required>
            <button type="submit">Sign in</button>
        </form>
    </main></body></html>`;
}

function dashboardPage() {
    return `<!doctype html>
    <html lang="en"><head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex, nofollow, noarchive">
        <title>OG CORE Activity</title>
        <style>
            :root { color-scheme: dark; }
            body { margin: 0; padding: 28px; background: linear-gradient(150deg, #0f172a, #1e1b4b); color: #e5e7eb; font: 14px Arial, sans-serif; }
            main { max-width: 1100px; margin: 0 auto; }
            header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,.18); }
            h1 { margin: 0; color: #ddbb0f; font-size: 28px; }
            .status { color: #13dd96; }
            .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 20px 0; }
            input[type=search] { flex: 1; min-width: 220px; padding: 10px 12px; border: 1px solid #475569; border-radius: 6px; background: #1e293b; color: white; }
            button { padding: 10px 14px; border: 0; border-radius: 6px; background: #25d366; color: white; font-weight: bold; cursor: pointer; }
            .table-wrap { overflow-x: auto; }
            table { width: 100%; border-collapse: collapse; text-align: left; }
            th, td { padding: 11px 12px; border-bottom: 1px solid rgba(255,255,255,.12); white-space: nowrap; }
            th { color: #13dd96; font-weight: 600; }
            .muted { color: #aeb8ca; }
            @media (max-width: 600px) { body { padding: 18px 12px; } h1 { font-size: 23px; } }
        </style>
    </head><body><main>
        <header>
            <h1>OG CORE Activity</h1>
            <div><span id="connection" class="status">Loading status...</span> <span id="uptime" class="muted"></span></div>
        </header>
        <div class="toolbar">
            <input id="filter" type="search" placeholder="Filter by user, action, or group" aria-label="Filter activity">
            <span id="updated" class="muted">Loading activity...</span>
            <form action="/admin/activity/logout" method="POST"><button type="submit">Sign out</button></form>
        </div>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Chat</th><th>Group</th></tr></thead>
                <tbody id="events"><tr><td class="muted" colspan="5">Loading...</td></tr></tbody>
            </table>
        </div>
    </main>
    <script>
        let activityEvents = [];
        const filterInput = document.getElementById('filter');
        function renderEvents() {
            const query = filterInput.value.trim().toLowerCase();
            const body = document.getElementById('events');
            const visible = activityEvents.filter((event) =>
                [event.user, event.action, event.chatType, event.chat].join(' ').toLowerCase().includes(query)
            );
            body.replaceChildren();
            if (visible.length === 0) {
                const row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.colSpan = 5;
                cell.className = 'muted';
                cell.textContent = 'No matching activity.';
                row.appendChild(cell);
                body.appendChild(row);
                return;
            }
            for (const event of visible) {
                const row = document.createElement('tr');
                const values = [new Date(event.at).toLocaleString(), event.user, event.action, event.chatType, event.chat || '-'];
                for (const value of values) {
                    const cell = document.createElement('td');
                    cell.textContent = value || '-';
                    row.appendChild(cell);
                }
                body.appendChild(row);
            }
        }
        async function refreshActivity() {
            try {
                const response = await fetch('/admin/activity/data', { cache: 'no-store' });
                if (response.status === 401) { window.location.reload(); return; }
                if (!response.ok) throw new Error('Unable to load activity');
                const data = await response.json();
                activityEvents = data.events;
                document.getElementById('connection').textContent = 'WhatsApp: ' + data.connection.status;
                document.getElementById('uptime').textContent = 'Runtime: ' + Math.floor(data.uptimeSeconds / 60) + ' min';
                document.getElementById('updated').textContent = 'Updated ' + new Date().toLocaleTimeString();
                renderEvents();
            } catch (error) {
                document.getElementById('updated').textContent = 'Activity feed unavailable.';
            }
        }
        filterInput.addEventListener('input', renderEvents);
        refreshActivity();
        setInterval(refreshActivity, 5000);
    </script></body></html>`;
}

function registerActivityDashboard(app, { redis, password, getConnectionStatus, getOwnerNumber, getBotNumbers }) {
    const isEnabled = password.length >= 32;
    const isAuthenticated = (req) => isEnabled && hasValidSession(req, password);

    app.get('/admin/activity', (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (!isEnabled) return res.status(503).send('Activity dashboard is disabled. Configure ACTIVITY_DASHBOARD_PASSWORD in this deployment.');
        res.send(isAuthenticated(req) ? dashboardPage() : loginPage(req.query.error === '1'));
    });

    app.post('/admin/activity/login', (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (!isEnabled) return res.status(503).send('Activity dashboard is disabled. Configure ACTIVITY_DASHBOARD_PASSWORD in this deployment.');

        const expected = Buffer.from(password);
        const submitted = Buffer.from(String(req.body.password || ''));
        if (submitted.length !== expected.length || !timingSafeEqual(submitted, expected)) {
            return res.redirect(303, '/admin/activity?error=1');
        }

        const expiresAt = String(Date.now() + SESSION_DURATION_MS);
        const session = `${expiresAt}.${signSession(password, expiresAt)}`;
        const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
        const secureAttribute = req.secure || forwardedProtocol === 'https' ? '; Secure' : '';
        res.set('Set-Cookie', `${SESSION_COOKIE}=${session}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=1800${secureAttribute}`);
        res.redirect(303, '/admin/activity');
    });

    app.post('/admin/activity/logout', (req, res) => {
        const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
        const secureAttribute = req.secure || forwardedProtocol === 'https' ? '; Secure' : '';
        res.set('Set-Cookie', `${SESSION_COOKIE}=; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=0${secureAttribute}`);
        res.redirect(303, '/admin/activity');
    });

    app.get('/admin/activity/data', async (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

        try {
            const storedEvents = await redis.lrange('bot_activity', 0, 99);
            const events = storedEvents.map((event) => {
                if (typeof event !== 'string') return event;
                try { return JSON.parse(event); } catch { return null; }
            }).filter(Boolean);
            const ownerNumber = getOwnerNumber();
            const botNumbers = getBotNumbers();
            const labelledEvents = events.map((event) => {
                const userNumber = String(event.user || '').replace(/\D/g, '');
                if (ownerNumber && userNumber === ownerNumber) {
                    return { ...event, user: `Owner · ${event.user}` };
                }
                if (userNumber && botNumbers.includes(userNumber)) {
                    return { ...event, user: `Bot · ${event.user}` };
                }
                return event;
            });
            res.json({
                connection: getConnectionStatus(),
                uptimeSeconds: Math.floor(process.uptime()),
                events: labelledEvents
            });
        } catch (error) {
            console.error('Could not load activity feed:', error.message);
            res.status(500).json({ error: 'Activity feed unavailable' });
        }
    });
}

module.exports = registerActivityDashboard;