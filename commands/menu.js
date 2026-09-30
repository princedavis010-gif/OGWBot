async function handleMenu({ sock, m, sender, sleep }) {
    const menuText = `╭━━『 ♡ OG Core ♡ 』━━╮

⚡ Prefix: .
📦 Total Commands: 36
👑 Owner: Prince Davis
🤖 BOT: https://og-core.onrender.com

┏━━━━━━━━━━━━━━━━━
┃ 👑 OWNER & SYSTEM
┗━━━━━━━━━━━━━━━━━
│ ➜ .private
│ ➜ .public
│ ➜ .restart
│ ➜ .kill
│ ➜ .on
│ ➜ .off
│ ➜ .life
│ ➜ .death

┏━━━━━━━━━━━━━━━━━
┃ 🛡️️ ADMIN & GROUP
┗━━━━━━━━━━━━━━━━━
│ ➜ .kick
│ ➜ .promote
│ ➜ .demote
│ ➜ .lock
│ ➜ .unlock
│ ➜ .mute
│ ➜ .unmute
│ ➜ .add
│ ➜ .tagall
│ ➜ .everyone

┏━━━━━━━━━━━━━━━━━
┃ 🤖 AI COMMAND
┗━━━━━━━━━━━━━━━━━
│ ➜ .ai
│ ➜ $img
│ ➜ gen

┏━━━━━━━━━━━━━━━━━
┃ 🎨 MEDIA & TOOLS
┗━━━━━━━━━━━━━━━━━
│ ➜ .song
│ ➜ .music
│ ➜ .s
│ ➜ .toimg
│ ➜ .removebg
│ ➜ .rbg
│ ➜ .antiviewonce
│ ➜ .st
│ ➜ nice.

┏━━━━━━━━━━━━━━━━━
┃ 🎭 FUN & GAMES
┗━━━━━━━━━━━━━━━━━
│ ➜ .alive
│ ➜ .trivia
│ ➜ t
│ ➜ d
│ ➜ .flirt
│ ➜ .pickuplines

╰━━━━━━━━━━━━━━━━━

💡 Type .help  for more info
🌟 Bot Version: 1.0.0`;

    await sleep(500);
    await sock.sendMessage(sender, { text: menuText }, { quoted: m });
}

module.exports = handleMenu;