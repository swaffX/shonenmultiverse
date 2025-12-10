const { checkSpam, handleSpam } = require('./antiSpamSystem');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../models/User');

// Basic list of bad words (English)
const BAD_WORDS = [
    'nigger', 'nigga', 'faggot', 'retard', 'whore', 'slut', 'cunt', 'dick', 'pussy', 'bitch', 'asshole', 'bastard'
];

/**
 * Main entry point for auto-moderation
 */
async function checkMessage(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    // Skip if user has Manage Messages permission (Immune)
    if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

    // 1. Check Bad Words
    if (checkBadWords(message)) {
        await handleBadWord(message);
        return; // Stop processing if bad word found
    }

    // 2. Check Spam
    const spamResult = await checkSpam(message);
    if (spamResult.isSpam) {
        await handleSpam(message, client);
        return;
    }
}

/**
 * Check for bad words in message content
 */
function checkBadWords(message) {
    const content = message.content.toLowerCase();
    return BAD_WORDS.some(word => content.includes(word));
}

/**
 * Handle bad word detection
 */
async function handleBadWord(message) {
    try {
        // Delete message
        await message.delete().catch(() => { });

        // Add warning
        let user = await User.findOne({ oderId: message.author.id, guildId: message.guild.id });
        if (!user) {
            user = new User({ oderId: message.author.id, guildId: message.guild.id });
        }

        user.warnings.push({
            moderatorId: message.client.user.id,
            reason: 'Auto-Mod: Profanity detected',
            timestamp: new Date()
        });
        await user.save();

        // Send warning embed
        const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setDescription(`⚠️ ${message.author}, watch your language! Warning added.`);

        const msg = await message.channel.send({ embeds: [embed] });

        // Delete warning message after 5 seconds
        setTimeout(() => msg.delete().catch(() => { }), 5000);

        // Check for auto-timeout (3+ warnings)
        if (user.warnings.length >= 3) {
            try {
                await message.member.timeout(60 * 60 * 1000, 'Reached 3 warnings (Auto-Mod)');
                message.channel.send(`🚨 **${message.author.tag}** has been timed out for 1 hour.`);
            } catch (err) {
                // Ignore permission errors
            }
        }

    } catch (error) {
        console.error('Bad word handling error:', error);
    }
}

module.exports = {
    checkMessage
};
