const { Collection } = require('discord.js');
const config = require('../config/config');
const Guild = require('../models/Guild');

// Store message timestamps for each user
const messageCache = new Collection();

// Clean old entries from cache
setInterval(() => {
    const now = Date.now();
    messageCache.forEach((userMap, guildId) => {
        userMap.forEach((timestamps, oderId) => {
            const filtered = timestamps.filter(time => now - time < config.antiSpam.interval * 2);
            if (filtered.length === 0) {
                userMap.delete(oderId);
            } else {
                userMap.set(oderId, filtered);
            }
        });
        if (userMap.size === 0) {
            messageCache.delete(guildId);
        }
    });
}, 30000);

// Check for spam
async function checkSpam(message) {
    if (!config.antiSpam.enabled) return { isSpam: false };

    // Ignore bots
    if (message.author.bot) return { isSpam: false };

    const guildId = message.guild.id;
    const oderId = message.author.id;
    const now = Date.now();

    // Get guild settings
    const guildSettings = await Guild.findOrCreate(guildId);

    // Check if anti-spam is enabled for this guild
    if (!guildSettings.antiSpam.enabled) return { isSpam: false };

    // Check if channel is whitelisted
    if (guildSettings.antiSpam.whitelistedChannels.includes(message.channel.id)) {
        return { isSpam: false };
    }

    // Check if user has whitelisted role
    const memberRoles = message.member.roles.cache.map(r => r.id);
    if (guildSettings.antiSpam.whitelistedRoles.some(r => memberRoles.includes(r))) {
        return { isSpam: false };
    }

    // Check if user is owner
    if (config.ownerIds.includes(oderId)) {
        return { isSpam: false };
    }

    // Get or create message cache for this guild
    if (!messageCache.has(guildId)) {
        messageCache.set(guildId, new Collection());
    }
    const guildCache = messageCache.get(guildId);

    // Get or create timestamps for this user
    if (!guildCache.has(oderId)) {
        guildCache.set(oderId, []);
    }
    const timestamps = guildCache.get(oderId);

    // Add current timestamp
    timestamps.push(now);

    // Filter old timestamps
    const recentMessages = timestamps.filter(time => now - time < config.antiSpam.interval);
    guildCache.set(oderId, recentMessages);

    // Check if spam threshold exceeded
    if (recentMessages.length >= config.antiSpam.maxMessages) {
        return {
            isSpam: true,
            messageCount: recentMessages.length
        };
    }

    return { isSpam: false };
}

// Handle spam detection
async function handleSpam(message, client) {
    try {
        const member = message.member;
        const guildSettings = await Guild.findOrCreate(message.guild.id);

        // Delete spam messages if configured
        if (config.antiSpam.deleteMessages) {
            try {
                await message.delete();
            } catch (err) {
                // Message might already be deleted
            }
        }

        // Try to mute the user
        if (guildSettings.mutedRoleId) {
            try {
                const mutedRole = await message.guild.roles.fetch(guildSettings.mutedRoleId);
                if (mutedRole) {
                    await member.roles.add(mutedRole);

                    // Update user database
                    const User = require('../models/User');
                    const user = await User.findOrCreate(member.id, message.guild.id);
                    user.isMuted = true;
                    user.muteExpires = new Date(Date.now() + config.antiSpam.muteTime);
                    await user.save();

                    // Send warning
                    await message.channel.send({
                        content: `⚠️ ${member} has been muted for ${config.antiSpam.muteTime / 60000} minutes for spamming!`,
                        allowedMentions: { users: [] }
                    });

                    // Auto unmute after duration
                    setTimeout(async () => {
                        try {
                            await member.roles.remove(mutedRole);
                            const updatedUser = await User.findOne({ oderId: member.id, guildId: message.guild.id });
                            if (updatedUser) {
                                updatedUser.isMuted = false;
                                updatedUser.muteExpires = null;
                                await updatedUser.save();
                            }
                        } catch (err) {
                            console.error('Auto unmute error:', err);
                        }
                    }, config.antiSpam.muteTime);
                }
            } catch (err) {
                console.error('Mute error:', err);
            }
        } else {
            // No muted role, use timeout
            try {
                await member.timeout(config.antiSpam.muteTime, 'Spam');
                await message.channel.send({
                    content: `⚠️ ${member} has been timed out for ${config.antiSpam.muteTime / 60000} minutes for spamming!`,
                    allowedMentions: { users: [] }
                });
            } catch (err) {
                console.error('Timeout error:', err);
            }
        }
    } catch (error) {
        console.error('Spam handling error:', error);
    }
}

// Reset user cache (for when user is punished)
function resetUserCache(guildId, oderId) {
    const guildCache = messageCache.get(guildId);
    if (guildCache) {
        guildCache.delete(oderId);
    }
}

module.exports = {
    checkSpam,
    handleSpam,
    resetUserCache
};
