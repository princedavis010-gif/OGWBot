async function handleMenu({ sock, m, sender, sleep }) {
    const menuText = `🤖 *OG BOT MENU* 🤖
*Hey there! I am OG, your street-smart WhatsApp companion.*

👑 *Owner & System Commands:*
• \`.private\` - Switch bot to private mode
• \`.public\` - Switch bot to public mode
• \`.restart\` - Restart bot system
• \`.kill\` - Force shutdown bot
• \`.on\` / \`.off\` - Toggle terminal logs
• \`.life\` / \`.death\` - Toggle quote AI settings

🛡️ *Group Management & Admin:*
• \`.kick\` - Remove a member from the group
• \`.promote\` - Make a member a group admin
• \`.demote\` - Remove admin rights from a member
• \`.lock\` / \`.unlock\` - Lock or unlock group settings
• \`.mute\` / \`.unmute\` - Mute or unmute specific users
• \`.add\` - Add a new member to the group
• \`.tagall\` / \`.everyone\` - Tag all members in a group

🎉 *Fun & Games:*
• \`.trivia\` - Start an interactive quiz game
• \`t\` - Play Truth
• \`d\` - Play Dare
• \`.flirt\` / \`.pickuplines\` - Get fun pick-up lines
• \`.alive\` - Check if the bot is active & view ping

🎨 *Media & Tools:*
• \`.song\` / \`.music\` [title] - Download music/mp3
• \`.s\` - Convert media into a custom sticker
• \`.toimg\` - Convert a sticker back to an image
• \`.removebg\` / \`.rbg\` - Remove background from an image
• \`$img\` / \`gen\` [prompt] - Generate AI images
• \`nice.\` / \`.antiviewonce\` - Grab view-once media
• \`.st\` - Media downloader tool

💬 *AI Companion:*
• Mention the bot or type *Hey OG [message]* to chat!
• Reply directly to my messages to keep the conversation flowing naturally.

_Powered by Prince Davis_`;

    await sleep(500);
    await sock.sendMessage(sender, { text: menuText }, { quoted: m });
}

module.exports = handleMenu;