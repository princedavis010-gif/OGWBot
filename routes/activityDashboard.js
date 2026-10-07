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
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Kavoon&family=Rubik+Wet+Paint&display=swap" rel="stylesheet">
        <title>OG CORE Admin Login</title>
        <style>
            body {
                margin: 0;
                padding: 50px 20px;
                background-attachment: fixed;
                background-image: linear-gradient(150deg, #0f172a, #1e1b4b);
                color: #e5e7eb;
                font: 16px Arial, sans-serif;
            }
            main {
                max-width: 420px;
                margin: 0 auto;
                padding: 28px;
                background: rgba(30, 27, 75, .55);
                border: 1px solid rgba(255,255,255,.14);
                border-radius: 8px;
            }
            h1 {
                text-align: center;
                color: #ddbb0f;
                font-size: 60px;
                font-family: Rubik Wet Paint, system-ui;
            }
            h2 {
                margin-top: 0;
                color: #ddbb0f;
                font-size: 26px;
                font-family: Kavoon, system-ui;
                text-align: center;
            }
            label {
                display: block;
                margin: 18px 0 7px;
                color: #13dd96;
            }
            input {
                box-sizing: border-box;
                width: 100%;
                padding: 12px;
                border: 1px solid #475569;
                border-radius: 6px;
                background: #1e293b;
                color: #fff;
            }
            button {
                width: 100%;
                margin-top: 16px;
                padding: 12px;
                border: 0;
                border-radius: 6px;
                background: #25d366;
                color: #fff;
                font-weight: 700;
                cursor: pointer;
            }
            .error {
                color: #ff8e8e;
                <!-- text-align: center; -->
            }
            @media (max-width: 480px) {
                body { padding: 32px 16px; }
                h1 { font-size: 48px; }
                main { padding: 24px; }
            }
        </style>
    </head><body>
        <h1>OG CORE</h1>
        <main>
            <h2>Admin Panel</h2>
            ${showError ? '<p class="error">𝙸𝙽𝙲𝙾𝚁𝚁𝙴𝙲𝚃 𝙿𝙰𝚂𝚂𝚆𝙾𝚁𝙳.</p>' : ''}
            <form action="/admin/login" method="POST">
                <label for="password">Password</label>
                <input id="password" placeholder="Password" name="password" type="password" autocomplete="current-password" required>
                <button type="submit">Sign in</button>
            </form>
    </main></body></html>`;
}

function adminPage() {
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Kavoon&family=Rubik+Doodle+Shadow&family=Rubik+Wet+Paint&display=swap" rel="stylesheet">
    <title>OG CORE Admin Panel</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px 20px;
            color: #e5e7eb;
            background-attachment: fixed;
            background-image: linear-gradient(150deg, #0f172a, #1e1b4b);
            margin: 0;
        }
        h1 {
            color: #ddbb0f;
            text-shadow: black 1px 1px;
            font-family: "Rubik Wet Paint", system-ui;
            font-size: 55px;
            margin: 0 0 12px;
        }
        h2 {
            color: #ddbb0f;
            text-shadow: black 2px 2px;
            font-family: "Rubik Doodle Shadow", system-ui;
            font-weight: 100;
            font-size: 25px;
            margin: 0 0 40px;
        }
        .container {
            max-width: 400px;
            margin: 0 auto;
            padding: 30px;
            background: rgba(30, 27, 75, .4);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, .1);
        }
        .btn {
            display: block;
            margin: 15px 0;
            padding: 12px;
            border: 0;
            border-radius: 8px;
            background: #25d366;
            color: white;
            font-family: "Kavoon", system-ui;
            font-weight: bold;
            text-decoration: none;
            cursor: pointer;
        }
        .btn:hover { background: #20ba5a; }
        .logout-form { margin: 0; }
        @media (max-width: 480px) {
            body { padding: 32px 16px; }
            h1 { font-size: 44px; }
            .container { padding: 24px; }
        }
    </style>
</head>
<body>
    <main class="container">
        <h1>OG CORE</h1>
        <h2>Admin Panel</h2>
        <a href="/admin/activity" target="_blank" class="btn">Activity Dashboard</a>
        <a href="/" class="btn">Back to Home</a>
      <!--  <form class="logout-form" action="/admin/logout" method="POST">
            <button class="btn" type="submit">Sign out</button>
        </form> -->
    </main>
</body>
</html>`;
}

function dashboardPage() {
    return `<!doctype html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Kavoon&family=Rubik+Wet+Paint&display=swap" rel="stylesheet">
    <title>OG CORE Activity Dashboard</title>
    <style>
        :root {
            color-scheme: dark;
            --bg-1: #08111f;
            --bg-2: #101f3d;
            --panel: rgba(15, 23, 42, 0.72);
            --panel-strong: rgba(15, 23, 42, 0.9);
            --line: rgba(148, 163, 184, 0.25);
            --text: #ebf2ff;
            --muted: #a7b6d2;
            --green: #22c55e;
            --green-soft: rgba(34, 197, 94, 0.16);
            --teal: #2dd4bf;
            --amber: #fbbf24;
            --purple: #a78bfa;
            --pink: #f472b6;
            --red: #f87171;
            --shadow: 0 18px 50px rgba(15, 23, 42, 0.42);
        }

        * { box-sizing: border-box; }

        html, body {
            margin: 0;
            min-height: 100%;
            background:
                radial-gradient(circle at top left, rgba(34,197,94,0.18), transparent 34%),
                radial-gradient(circle at bottom right, rgba(167,139,250,0.22), transparent 28%),
                linear-gradient(135deg, var(--bg-1), var(--bg-2));
            color: var(--text);
            font: 14px Arial, sans-serif;
        }

        body {
            padding: 28px 18px 40px;
        }

        main {
            max-width: 1280px;
            margin: 0 auto;
        }

        header {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            padding: 14px 18px 18px;
            margin-bottom: 18px;
            border-bottom: 1px solid var(--line);
            background: rgba(15, 23, 42, 0.26);
            border-radius: 18px;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.07);
            backdrop-filter: blur(10px);
        }

        h1 {
            margin: 0;
            color: #ddbb0f;
            font-size: clamp(26px, 3vw, 38px);
            font-family: 'Kavoon', system-ui;
            letter-spacing: 0.04em;
        }

        .status {
            color: var(--green);
            font-weight: 700;
        }

        .status-dot {
            display: inline-block;
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: var(--green);
            box-shadow: 0 0 16px rgba(34, 197, 94, 0.9);
            margin-right: 8px;
            vertical-align: middle;
            animation: pulse 1.7s infinite ease-in-out;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.75; }
        }

        .toolbar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 12px;
            margin: 20px 0 16px;
        }

        input[type=search] {
            flex: 1;
            min-width: 240px;
            padding: 12px 14px;
            border: 1px solid rgba(148, 163, 184, 0.25);
            border-radius: 12px;
            background: rgba(15, 23, 42, 0.55);
            color: var(--text);
            outline: none;
            box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.35);
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        input[type=search]:focus {
            border-color: rgba(45, 212, 191, 0.8);
            box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.12);
        }

        .toolbar .meta {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 12px;
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid var(--line);
            color: var(--muted);
        }

        button {
            padding: 10px 14px;
            border: 0;
            border-radius: 10px;
            background: linear-gradient(135deg, var(--green), #22a65c);
            color: white;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 8px 18px rgba(34, 197, 94, 0.2);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        button:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 24px rgba(34, 197, 94, 0.24);
        }

        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }

        .metric-card,
        .panel,
        .user-card {
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.62));
            border: 1px solid var(--line);
            border-radius: 18px;
            box-shadow: var(--shadow);
            backdrop-filter: blur(12px);
        }

        .metric-card {
            padding: 18px 18px 16px;
            position: relative;
            overflow: hidden;
        }

        .metric-card::after {
            content: '';
            position: absolute;
            inset: auto -20px -26px auto;
            width: 110px;
            height: 110px;
            border-radius: 50%;
            background: rgba(255,255,255,0.04);
        }

        .metric-label {
            font-size: 12px;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        .metric-value {
            margin-top: 12px;
            font-size: clamp(28px, 4vw, 42px);
            font-weight: 700;
            color: var(--text);
        }

        .metric-trend {
            margin-top: 8px;
            color: var(--teal);
            font-size: 12px;
        }

        .panel {
            padding: 18px;
        }

        .panel h3 {
            margin: 0 0 12px;
            font-size: 16px;
            color: #d5e6ff;
        }

        .user-analytics {
            display: grid;
            gap: 14px;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            margin-bottom: 20px;
        }

        .user-card {
            padding: 16px;
            transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .user-card:hover {
            transform: translateY(-2px);
            border-color: rgba(45, 212, 191, 0.4);
        }

        .user-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }

        .user-name {
            font-size: 15px;
            font-weight: 700;
            color: #fff;
            word-break: break-word;
        }

        .user-total {
            font-size: 12px;
            padding: 6px 8px;
            border-radius: 999px;
            background: var(--green-soft);
            color: var(--green);
            border: 1px solid rgba(34,197,94,0.4);
        }

        .mini-bars {
            display: flex;
            align-items: end;
            height: 72px;
            gap: 6px;
            margin: 12px 0 10px;
            padding: 8px 2px 0;
            border-radius: 10px;
            background: linear-gradient(180deg, rgba(148,163,184,0.04), rgba(148,163,184,0.0));
        }

        .mini-bar {
            flex: 1;
            min-width: 8px;
            border-radius: 8px 8px 0 0;
            background: linear-gradient(180deg, var(--teal), var(--purple));
            opacity: 0.9;
            box-shadow: 0 6px 18px rgba(45, 212, 191, 0.15);
            transition: height 0.25s ease;
        }

        .user-meta {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            color: var(--muted);
            font-size: 12px;
        }

        .table-wrap {
            overflow-x: auto;
            border-radius: 18px;
            background: rgba(15, 23, 42, 0.48);
            border: 1px solid var(--line);
            box-shadow: var(--shadow);
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }

        th,
        td {
            padding: 12px 14px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.14);
            white-space: nowrap;
        }

        th {
            color: var(--teal);
            font-weight: 600;
            background: rgba(15, 23, 42, 0.45);
        }

        tbody tr {
            transition: background 0.2s ease;
        }

        tbody tr:hover {
            background: rgba(148, 163, 184, 0.04);
        }

        td.muted {
            color: var(--muted);
        }

        .chip {
            display: inline-block;
            padding: 5px 7px;
            border-radius: 999px;
            font-size: 11px;
            border: 1px solid rgba(148,163,184,0.2);
            background: rgba(148,163,184,0.08);
            color: #d9e5ff;
        }

        @media (max-width: 600px) {
            body { padding: 16px 12px 28px; }
            header { padding: 12px 14px 14px; }
            .toolbar { margin-top: 16px; }
            th, td { padding: 10px 10px; }
        }
    </style>
</head>

<body>
    <main>
        <header>
            <h1>OG CORE Activity Dashboard</h1>
            <div>
                <span id="connection" class="status"><span class="status-dot"></span>Loading status...</span>
                <span id="uptime" class="muted"></span>
            </div>
        </header>

        <div class="toolbar">
            <input id="filter" type="search" placeholder="Filter by user, action, or group" aria-label="Filter activity">
            <div class="meta">
                <span id="updated" class="muted">Loading activity...</span>
            </div>
            <form action="/admin/login" method="POST"><button type="submit">Back</button></form>
        </div>

        <section class="dashboard-grid" id="summaryCards"></section>

        <section class="user-analytics panel" aria-label="User activity analytics">
            <h3>Top user activity</h3>
            <div id="userInsights"></div>
        </section>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Chat</th>
                        <th>Group</th>
                    </tr>
                </thead>
                <tbody id="events">
                    <tr>
                        <td class="muted" colspan="5">Loading...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </main>

    <script>
        let activityEvents = [];
        const filterInput = document.getElementById('filter');

        function formatNumber(value) {
            return Number(value || 0).toLocaleString();
        }

        function getUserStats(events) {
            const userMap = new Map();

            for (const event of events) {
                const key = String(event.user || 'unknown');
                const entry = userMap.get(key) || {
                    user: key,
                    total: 0,
                    actions: Object.create(null),
                    lastSeen: null,
                    groups: new Set()
                };

                entry.total += 1;
                entry.actions[event.action || 'unknown'] = (entry.actions[event.action || 'unknown'] || 0) + 1;
                if (event.chatType === 'group' && event.chat) entry.groups.add(event.chat);
                const ts = new Date(event.at || Date.now()).getTime();
                if (!entry.lastSeen || ts > entry.lastSeen) entry.lastSeen = ts;
                userMap.set(key, entry);
            }

            return Array.from(userMap.values()).map((entry) => {
                const labels = Object.entries(entry.actions).sort((a, b) => b[1] - a[1]);
                const topAction = labels[0] ? labels[0][0] : 'unknown';
                const topCount = labels[0] ? labels[0][1] : 0;
                return {
                    user: entry.user,
                    total: entry.total,
                    topAction,
                    topCount,
                    lastSeen: entry.lastSeen,
                    groups: entry.groups.size,
                    actions: labels
                };
            }).sort((a, b) => b.total - a.total || a.user.localeCompare(b.user));
        }

        function renderMetrics(events) {
            const total = events.length;
            const uniques = new Set(events.map((event) => String(event.user || 'unknown'))).size;
            const groups = new Set(events.filter((event) => event.chatType === 'group').map((event) => String(event.chat || 'unknown'))).size;
            const actions = new Set(events.map((event) => String(event.action || 'unknown'))).size;

            const cards = [
                { label: 'Total events', value: formatNumber(total), trend: 'Realtime feed' },
                { label: 'Unique users', value: formatNumber(uniques), trend: 'Live audience' },
                { label: 'Group chats', value: formatNumber(groups), trend: 'Bot traffic' },
                { label: 'Actions tracked', value: formatNumber(actions), trend: 'Command coverage' }
            ];

            document.getElementById('summaryCards').innerHTML = cards.map(function (card) {
                return '<div class="metric-card">' +
                    '<div class="metric-label">' + card.label + '</div>' +
                    '<div class="metric-value">' + card.value + '</div>' +
                    '<div class="metric-trend">' + card.trend + '</div>' +
                    '</div>';
            }).join('');
        }

        function renderUserInsights(events) {
            const users = getUserStats(events).slice(0, 8);
            const container = document.getElementById('userInsights');

            if (!users.length) {
                container.innerHTML = '<div class="muted">No user data yet.</div>';
                return;
            }

            const maxTotal = Math.max(...users.map((user) => user.total), 1);

            container.innerHTML = users.map(function (user) {
                const bars = user.actions.slice(0, 6).map(function ([label, count]) {
                    const percent = Math.max((count / Math.max(user.total, 1)) * 100, 8);
                    return '<span class="mini-bar" title="' + label + ': ' + count + '" style="height:' + percent + '%"></span>';
                }).join('');
                const lastSeen = user.lastSeen ? new Date(user.lastSeen).toLocaleString() : 'No activity';
                return '<div class="user-card">' +
                    '<div class="user-head">' +
                        '<div class="user-name">' + user.user + '</div>' +
                        '<div class="user-total">' + user.total + ' events</div>' +
                    '</div>' +
                    '<div class="mini-bars">' + bars + '</div>' +
                    '<div class="user-meta">' +
                        '<span><strong>Top:</strong> <span class="chip">' + user.topAction + '</span></span>' +
                        '<span>' + user.groups + ' groups</span>' +
                    '</div>' +
                    '<div class="user-meta" style="margin-top:8px;">' +
                        '<span>Peak: ' + user.topCount + '</span>' +
                        '<span>' + lastSeen + '</span>' +
                    '</div>' +
                    '</div>';
            }).join('');
        }

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
                document.getElementById('connection').innerHTML = '<span class="status-dot"></span>' + 'WhatsApp: ' + data.connection.status;
                document.getElementById('uptime').textContent = 'Runtime: ' + Math.floor(data.uptimeSeconds / 60) + ' min';
                document.getElementById('updated').textContent = 'Updated ' + new Date().toLocaleTimeString();
                renderMetrics(activityEvents);
                renderUserInsights(activityEvents);
                renderEvents();
            } catch (error) {
                document.getElementById('updated').textContent = 'Activity feed unavailable.';
            }
        }

        filterInput.addEventListener('input', renderEvents);
        refreshActivity();
        setInterval(refreshActivity, 5000);
    </script>
</body>

</html>`;
}

function registerActivityDashboard(app, { redis, password, getConnectionStatus, getOwnerNumber, getBotNumbers }) {
    const isEnabled = password.length >= 32;
    const isAuthenticated = (req) => isEnabled && hasValidSession(req, password);

    app.get('/admin', (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (!isEnabled) return res.status(503).send('Admin panel is disabled. Configure ACTIVITY_DASHBOARD_PASSWORD in this deployment.');
        if (!isAuthenticated(req)) return res.redirect(303, '/admin/login');
        res.send(adminPage());
    });

    app.get('/admin/login', (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (!isEnabled) return res.status(503).send('Admin panel is disabled. Configure ACTIVITY_DASHBOARD_PASSWORD in this deployment.');
        if (isAuthenticated(req)) return res.redirect(303, '/admin');
        res.send(loginPage(req.query.error === '1'));
    });

    app.get('/admin/activity', (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (!isEnabled) return res.status(503).send('Activity dashboard is disabled. Configure ACTIVITY_DASHBOARD_PASSWORD in this deployment.');
        if (!isAuthenticated(req)) return res.redirect(303, '/admin/login');
        res.send(dashboardPage());
    });

    const login = (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (!isEnabled) return res.status(503).send('Admin panel is disabled. Configure ACTIVITY_DASHBOARD_PASSWORD in this deployment.');

        const expected = Buffer.from(password);
        const submitted = Buffer.from(String(req.body.password || ''));
        if (submitted.length !== expected.length || !timingSafeEqual(submitted, expected)) {
            return res.redirect(303, '/admin/login?error=1');
        }

        const expiresAt = String(Date.now() + SESSION_DURATION_MS);
        const session = `${expiresAt}.${signSession(password, expiresAt)}`;
        const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
        const secureAttribute = req.secure || forwardedProtocol === 'https' ? '; Secure' : '';
        res.set('Set-Cookie', `${SESSION_COOKIE}=${session}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=1800${secureAttribute}`);
        res.redirect(303, '/admin');
    };

    app.post('/admin/login', login);
    app.post('/admin/activity/login', login);

    const logout = (req, res) => {
        const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
        const secureAttribute = req.secure || forwardedProtocol === 'https' ? '; Secure' : '';
        res.set('Set-Cookie', `${SESSION_COOKIE}=; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=0${secureAttribute}`);
        res.redirect(303, '/admin/login');
    };

    app.post('/admin/logout', logout);
    app.post('/admin/activity/logout', logout);

    app.get('/admin/activity/data', async (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

        try {
            const storedEvents = await redis.lrange('bot_activity', 0, 99);
            const events = storedEvents.map((event) => {
                if (typeof event !== 'string') return event;
                try { return JSON.parse(event); } catch { return null; }
            }).filter(Boolean);
            res.json({
                connection: getConnectionStatus(),
                uptimeSeconds: Math.floor(process.uptime()),
                events
            });
        } catch (error) {
            console.error('Could not load activity feed:', error.message);
            res.status(500).json({ error: 'Activity feed unavailable' });
        }
    });
}

module.exports = registerActivityDashboard;