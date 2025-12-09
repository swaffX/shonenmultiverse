const { EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const { assignLevelRole } = require('./statsEmbedSystem');
const XP_PER_MESSAGE = 15;
const XP_PER_VOICE_MINUTE = 5;
const XP_COOLDOWN = 60000; // 1 minute between XP gains
const LEVEL_CHANNEL_ID = '1448093485205815437';

// Level Roles (level -> roleId mapping)
const LEVEL_ROLES = {
    5: null,   // Will be created
    10: null,
    15: null,
    20: null,
    25: null,
    30: null,
    50: null,
    75: null,
    100: null
};

// Track active voice users
const activeVoiceUsers = new Map();

/**
 * Calculate required XP for a level
 */
function getRequiredXP(level) {
    return Math.floor(100 * Math.pow(level, 1.5));
}

/**
 * Calculate level from XP
 */
function getLevelFromXP(xp) {
    let level = 1;
    while (xp >= getRequiredXP(level)) {
        xp -= getRequiredXP(level);
        level++;
    }
    return level;
}

/**
 * Handle message XP
 */
async function handleMessageXP(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    try {
        const user = await User.findOrCreate(message.author.id, message.guild.id);

        // Check weekly reset
        await checkWeeklyReset(user);

        // Update message counts
        user.totalMessages += 1;
        user.weeklyMessages += 1;

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
    if (duration < 1) {
        activeVoiceUsers.delete(key);
        return;
    }

    try {
        const user = await User.findOrCreate(member.id, guildId);

        // Check weekly reset
        await checkWeeklyReset(user);

        // Update voice time
        user.totalVoiceTime += duration;
        user.weeklyVoiceTime += duration;

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

    activeVoiceUsers.delete(key);
}

/**
 * Send level up message
 */
async function sendLevelUpMessage(guild, user, level, client) {
    const channel = guild.channels.cache.get(LEVEL_CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setAuthor({
            name: '🎉 Level Up!',
            iconURL: user.displayAvatarURL({ dynamic: true })
        })
        .setDescription([
            `**${user.tag}** has reached **Level ${level}**!`,
            '',
            `Keep chatting and being active to level up more! 🚀`
        ].join('\n'))
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setTimestamp();

    await channel.send({ content: `<@${user.id}>`, embeds: [embed] });
}

/**
 * Check and assign level roles
 */
async function checkLevelRoles(member, level) {
    await assignLevelRole(member, level);
}

/**
 * Check if weekly reset is needed
 */
async function checkWeeklyReset(user) {
    const now = new Date();
    const resetDay = 1; // Monday
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
 * Get ISO week number
 */
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
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

/**
 * Calculate total XP needed to reach a level
 */
function sumXPToLevel(level) {
    let total = 0;
    for (let i = 1; i <= level; i++) {
        total += getRequiredXP(i);
    }
    return total;
}

/**
 * Format duration
 */
function formatDuration(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
}

module.exports = {
    handleMessageXP,
    handleVoiceXP,
    getUserRank,
    getRequiredXP,
    formatDuration,
    LEVEL_ROLES,
    XP_PER_MESSAGE,
    XP_PER_VOICE_MINUTE
};
