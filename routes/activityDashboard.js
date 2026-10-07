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
            --bg-deep: #0b1020;
            --bg-mid: #151b3c;
            --panel: rgba(15, 23, 42, 0.68);
            --panel-strong: rgba(15, 23, 42, 0.86);
            --line: rgba(148, 163, 184, 0.20);
            --text: #e5eefb;
            --muted: #9aa9c3;
            --green: #34d399;
            --green-soft: rgba(52, 211, 153, 0.14);
            --amber: #fbbf24;
            --amber-soft: rgba(251, 191, 36, 0.12);
            --cyan: #67e8f9;
            --cyan-soft: rgba(103, 232, 249, 0.12);
            --violet: #a78bfa;
            --pink: #f472b6;
            --shadow: 0 30px 80px rgba(15, 23, 42, 0.45);
        }

        * {
            box-sizing: border-box;
        }

        html, body {
            margin: 0;
            min-height: 100%;
        }

        body {
            padding: 28px 20px 50px;
            color: var(--text);
            font: 14px Arial, sans-serif;
            background:
                radial-gradient(circle at top left, rgba(167, 139, 250, 0.18), transparent 28%),
                radial-gradient(circle at bottom right, rgba(52, 211, 153, 0.14), transparent 22%),
                linear-gradient(135deg, var(--bg-deep), var(--bg-mid));
            letter-spacing: 0.01em;
        }

        main {
            max-width: 1280px;
            margin: 0 auto;
        }

        .shell {
            display: flex;
            flex-direction: column;
            gap: 22px;
        }

        .topbar,
        .panel,
        .stat-card {
            background: rgba(15, 23, 42, 0.56);
            border: 1px solid var(--line);
            box-shadow: var(--shadow);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
        }

        .topbar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 22px 24px;
            border-radius: 22px;
        }

        h1 {
            margin: 0;
            color: #ddbb0f;
            font-size: clamp(24px, 2vw, 35px);
            line-height: 1.2;
            font-family: 'Kavoon', system-ui;
        }

        .meta {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 10px;
            color: var(--muted);
        }

        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            background: rgba(52, 211, 153, 0.12);
            border: 1px solid rgba(52, 211, 153, 0.25);
            color: var(--green);
            font-weight: 700;
        }

        .status-pill::before {
            content: '';
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: currentColor;
            box-shadow: 0 0 14px currentColor;
        }

        .toolbar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 12px;
            margin-top: 2px;
        }

        input[type=search] {
            flex: 1 1 240px;
            min-width: 200px;
            padding: 12px 14px;
            border: 1px solid var(--line);
            border-radius: 12px;
            background: rgba(15, 23, 42, 0.7);
            color: var(--text);
            outline: none;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        input[type=search]:focus {
            border-color: rgba(103, 232, 249, 0.8);
            box-shadow: 0 0 0 4px rgba(103, 232, 249, 0.12);
        }

        button {
            padding: 11px 16px;
            border: 0;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--green), #48c7a0);
            color: #08141f;
            font-weight: 800;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            box-shadow: 0 16px 30px rgba(52, 211, 153, 0.25);
        }

        button:hover {
            transform: translateY(-1px);
        }

        .muted {
            color: var(--muted);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 16px;
        }

        .stat-card {
            padding: 18px 18px 16px;
            border-radius: 20px;
            position: relative;
            overflow: hidden;
        }

        .stat-card::before {
            content: '';
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            height: 3px;
            background: linear-gradient(90deg, var(--cyan), var(--violet), var(--green));
        }

        .kicker {
            display: block;
            color: var(--muted);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
        }

        .stat-value {
            display: block;
            margin-top: 10px;
            font-size: clamp(24px, 2.2vw, 34px);
            font-weight: 800;
            line-height: 1.1;
        }

        .stat-sub {
            display: block;
            margin-top: 6px;
            color: var(--muted);
            font-size: 12px;
        }

        .layout-grid {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 18px;
        }

        .panel {
            padding: 18px;
            border-radius: 24px;
            min-height: 220px;
        }

        .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 12px;
        }

        .panel-header h3 {
            margin: 0;
            color: var(--text);
            font-size: 18px;
        }

        .pill {
            display: inline-flex;
            align-items: center;
            padding: 7px 10px;
            border-radius: 999px;
            background: rgba(103, 232, 249, 0.08);
            border: 1px solid rgba(103, 232, 249, 0.18);
            color: var(--cyan);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        .chart-wrap {
            height: 220px;
            border-radius: 18px;
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.6));
            border: 1px solid rgba(148, 163, 184, 0.14);
            overflow: hidden;
            padding: 12px 12px 6px;
        }

        svg {
            display: block;
            width: 100%;
            height: 100%;
        }

        .chart-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            color: var(--muted);
            font-size: 10px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        .user-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 8px;
        }

        .user-row {
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            gap: 12px;
            padding: 10px 12px;
            border: 1px solid rgba(148, 163, 184, 0.12);
            border-radius: 14px;
            background: rgba(15, 23, 42, 0.34);
        }

        .user-rank {
            width: 26px;
            height: 26px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            background: rgba(167, 139, 250, 0.16);
            color: var(--violet);
            font-weight: 800;
        }

        .user-main {
            min-width: 0;
        }

        .user-name {
            display: block;
            font-weight: 700;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .user-action {
            display: block;
            color: var(--muted);
            font-size: 11px;
            margin-top: 2px;
        }

        .user-count {
            color: var(--green);
            font-weight: 800;
            font-size: 14px;
        }

        .table-wrap {
            overflow-x: auto;
            border-radius: 18px;
            border: 1px solid rgba(148, 163, 184, 0.14);
            background: rgba(15, 23, 42, 0.32);
        }

        table {
            width: 100%;
            border-collapse: collapse;
            min-width: 700px;
            text-align: left;
        }

        th,
        td {
            padding: 12px 14px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.12);
            vertical-align: top;
        }

        th {
            color: var(--cyan);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            background: rgba(15, 23, 42, 0.42);
        }

        td {
            color: var(--text);
        }

        .action-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 5px 8px;
            border-radius: 999px;
            background: rgba(52, 211, 153, 0.12);
            border: 1px solid rgba(52, 211, 153, 0.18);
            color: var(--green);
            font-size: 11px;
            font-weight: 700;
        }

        .empty-state {
            color: var(--muted);
            text-align: center;
            padding: 18px;
        }

        @media (max-width: 900px) {
            .stats-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .layout-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 560px) {
            body {
                padding: 18px 12px 36px;
            }

            .stats-grid {
                grid-template-columns: 1fr;
            }

            .topbar,
            .panel,
            .stat-card {
                border-radius: 18px;
            }

            .toolbar {
                width: 100%;
            }
        }
    </style>
</head>

<body>
    <main class="shell">
        <header class="topbar">
            <div>
                <h1>OG CORE Activity Dashboard</h1>
                <div class="meta">
                    <span id="connection" class="status-pill">Loading status...</span>
                    <span id="uptime" class="muted"></span>
                </div>
            </div>
            <div class="toolbar">
                <input id="filter" type="search" placeholder="Filter by user, action, or group" aria-label="Filter activity">
                <span id="updated" class="muted">Loading activity...</span>
                <form action="/admin/login" method="POST"><button type="submit">Back</button></form>
            </div>
        </header>

        <section class="stats-grid">
            <article class="stat-card">
                <span class="kicker">Total events</span>
                <span id="totalEvents" class="stat-value">0</span>
                <span class="stat-sub">Recent command activity</span>
            </article>
            <article class="stat-card">
                <span class="kicker">Unique users</span>
                <span id="uniqueUsers" class="stat-value">0</span>
                <span class="stat-sub">Distinct usernames tracked</span>
            </article>
            <article class="stat-card">
                <span class="kicker">Groups</span>
                <span id="groupCount" class="stat-value">0</span>
                <span class="stat-sub">Chats with group activity</span>
            </article>
            <article class="stat-card">
                <span class="kicker">Top action</span>
                <span id="topAction" class="stat-value">-</span>
                <span id="topActionMeta" class="stat-sub">No activity yet</span>
            </article>
        </section>

        <section class="layout-grid">
            <article class="panel">
                <div class="panel-header">
                    <h3>Usage graph</h3>
                    <span class="pill">Last 12 hours</span>
                </div>
                <div class="chart-wrap">
                    <svg id="usageChart" viewBox="0 0 560 200" preserveAspectRatio="none" aria-label="Usage graph"></svg>
                </div>
                <div id="chartLabels" class="chart-labels"></div>
            </article>

            <article class="panel">
                <div class="panel-header">
                    <h3>Top usernames</h3>
                    <span id="userCountBadge" class="pill">0</span>
                </div>
                <div id="userStats" class="user-list"></div>
            </article>
        </section>

        <section class="panel">
            <div class="panel-header">
                <h3>Recent activity feed</h3>
            </div>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>User</th>
                            <th>Action</th>
                            <th>Chat type</th>
                            <th>Chat</th>
                        </tr>
                    </thead>
                    <tbody id="events">
                        <tr>
                            <td class="empty-state" colspan="5">Loading...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    </main>

    <script>
        let activityEvents = [];
        const filterInput = document.getElementById('filter');

        function aggregateUserStats(events) {
            const map = new Map();
            for (const event of events) {
                const user = String(event.user || 'unknown').trim() || 'unknown';
                const entry = map.get(user) || { user, total: 0, actionMap: new Map() };
                entry.total += 1;
                const action = String(event.action || 'unknown').trim() || 'unknown';
                entry.actionMap.set(action, (entry.actionMap.get(action) || 0) + 1);
                map.set(user, entry);
            }

            return Array.from(map.values())
                .map((entry) => ({
                    user: entry.user,
                    total: entry.total,
                    topAction: Array.from(entry.actionMap.entries()).sort((a, b) => b[1] - a[1])[0] || ['unknown', 0]
                }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 6);
        }

        function renderSummary(events) {
            const total = events.length;
            const uniqueUsers = new Set(events.map((event) => event.user || 'unknown')).size;
            const groupCount = new Set(events.filter((event) => event.chatType === 'group').map((event) => event.chat || 'unknown')).size;
            const actionMap = new Map();
            for (const event of events) {
                const action = String(event.action || 'unknown').trim() || 'unknown';
                actionMap.set(action, (actionMap.get(action) || 0) + 1);
            }
            const topActionEntry = Array.from(actionMap.entries()).sort((a, b) => b[1] - a[1])[0];

            document.getElementById('totalEvents').textContent = total;
            document.getElementById('uniqueUsers').textContent = uniqueUsers;
            document.getElementById('groupCount').textContent = groupCount;
            document.getElementById('topAction').textContent = topActionEntry ? topActionEntry[0] : '-';
            document.getElementById('topActionMeta').textContent = topActionEntry ? topActionEntry[1] + ' hits' : 'No activity yet';
        }

        function renderUsageChart(events) {
            const svg = document.getElementById('usageChart');
            const labelsBox = document.getElementById('chartLabels');
            const limit = 12;
            const now = Date.now();
            const buckets = [];
            for (let i = limit - 1; i >= 0; i -= 1) {
                const pointTime = now - (i * 60 * 60 * 1000);
                buckets.push({ time: pointTime, count: 0 });
            }

            for (const event of events) {
                const eventTime = new Date(event.at).getTime();
                if (Number.isNaN(eventTime)) continue;
                const index = Math.max(0, Math.min(limit - 1, Math.floor((now - eventTime) / (60 * 60 * 1000))));
                if (index >= 0 && index < limit) {
                    buckets[limit - 1 - index].count += 1;
                }
            }

            const width = 560;
            const height = 200;
            const chartPadding = 18;
            const maxValue = Math.max(1, ...buckets.map((item) => item.count));
            const step = (width - chartPadding * 2) / Math.max(1, buckets.length - 1);
            const points = buckets.map((bucket, index) => {
                const x = chartPadding + index * step;
                const y = height - chartPadding - (bucket.count / maxValue) * (height - chartPadding * 2);
                return { x, y, count: bucket.count };
            });

            const linePath = points.map((point, index) => (index === 0 ? 'M ' : 'L ') + point.x + ' ' + point.y).join(' ');
            const areaPath = linePath + ' L ' + points[points.length - 1].x + ' ' + (height - chartPadding) + ' L ' + points[0].x + ' ' + (height - chartPadding) + ' Z';

            svg.innerHTML = [
                '<defs>',
                '<linearGradient id="usageFill" x1="0" x2="0" y1="0" y2="1">',
                '<stop offset="0%" stop-color="rgba(103,232,249,0.42)" />',
                '<stop offset="100%" stop-color="rgba(103,232,249,0.02)" />',
                '</linearGradient>',
                '</defs>',
                '<path d="' + areaPath + '" fill="url(#usageFill)" opacity="0.9"></path>',
                '<path d="' + linePath + '" fill="none" stroke="#67e8f9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>',
                points.map(function (point) {
                    return '<circle cx="' + point.x + '" cy="' + point.y + '" r="' + (point.count > 0 ? 3 : 0) + '" fill="#34d399"></circle>';
                }).join('')
            ].join('');

            const labels = buckets.map((bucket, index) => {
                const date = new Date(bucket.time);
                return index % 2 === 0 || index === buckets.length - 1 ? date.toLocaleString('en-US', { hour: 'numeric' }) : '';
            });
            labelsBox.innerHTML = labels.map((label) => '<span>' + label + '</span>').join('');
        }

        function renderUserStats(events) {
            const container = document.getElementById('userStats');
            const data = aggregateUserStats(events);
            document.getElementById('userCountBadge').textContent = data.length;
            if (!data.length) {
                container.innerHTML = '<div class="empty-state">No user activity yet.</div>';
                return;
            }

            container.innerHTML = data.map((entry, index) => {
                const actionName = entry.topAction[0] || 'unknown';
                return '<div class="user-row">' +
                    '<span class="user-rank">' + (index + 1) + '</span>' +
                    '<div class="user-main">' +
                        '<span class="user-name">' + (entry.user || 'unknown') + '</span>' +
                        '<span class="user-action">Top action: ' + actionName + '</span>' +
                    '</div>' +
                    '<span class="user-count">' + entry.total + '</span>' +
                '</div>';
            }).join('');
        }

        function renderEvents() {
            const query = filterInput.value.trim().toLowerCase();
            const body = document.getElementById('events');
            const visible = activityEvents.filter((event) => {
                const text = [event.user, event.action, event.chatType, event.chat, event.at].join(' ').toLowerCase();
                return text.includes(query);
            });

            body.replaceChildren();
            if (visible.length === 0) {
                const row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.colSpan = 5;
                cell.className = 'empty-state';
                cell.textContent = 'No matching activity.';
                row.appendChild(cell);
                body.appendChild(row);
                return;
            }

            for (const event of visible) {
                const row = document.createElement('tr');
                const values = [
                    new Date(event.at).toLocaleString(),
                    event.user || 'unknown',
                    '<span class="action-badge">' + (event.action || 'unknown') + '</span>',
                    event.chatType || 'private',
                    event.chat || '-'
                ];

                values.forEach((value, index) => {
                    const cell = document.createElement('td');
                    if (index === 2) {
                        cell.innerHTML = value;
                    } else {
                        cell.textContent = value || '-';
                    }
                    row.appendChild(cell);
                });

                body.appendChild(row);
            }
        }

        async function refreshActivity() {
            try {
                const response = await fetch('/admin/activity/data', { cache: 'no-store' });
                if (response.status === 401) {
                    window.location.reload();
                    return;
                }
                if (!response.ok) throw new Error('Unable to load activity');

                const data = await response.json();
                activityEvents = Array.isArray(data.events) ? data.events : [];
                document.getElementById('connection').textContent = 'WhatsApp: ' + (data.connection && data.connection.status ? data.connection.status : 'unknown');
                document.getElementById('uptime').textContent = 'Runtime: ' + Math.floor((data.uptimeSeconds || 0) / 60) + ' min';
                document.getElementById('updated').textContent = 'Updated ' + new Date().toLocaleTimeString();

                renderSummary(activityEvents);
                renderUsageChart(activityEvents);
                renderUserStats(activityEvents);
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