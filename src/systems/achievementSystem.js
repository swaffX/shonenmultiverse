const { EmbedBuilder } = require('discord.js');
const Achievement = require('../models/Achievement');
const User = require('../models/User');
const { getUserInvites } = require('./inviteSystem');

// Achievement notification channel
const ACHIEVEMENT_CHANNEL_ID = '1448111611733741710';

// Achievement definitions - ALL ENGLISH
const ACHIEVEMENTS = {
    // Message achievements
    msg_starter: {
        id: 'msg_starter',
        name: '💬 First Step',
        description: 'Send your first message',
        emoji: '💬',
        requirement: { type: 'messages', count: 1 },
        xpReward: 50
    },
    msg_chatter: {
        id: 'msg_chatter',
        name: '🗣️ Chatterbox',
        description: 'Send 100 messages',
        emoji: '🗣️',
        requirement: { type: 'messages', count: 100 },
        xpReward: 200
    },
    msg_talkative: {
        id: 'msg_talkative',
        name: '📢 Talkative',
        description: 'Send 500 messages',
        emoji: '📢',
        requirement: { type: 'messages', count: 500 },
        xpReward: 500
    },
    msg_legend: {
        id: 'msg_legend',
        name: '🏆 Chat Legend',
        description: 'Send 2000 messages',
        emoji: '🏆',
        requirement: { type: 'messages', count: 2000 },
        xpReward: 1500
    },

    // Voice achievements
    voice_listener: {
        id: 'voice_listener',
        name: '🎧 Listener',
        description: 'Stay 1 hour in voice channel',
        emoji: '🎧',
        requirement: { type: 'voice', count: 60 },
        xpReward: 100
    },
    voice_regular: {
        id: 'voice_regular',
        name: '🎤 Voice Artist',
        description: 'Stay 10 hours in voice channel',
        emoji: '🎤',
        requirement: { type: 'voice', count: 600 },
        xpReward: 500
    },
    voice_addict: {
        id: 'voice_addict',
        name: '🎙️ Voice Addict',
        description: 'Stay 50 hours in voice channel',
        emoji: '🎙️',
        requirement: { type: 'voice', count: 3000 },
        xpReward: 2000
    },

    // Level achievements
    level_rookie: {
        id: 'level_rookie',
        name: '⭐ Rookie',
        description: 'Reach Level 5',
        emoji: '⭐',
        requirement: { type: 'level', count: 5 },
        xpReward: 100
    },
    level_warrior: {
        id: 'level_warrior',
        name: '⚔️ Warrior',
        description: 'Reach Level 15',
        emoji: '⚔️',
        requirement: { type: 'level', count: 15 },
        xpReward: 300
    },
    level_master: {
        id: 'level_master',
        name: '👑 Master',
        description: 'Reach Level 30',
        emoji: '👑',
        requirement: { type: 'level', count: 30 },
        xpReward: 750
    },
    level_legend: {
        id: 'level_legend',
        name: '🔥 Legend',
        description: 'Reach Level 50',
        emoji: '🔥',
        requirement: { type: 'level', count: 50 },
        xpReward: 2000
    },

    // Invite achievements
    invite_first: {
        id: 'invite_first',
        name: '🤝 Friendly',
        description: 'Invite your first member',
        emoji: '🤝',
        requirement: { type: 'invites', count: 1 },
        xpReward: 100
    },
    invite_recruiter: {
        id: 'invite_recruiter',
        name: '📣 Recruiter',
        description: 'Invite 5 members',
        emoji: '📣',
        requirement: { type: 'invites', count: 5 },
        xpReward: 300
    },
    invite_influencer: {
        id: 'invite_influencer',
        name: '🌟 Influencer',
        description: 'Invite 25 members',
        emoji: '🌟',
        requirement: { type: 'invites', count: 25 },
        xpReward: 1000
    },

    // Special achievements
    early_bird: {
        id: 'early_bird',
        name: '🐦 Early Bird',
        description: 'Join among the first 100 members',
        emoji: '🐦',
        requirement: { type: 'special', condition: 'early_member' },
        xpReward: 500
    }
};

/**
 * Check and unlock achievements for a user
 */
async function checkAchievements(member, client) {
    try {
        const userId = member.id || member;
        const guildId = member.guild?.id || member.guildId;

        if (!guildId) return [];

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return [];

        const [achievementData, userData] = await Promise.all([
            Achievement.findOrCreate(userId, guildId),
            User.findOne({ oderId: userId, guildId })
        ]);

        // Get invite count from Discord API
        const inviteCount = await getUserInvites(guild, userId);

        const newUnlocks = [];

        for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
            if (achievementData.hasAchievement(id)) continue;

            let unlocked = false;
            const req = achievement.requirement;

            switch (req.type) {
                case 'messages':
                    if (userData && userData.totalMessages >= req.count) unlocked = true;
                    break;
                case 'voice':
                    if (userData && userData.totalVoiceTime >= req.count) unlocked = true;
                    break;
                case 'level':
                    if (userData && userData.level >= req.count) unlocked = true;
                    break;
                case 'invites':
                    if (inviteCount >= req.count) unlocked = true;
                    break;
                case 'special':
                    break;
            }

            if (unlocked) {
                achievementData.unlock(id);
                newUnlocks.push(achievement);

                // Give XP reward
                if (userData && achievement.xpReward) {
                    userData.xp += achievement.xpReward;
                    await userData.save();
                }
            }
        }

        if (newUnlocks.length > 0) {
            await achievementData.save();

            // Send notification
            const channel = guild.channels.cache.get(ACHIEVEMENT_CHANNEL_ID);
            if (channel) {
                for (const achievement of newUnlocks) {
                    await sendAchievementNotification(channel, userId, achievement);
                }
            }
        }

        return newUnlocks;

    } catch (error) {
        console.error('Achievement check error:', error);
        return [];
    }
}

/**
 * Send achievement unlock notification - ALL ENGLISH
 */
async function sendAchievementNotification(channel, userId, achievement) {
    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`${achievement.emoji} Achievement Unlocked!`)
        .setDescription([
            `<@${userId}> unlocked an achievement:`,
            '',
            `**${achievement.name}**`,
            `> ${achievement.description}`,
            '',
            `🎁 **+${achievement.xpReward} XP** earned!`
        ].join('\n'))
        .setTimestamp();

    await channel.send({ embeds: [embed] });
}

/**
 * Get all achievements with user progress
 */
async function getUserAchievements(userId, guildId, guild) {
    const [achievementData, userData] = await Promise.all([
        Achievement.findOrCreate(userId, guildId),
        User.findOne({ oderId: userId, guildId })
    ]);

    // Get invite count from Discord API
    const inviteCount = guild ? await getUserInvites(guild, userId) : 0;

    const result = [];

    for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
        const isUnlocked = achievementData.hasAchievement(id);
        let progress = 0;
        let max = achievement.requirement.count || 1;

        if (!isUnlocked) {
            const req = achievement.requirement;
            switch (req.type) {
                case 'messages':
                    progress = userData?.totalMessages || 0;
                    break;
                case 'voice':
                    progress = userData?.totalVoiceTime || 0;
                    break;
                case 'level':
                    progress = userData?.level || 0;
                    break;
                case 'invites':
                    progress = inviteCount;
                    break;
            }
        }

        result.push({
            ...achievement,
            unlocked: isUnlocked,
            progress: Math.min(progress, max),
            max
        });
    }

    return result;
}

module.exports = {
    ACHIEVEMENTS,
    checkAchievements,
    getUserAchievements
};
