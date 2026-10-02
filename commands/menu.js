async function handleMenu({ sock, m, sender, sleep }) {
    const menuText = `╭━━『 ♡ 𝓞𝓖 𝓒𝓞𝓡𝓔 ♡ 』━━╮

👑 Owner: Prince Davis
🤖 BOT: https://og-korex.onrender.com


┏━━━━━━━━━━━━━━━━━
┃ 🛡️ GROUP ADMIN COMMANDS
┗━━━━━━━━━━━━━━━━━
│ ➜ .add
│ ➜ .kick
│ ➜ .block
│ ➜ .unblock
│ ➜ .promote
│ ➜ .demote
│ ➜ .lock
│ ➜ .unlock
│ ➜ .mute 
│ ➜ .unmute
│ ➜ .tagall / 📢
│ ➜ .tts
│ ➜ .poll Question?, Option 1, Option 2
│ ➜ .welcome


┏━━━━━━━━━━━━━━━━━
┃ 🎨 MEDIA & VOICE
┗━━━━━━━━━━━━━━━━━
│ ➜ .s (create sticker)
│ ➜ .scr (square-crop sticker; Owner/Bot)
│ ➜ .toimg
│ ➜ .rbg
│ ➜ .vibe / play me ...


┏━━━━━━━━━━━━━━━━━
┃ 🤖 AI
┗━━━━━━━━━━━━━━━━━
│ ➜ Hey OG ...
│ ➜ $img ... / .imagine ... / Gen ...


┏━━━━━━━━━━━━━━━━━
┃ 🎭 FUN & GAMES
┗━━━━━━━━━━━━━━━━━
│ ➜ .trivia
│ ➜ t (truth)
│ ➜ d (dare)
│ ➜ .flirt

┏━━━━━━━━━━━━━━━━━
┃ 📋 MENU & HELP
┗━━━━━━━━━━━━━━━━━
│ ➜ .list / .help / .h / .chat

┏━━━━━━━━━━━━━━━━━
┃ 👑 OWNER & SYSTEM
┗━━━━━━━━━━━━━━━━━

│ ➜ .status
│ ➜ .private
│ ➜ .public
│ ➜ .on
│ ➜ .off
│ ➜ .life
│ ➜ .death
│ ➜ .admin
│ ➜ .group
│ ➜ .limit
│ ➜ .st
│ ➜ .unlimit
│ ➜ .antilink (status)
│ ➜ .antilink on
│ ➜ .antilink off
│ ➜ .welcome on 
│ ➜ .welcome off
${/*
    │ ➜ .vv / .antiviewonce
    │ ➜ .alive
    │ ➜ .activity (Owner)
    │ ➜ .restart / .kill (Owner/Bot)
    │ ➜ .logout / .clearsession (Owner)
    │ ➜ .command .self / .command .public (Owner) */''}

╰━━━━━━━━━━━━━━━━━

💡 Type .help to show this menu
🌟 Bot Version: 1.0.0`;

    await sleep(500);
    await sock.sendMessage(sender, { text: menuText }, { quoted: m });
}

module.exports = handleMenu;