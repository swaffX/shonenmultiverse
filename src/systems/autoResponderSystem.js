const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

// Predefined triggers and responses
const triggers = [
    {
        keywords: ['ip', 'ip ne', 'server ip', 'sunucu ip'],
        response: '🎮 **Server IP:** `Currently handled via Roblox Link`\nClick the link in <#123456789> (placeholder) or use `/info`!'
    },
    {
        keywords: ['link', 'oyun linki', 'game link', 'oyun link', 'robux link'],
        response: `🔗 **Game Link:**\n${config.game.robloxLink || 'https://www.roblox.com/games/130542097430425/Shonen-Multiverse'}`
    },
    {
        keywords: ['ne zaman açılacak', 'açılış tarihi', 'ne zaman aktif', 'when release', 'release date'],
        response: '📅 **Release Date:** We are currently in **Beta**! Check our announcements channel for updates on the full release.'
    },
    {
        keywords: ['nasıl kayıt', 'kayıt ol', 'register', 'verification', 'verify'],
        response: '🔐 **Verification:** Use the `/verify` command to link your Roblox account and get roles!'
    }
];

// Cooldown map to prevent spamming the same response
const cooldowns = new Set();

async function handleAutoResponse(message) {
    if (message.author.bot) return;

    const content = message.content.toLowerCase();

    for (const trigger of triggers) {
        // Check if message contains any of the keywords
        const match = trigger.keywords.some(keyword => content.includes(keyword));

        if (match) {
            // Check cooldown (10 seconds per trigger type per channel)
            const cooldownKey = `${message.channel.id}-${trigger.keywords[0]}`;
            if (cooldowns.has(cooldownKey)) return;

            // Send response
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setDescription(trigger.response)
                .setFooter({ text: 'Auto Response' });

            await message.reply({ embeds: [embed] });

            // Set cooldown
            cooldowns.add(cooldownKey);
            setTimeout(() => cooldowns.delete(cooldownKey), 10000); // 10 seconds

            return; // Stop after first match to avoid multiple responses
        }
    }
}

module.exports = { handleAutoResponse };
