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
            --bg-1: #070b1a;
            --bg-2: #141933;
            --panel: rgba(15, 23, 42, 0.62);
            --panel-strong: rgba(17, 24, 39, 0.8);
            --panel-soft: rgba(148, 163, 184, 0.08);
            --line: rgba(255,255,255,0.12);
            --emerald: #34d399;
            --cyan: #67e8f9;
            --gold: #fbbf24;
            --pink: #f472b6;
            --violet: #a78bfa;
            --text: #e5eefb;
            --muted: #9aa9c3;
            --danger: #f87171;
            --shadow: 0 22px 60px rgba(15, 23, 42, 0.45);
        }

        * { box-sizing: border-box; }

        html, body {
            margin: 0;
            min-height: 100%;
            font-family: Arial, sans-serif;
            background:
                radial-gradient(circle at top left, rgba(103, 232, 249, 0.15), transparent 28%),
                radial-gradient(circle at right center, rgba(167, 139, 250, 0.18), transparent 30%),
                linear-gradient(145deg, var(--bg-1), var(--bg-2));
            color: var(--text);
        }

        body {
            padding: 28px 20px 48px;
        }

        main {
            max-width: 1280px;
            margin: 0 auto;
        }

        .glass {
            background: rgba(15, 23, 42, 0.52);
            border: 1px solid rgba(255,255,255,0.10);
            box-shadow: var(--shadow);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
        }

        header {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            padding: 20px 22px;
            border-radius: 22px;
            margin-bottom: 20px;
        }

        .branding {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        h1 {
            margin: 0;
            font-size: clamp(1.7rem, 2.3vw, 2.6rem);
            font-family: 'Kavoon', system-ui;
            color: #f0d466;
            letter-spacing: 0.04em;
        }

        .subtitle {
            color: var(--muted);
            font-size: 0.86rem;
        }

        .header-meta {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
            color: var(--muted);
            font-size: 0.9rem;
        }

        .pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            border: 1px solid rgba(52, 211, 153, 0.28);
            background: rgba(52, 211, 153, 0.08);
            color: rgba(186, 255, 226, 0.96);
            font-weight: 700;
        }

        .toolbar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            margin: 0 0 18px;
            padding: 14px 16px;
            border-radius: 18px;
        }

        .search-wrap {
            position: relative;
            flex: 1;
            min-width: 220px;
        }

        .search-wrap::before {
            content: "⌕";
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            opacity: 0.7;
            color: var(--muted);
            font-size: 1.1rem;
        }

        input[type=search] {
            width: 100%;
            padding: 12px 14px 12px 38px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.10);
            background: rgba(15, 23, 42, 0.85);
            color: var(--text);
            outline: none;
            transition: border-color 0.2s ease, transform 0.2s ease;
        }

        input[type=search]:focus {
            border-color: rgba(103, 232, 249, 0.8);
            transform: translateY(-1px);
        }

        .toolbar-actions {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 10px 14px;
            border-radius: 12px;
            border: 1px solid transparent;
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.92), rgba(52, 211, 153, 0.75));
            color: white;
            font-weight: 700;
            cursor: pointer;
            text-decoration: none;
            transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .button:hover {
            transform: translateY(-1px);
            box-shadow: 0 14px 28px rgba(16, 185, 129, 0.2);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(180px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }

        .stat-card {
            padding: 18px 18px 16px;
            border-radius: 22px;
        }

        .stat-card .label {
            color: var(--muted);
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        .stat-card .value {
            margin-top: 12px;
            font-size: clamp(1.6rem, 2vw, 2.2rem);
            font-weight: 700;
        }

        .stat-card .trend {
            margin-top: 8px;
            font-size: 0.76rem;
            color: var(--muted);
        }

        .data-grid {
            display: grid;
            grid-template-columns: 1.5fr 0.9fr;
            gap: 20px;
            margin-bottom: 20px;
        }

        .panel {
            border-radius: 22px;
            padding: 18px;
            overflow: hidden;
        }

        .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 16px;
        }

        .panel h3 {
            margin: 0;
            font-size: 1rem;
            letter-spacing: 0.04em;
            color: #dbeafe;
            text-transform: uppercase;
        }

        .panel-tag {
            color: var(--cyan);
            font-size: 0.75rem;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        .chart-wrap {
            width: 100%;
            border-radius: 16px;
            padding: 16px;
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.63), rgba(15, 23, 42, 0.9));
            border: 1px solid rgba(255,255,255,0.08);
        }

        svg {
            width: 100%;
            height: 220px;
            display: block;
        }

        .axis-labels {
            display: flex;
            justify-content: space-between;
            font-size: 0.7rem;
            color: var(--muted);
            margin-top: 4px;
            padding: 0 8px;
        }

        .user-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .user-row {
            display: grid;
            grid-template-columns: 1fr auto auto;
            gap: 10px;
            align-items: center;
            padding: 12px 12px;
            border-radius: 14px;
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.06);
        }

        .user-name {
            color: var(--text);
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .user-count {
            color: var(--gold);
            font-weight: 700;
        }

        .user-badge {
            font-size: 0.72rem;
            color: var(--cyan);
            border-radius: 999px;
            background: rgba(103, 232, 249, 0.08);
            border: 1px solid rgba(103, 232, 249, 0.14);
            padding: 4px 8px;
        }

        .table-wrap {
            overflow: hidden;
            border-radius: 22px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            min-width: 740px;
        }

        th, td {
            padding: 12px 14px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            text-align: left;
            white-space: nowrap;
        }

        th {
            color: var(--cyan);
            font-size: 0.72rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            background: rgba(15, 23, 42, 0.72);
        }

        td {
            color: var(--text);
        }

        tbody tr:hover {
            background: rgba(148, 163, 184, 0.04);
        }

        .muted {
            color: var(--muted);
        }

        .status-dot {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--emerald);
            box-shadow: 0 0 18px rgba(52, 211, 153, 0.8);
            margin-right: 8px;
        }

        @media (max-width: 980px) {
            .stats-grid { grid-template-columns: repeat(2, minmax(160px, 1fr)); }
            .data-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 600px) {
            body { padding: 16px 12px 32px; }
            .stats-grid { grid-template-columns: 1fr; }
            header, .toolbar { padding-left: 14px; padding-right: 14px; }
            .toolbar { align-items: stretch; }
            .toolbar-actions { width: 100%; justify-content: space-between; }
            .button { flex: 1; }
        }
    </style>
</head>
<body>
    <main>
        <header class="glass">
            <div class="branding">
                <h1>OG CORE</h1>
                <div class="subtitle">Activity Dashboard</div>
            </div>
            <div class="header-meta">
                <span class="pill"><span class="status-dot"></span><span id="connection">Loading status...</span></span>
                <span id="uptime" class="muted">Runtime: --</span>
            </div>
        </header>

        <div class="toolbar glass">
            <div class="search-wrap">
                <input id="filter" type="search" placeholder="Filter by user, action, or group" aria-label="Filter activity">
            </div>
            <div class="toolbar-actions">
                <span id="updated" class="muted">Loading activity...</span>
                <form action="/admin/login" method="POST"><button class="button" type="submit">Back</button></form>
            </div>
        </div>

        <section class="stats-grid">
            <div class="stat-card glass">
                <div class="label">Total events</div>
                <div id="totalEvents" class="value">0</div>
                <div class="trend">Recent bot activity</div>
            </div>
            <div class="stat-card glass">
                <div class="label">Unique users</div>
                <div id="uniqueUsers" class="value">0</div>
                <div class="trend">Tracked identities</div>
            </div>
            <div class="stat-card glass">
                <div class="label">Top action</div>
                <div id="topAction" class="value">-</div>
                <div class="trend">Most common trigger</div>
            </div>
            <div class="stat-card glass">
                <div class="label">Top user</div>
                <div id="topUser" class="value">-</div>
                <div class="trend">Highest engagement</div>
            </div>
        </section>

        <section class="data-grid">
            <div class="panel glass">
                <div class="panel-header">
                    <h3>Usage graph</h3>
                    <span class="panel-tag">Last 24h</span>
                </div>
                <div class="chart-wrap">
                    <svg id="usageGraph" viewBox="0 0 700 220" preserveAspectRatio="none" aria-label="Activity usage graph"></svg>
                    <div class="axis-labels" id="axisLabels"></div>
                </div>
            </div>

            <div class="panel glass">
                <div class="panel-header">
                    <h3>Username split</h3>
                    <span class="panel-tag">Leaders</span>
                </div>
                <div id="userList" class="user-list"></div>
            </div>
        </section>

        <div class="table-wrap glass">
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

        function safeText(value) {
            return String(value ?? '-').trim() || '-';
        }

        function getActionCounts(events) {
            const counts = new Map();
            for (const event of events) {
                const key = safeText(event.action);
                counts.set(key, (counts.get(key) || 0) + 1);
            }
            return [...counts.entries()].sort((a, b) => b[1] - a[1]);
        }

        function getUserCounts(events) {
            const counts = new Map();
            for (const event of events) {
                const key = safeText(event.user);
                counts.set(key, (counts.get(key) || 0) + 1);
            }
            return [...counts.entries()].sort((a, b) => b[1] - a[1]);
        }

        function renderSummary() {
            const total = activityEvents.length;
            const userCounts = getUserCounts(activityEvents);
            const actionCounts = getActionCounts(activityEvents);
            document.getElementById('totalEvents').textContent = total;
            document.getElementById('uniqueUsers').textContent = userCounts.length;
            document.getElementById('topAction').textContent = actionCounts[0]?.[0] || '-';
            document.getElementById('topUser').textContent = userCounts[0]?.[0] || '-';

            const topUsers = userCounts.slice(0, 5);
            const userList = document.getElementById('userList');
            userList.innerHTML = '';
            if (!topUsers.length) {
                userList.innerHTML = '<div class="muted">No user data available yet.</div>';
                return;
            }

            topUsers.forEach(([user, count], index) => {
                const row = document.createElement('div');
                row.className = 'user-row';
                row.innerHTML = [
                    '<div class="user-name">' + (index + 1) + '. ' + safeText(user) + '</div>',
                    '<div class="user-count">' + count + '</div>',
                    '<div class="user-badge">' + (index === 0 ? 'Leader' : 'Active') + '</div>'
                ].join('');
                userList.appendChild(row);
            });
        }

        function renderUsageGraph() {
            const svg = document.getElementById('usageGraph');
            const labels = document.getElementById('axisLabels');
            const now = Date.now();
            const buckets = Array.from({ length: 12 }, (_, bucketIndex) => {
                const time = new Date(now - (11 - bucketIndex) * 2 * 60 * 60 * 1000);
                return {
                    key: time.toISOString().slice(0, 13) + ':00:00.000Z',
                    label: time.toLocaleTimeString([], { hour: 'numeric' }),
                    count: 0
                };
            });

            for (const event of activityEvents) {
                const eventTime = new Date(event.at);
                if (Number.isNaN(eventTime.getTime())) continue;
                const bucket = buckets.find((item) => {
                    const itemTime = new Date(item.key);
                    return Math.abs(itemTime.getTime() - eventTime.getTime()) <= 60 * 60 * 1000;
                });
                if (bucket) bucket.count += 1;
            }

            const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));
            const points = buckets.map((bucket, index) => {
                const x = (index / (buckets.length - 1)) * 100;
                const y = 200 - (bucket.count / maxCount) * 150;
                return x + ',' + y;
            }).join(' ');

            const areaPoints = points + ' 100,200 0,200';
            const circleMarkup = buckets.map((bucket, index) => {
                const x = (index / (buckets.length - 1)) * 100;
                const y = 200 - (bucket.count / maxCount) * 150;
                return '<circle cx="' + x + '" cy="' + y + '" r="' + (bucket.count ? 3.5 : 0) + '" fill="rgba(251,191,36,0.95)"></circle>';
            }).join('');

            svg.innerHTML = [
                '<defs>',
                '<linearGradient id="graphFill" x1="0" y1="0" x2="0" y2="1">',
                '<stop offset="0%" stop-color="rgba(103,232,249,0.55)" />',
                '<stop offset="100%" stop-color="rgba(103,232,249,0.02)" />',
                '</linearGradient>',
                '</defs>',
                '<polyline fill="none" stroke="rgba(103,232,249,0.95)" stroke-width="3" points="' + points + '" stroke-linecap="round" stroke-linejoin="round"></polyline>',
                '<polygon points="' + areaPoints + '" fill="url(#graphFill)"></polygon>',
                circleMarkup
            ].join('');

            labels.innerHTML = buckets.map((bucket) => '<span>' + bucket.label + '</span>').join('');
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
                const values = [
                    new Date(event.at).toLocaleString(),
                    safeText(event.user),
                    safeText(event.action),
                    safeText(event.chatType),
                    safeText(event.chat || '-')
                ];
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
                activityEvents = Array.isArray(data.events) ? data.events : [];
                document.getElementById('connection').textContent = 'WhatsApp: ' + (data.connection?.status || 'offline');
                document.getElementById('uptime').textContent = 'Runtime: ' + Math.floor((data.uptimeSeconds || 0) / 60) + ' min';
                document.getElementById('updated').textContent = 'Updated ' + new Date().toLocaleTimeString();
                renderSummary();
                renderUsageGraph();
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