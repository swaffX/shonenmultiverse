const { EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const { formatDuration, getRequiredXP, getLevelFromXP, sumXPToLevel, getWeekNumber } = require('../utils/levelUtils');

// XP Settings
const XP_PER_MESSAGE = 15;
const XP_PER_VOICE_MINUTE = 2;
const XP_COOLDOWN = 60000; // 1 minute between XP gains
const LEVEL_CHANNEL_ID = '1448111611733741710';

// Track active voice users
const activeVoiceUsers = new Map();

/**
 * Initialize voice tracking - load existing users in voice channels
 */
async function initVoiceTracking(client) {
    console.log('🎤 Initializing voice tracking...');

    // Load users already in voice channels
    for (const [, guild] of client.guilds.cache) {
        for (const [, channel] of guild.channels.cache) {
            if (channel.isVoiceBased() && channel.members) {
                for (const [, member] of channel.members) {
                    if (!member.user.bot) {
                        const key = `${member.id}-${guild.id}`;
                        activeVoiceUsers.set(key, {
                            joinTime: Date.now(),
                            channelId: channel.id
                        });
                        console.log(`🎤 Tracking ${member.user.tag} in ${channel.name}`);
                    }
                }
            }
        }
    }

    // Process voice sessions periodically (every 1 minute for real-time updates)
    setInterval(async () => {
        await processActiveVoiceSessions(client);
    }, 60000); // 1 minute

    console.log(`🎤 Voice tracking initialized. Tracking ${activeVoiceUsers.size} users.`);
}

/**
 * Process all active voice sessions periodically
 */
async function processActiveVoiceSessions(client) {
    const now = Date.now();

    for (const [key, session] of activeVoiceUsers.entries()) {
        const [userId, guildId] = key.split('-');
        const duration = Math.floor((now - session.joinTime) / 60000); // minutes

        if (duration < 1) continue;

        try {
            const guild = client.guilds.cache.get(guildId);
            if (!guild) continue;

            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) {
                activeVoiceUsers.delete(key);
                continue;
            }

            // Check if still in voice
            if (!member.voice.channel) {
                activeVoiceUsers.delete(key);
                continue;
            }

            const user = await User.findOrCreate(userId, guildId);

            // Check weekly and monthly reset
            await checkWeeklyReset(user);
            await checkMonthlyReset(user);

            // Update voice time
            user.totalVoiceTime += duration;
            user.weeklyVoiceTime += duration;
            user.monthlyVoiceTime = (user.monthlyVoiceTime || 0) + duration;

            // Add XP for voice
            const xpGained = duration * XP_PER_VOICE_MINUTE;
            const oldLevel = user.level;
            user.xp += xpGained;

            // Calculate new level
            const newLevel = getLevelFromXP(user.xp);

            // Check for level up
            if (newLevel > oldLevel) {
                user.level = newLevel;
                await sendLevelUpMessage(guild, member.user, newLevel, client);
                await checkLevelRoles(member, newLevel);
            }

            await user.save();

            // Reset join time for next interval
            activeVoiceUsers.set(key, {
                joinTime: now,
                channelId: session.channelId
            });

            console.log(`🎤 ${member.user.tag} gained ${xpGained} XP for ${duration}m in voice (periodic)`);
        } catch (error) {
            console.error('Periodic voice XP error:', error);
        }
    }
}

/**
 * Handle message XP
 */
async function handleMessageXP(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    try {
        const user = await User.findOrCreate(message.author.id, message.guild.id);

        // Check weekly and monthly reset
        await checkWeeklyReset(user);
        await checkMonthlyReset(user);

        // Update message counts
        user.totalMessages += 1;
        user.weeklyMessages += 1;
        user.monthlyMessages = (user.monthlyMessages || 0) + 1;

        // Update channel stats
        const channelCount = user.channelStats.get(message.channel.id) || 0;
        user.channelStats.set(message.channel.id, channelCount + 1);

        // Check XP cooldown
        const now = new Date();
        if (user.lastXpGain && (now - user.lastXpGain) < XP_COOLDOWN) {
            await user.save();
            return;
        }

        // Add XP
        const oldLevel = user.level;
        user.xp += XP_PER_MESSAGE;
        user.lastXpGain = now;

        // Calculate new level
        const newLevel = getLevelFromXP(user.xp);

        // Check for level up
        if (newLevel > oldLevel) {
            user.level = newLevel;
            await sendLevelUpMessage(message.guild, message.author, newLevel, client);
            await checkLevelRoles(message.member, newLevel);
        }

        await user.save();
    } catch (error) {
        console.error('Message XP error:', error);
    }
}

/**
 * Handle voice state update for XP
 */
async function handleVoiceXP(oldState, newState, client) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    const guildId = newState.guild.id;
    const key = `${member.id}-${guildId}`;

    // User joined voice channel
    if (!oldState.channel && newState.channel) {
        activeVoiceUsers.set(key, {
            joinTime: Date.now(),
            channelId: newState.channel.id
        });
        console.log(`🎤 ${member.user.tag} joined voice channel`);
    }
    // User left voice channel
    else if (oldState.channel && !newState.channel) {
        await processVoiceSession(member, guildId, key, client);
    }
    // User switched channels
    else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        await processVoiceSession(member, guildId, key, client);
        activeVoiceUsers.set(key, {
            joinTime: Date.now(),
            channelId: newState.channel.id
        });
    }
}

/**
 * Process voice session and award XP
 */
async function processVoiceSession(member, guildId, key, client) {
    const session = activeVoiceUsers.get(key);
    if (!session) return;

    const duration = Math.floor((Date.now() - session.joinTime) / 60000); // minutes
    activeVoiceUsers.delete(key);

    if (duration < 1) return;

    try {
        const user = await User.findOrCreate(member.id, guildId);

        // Check weekly and monthly reset
        await checkWeeklyReset(user);
        await checkMonthlyReset(user);

        // Update voice time
        user.totalVoiceTime += duration;
        user.weeklyVoiceTime += duration;
        user.monthlyVoiceTime = (user.monthlyVoiceTime || 0) + duration;

        // Add XP for voice
        const xpGained = duration * XP_PER_VOICE_MINUTE;
        const oldLevel = user.level;
        user.xp += xpGained;

        // Calculate new level
        const newLevel = getLevelFromXP(user.xp);

        // Check for level up
        if (newLevel > oldLevel) {
            user.level = newLevel;
            await sendLevelUpMessage(member.guild, member.user, newLevel, client);
            await checkLevelRoles(member, newLevel);
        }

        await user.save();
        console.log(`🎤 ${member.user.tag} gained ${xpGained} XP for ${duration}m in voice`);
    } catch (error) {
        console.error('Voice XP error:', error);
    }
}

/**
 * Send level up message - Modern Design
 */
async function sendLevelUpMessage(guild, user, level, client) {
    const channel = guild.channels.cache.get(LEVEL_CHANNEL_ID);
    if (!channel) return;

    // Get next level XP requirement
    const nextLevelXP = getRequiredXP(level);

    // Create modern gradient-style embed
    const embed = new EmbedBuilder()
        .setColor('#00D166')
        .setAuthor({
            name: 'LEVEL UP!',
            iconURL: 'https://cdn.discordapp.com/emojis/1070968752157892678.gif'
        })
        .setDescription([
            `### 🎊 Congratulations <@${user.id}>!`,
            '',
            `You've advanced to **Level ${level}**`,
            '',
            `━━━━━━━━━━━━━━━━━━━━━━`,
            '',
            `📊 **Next Goal:** Level ${level + 1}`,
            `✨ **XP Needed:** \`${nextLevelXP.toLocaleString()} XP\``,
            '',
            `*Keep chatting and being active!*`
        ].join('\n'))
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setImage('https://media.discordapp.net/attachments/1070968752157892678/level-up-banner.gif')
        .setFooter({ text: `${guild.name} • Level System`, iconURL: guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    await channel.send({ content: `<@${user.id}>`, embeds: [embed] });
}

/**
 * Check and assign level roles
 */
async function checkLevelRoles(member, level) {
    // Lazy require to avoid circular dependency
    const { assignLevelRole } = require('./statsEmbedSystem');
    await assignLevelRole(member, level);
}

/**
 * Check if weekly reset is needed
 */
async function checkWeeklyReset(user) {
    const now = new Date();
    const lastReset = new Date(user.weeklyResetAt);

    // Check if it's a new week
    const currentWeek = getWeekNumber(now);
    const lastWeek = getWeekNumber(lastReset);

    if (currentWeek !== lastWeek) {
        user.weeklyMessages = 0;
        user.weeklyVoiceTime = 0;
        user.weeklyResetAt = now;
    }
}

/**
 * Check if monthly reset is needed
 */
async function checkMonthlyReset(user) {
    const now = new Date();
    const lastReset = new Date(user.monthlyResetAt || now);

    // Check if it's a new month
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        user.monthlyMessages = 0;
        user.monthlyVoiceTime = 0;
        user.monthlyResetAt = now;
    }
}

/**
 * Get user rank data
 */
async function getUserRank(userId, guildId) {
    const user = await User.findOrCreate(userId, guildId);
    const rank = await User.countDocuments({
        guildId,
        xp: { $gt: user.xp }
    }) + 1;

    const currentLevelXP = user.level > 1
        ? sumXPToLevel(user.level - 1)
        : 0;
    const nextLevelXP = sumXPToLevel(user.level);
    const progressXP = user.xp - currentLevelXP;
    const neededXP = nextLevelXP - currentLevelXP;

    return {
        user,
        rank,
        progressXP,
        neededXP,
        percentage: Math.floor((progressXP / neededXP) * 100)
    };
}

module.exports = {
    initVoiceTracking,
    handleMessageXP,
    handleVoiceXP,
    getUserRank,
    XP_PER_MESSAGE,
    XP_PER_VOICE_MINUTE
};
