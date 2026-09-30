async function handleMenu({ sock, m, sender, sleep }) {
    const menuText = `╭━━『 ♡ 𝓞𝓖 𝓒𝓞𝓡𝓔 ♡ 』━━╮

⚡ Prefix: .
📦 Total Commands: 37
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
│ ➜ .block
│ ➜ .unblock
│ ➜ .mute
│ ➜ .unmute
│ ➜ .add
│ ➜ .tagall
│ ➜ .everyone

┏━━━━━━━━━━━━━━━━━
┃ 🤖 AI COMMAND
┗━━━━━━━━━━━━━━━━━
│ ➜ $img
│ ➜ Hey OG ...
│ ➜ gen

┏━━━━━━━━━━━━━━━━━
┃ 🎨 MEDIA & TOOLS
┗━━━━━━━━━━━━━━━━━
│ ➜ .song
│ ➜ .music
│ ➜ .s
│ ➜ .scr
│ ➜ .toimg
│ ➜ .removebg
│ ➜ .rbg
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

╰━━━━━━━━━━━━━━━━━

💡 Type .help  for more info
🌟 Bot Version: 1.0.0`;

    await sleep(500);
    await sock.sendMessage(sender, { text: menuText }, { quoted: m });
}

module.exports = handleMenu;