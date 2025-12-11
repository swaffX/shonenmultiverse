const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Achievement = require('../models/Achievement');
const User = require('../models/User');
const { getUserInvites } = require('./inviteSystem');

// Achievement notification channel
const ACHIEVEMENT_CHANNEL_ID = '1448111611733741710';

// Achievement definitions - ANIME THEMED for Shonen Multiverse
// Each achievement has a role that will be auto-created
const ACHIEVEMENTS = {
    // Message achievements - Naruto themed (category: messages)
    msg_starter: {
        id: 'msg_starter',
        name: '💬 Academy Student',
        description: 'Send your first message',
        emoji: '💬',
        requirement: { type: 'messages', count: 1 },
        xpReward: 50,
        roleColor: '#95A5A6',
        category: 'messages',
        tier: 1
    },
    msg_chatter: {
        id: 'msg_chatter',
        name: '🗣️ Genin Talker',
        description: 'Send 100 messages',
        emoji: '🗣️',
        requirement: { type: 'messages', count: 100 },
        xpReward: 200,
        roleColor: '#3498DB',
        category: 'messages',
        tier: 2
    },
    msg_talkative: {
        id: 'msg_talkative',
        name: '📢 Chunin Voice',
        description: 'Send 500 messages',
        emoji: '📢',
        requirement: { type: 'messages', count: 500 },
        xpReward: 500,
        roleColor: '#9B59B6',
        category: 'messages',
        tier: 3
    },
    msg_legend: {
        id: 'msg_legend',
        name: '🏆 Hokage\'s Words',
        description: 'Send 2000 messages',
        emoji: '🏆',
        requirement: { type: 'messages', count: 2000 },
        xpReward: 1500,
        roleColor: '#F39C12',
        category: 'messages',
        tier: 4
    },

    // Voice achievements - One Piece themed (category: voice)
    voice_listener: {
        id: 'voice_listener',
        name: '🎧 Cabin Boy',
        description: 'Stay 1 hour in voice channel',
        emoji: '🎧',
        requirement: { type: 'voice', count: 60 },
        xpReward: 100,
        roleColor: '#1ABC9C',
        category: 'voice',
        tier: 1
    },
    voice_regular: {
        id: 'voice_regular',
        name: '🎤 Crew Member',
        description: 'Stay 10 hours in voice channel',
        emoji: '🎤',
        requirement: { type: 'voice', count: 600 },
        xpReward: 500,
        roleColor: '#2ECC71',
        category: 'voice',
        tier: 2
    },
    voice_addict: {
        id: 'voice_addict',
        name: '🎙️ First Mate',
        description: 'Stay 50 hours in voice channel',
        emoji: '🎙️',
        requirement: { type: 'voice', count: 3000 },
        xpReward: 2000,
        roleColor: '#27AE60',
        category: 'voice',
        tier: 3
    },

    // Level achievements - Demon Slayer themed (category: level)
    level_rookie: {
        id: 'level_rookie',
        name: '⭐ Corps Member',
        description: 'Reach Level 5',
        emoji: '⭐',
        requirement: { type: 'level', count: 5 },
        xpReward: 100,
        roleColor: '#E74C3C',
        category: 'level',
        tier: 1
    },
    level_warrior: {
        id: 'level_warrior',
        name: '⚔️ Demon Slayer',
        description: 'Reach Level 15',
        emoji: '⚔️',
        requirement: { type: 'level', count: 15 },
        xpReward: 300,
        roleColor: '#E91E63',
        category: 'level',
        tier: 2
    },
    level_master: {
        id: 'level_master',
        name: '👑 Hashira',
        description: 'Reach Level 30',
        emoji: '👑',
        requirement: { type: 'level', count: 30 },
        xpReward: 750,
        roleColor: '#9C27B0',
        category: 'level',
        tier: 3
    },
    level_legend: {
        id: 'level_legend',
        name: '🔥 Upper Moon',
        description: 'Reach Level 50',
        emoji: '🔥',
        requirement: { type: 'level', count: 50 },
        xpReward: 2000,
        roleColor: '#FF5722',
        category: 'level',
        tier: 4
    },

    // Invite achievements - Bleach themed (category: invites)
    invite_first: {
        id: 'invite_first',
        name: '🤝 Soul Finder',
        description: 'Invite your first member',
        emoji: '🤝',
        requirement: { type: 'invites', count: 1 },
        xpReward: 100,
        roleColor: '#00BCD4',
        category: 'invites',
        tier: 1
    },
    invite_recruiter: {
        id: 'invite_recruiter',
        name: '📣 Soul Reaper',
        description: 'Invite 5 members',
        emoji: '📣',
        requirement: { type: 'invites', count: 5 },
        xpReward: 300,
        roleColor: '#03A9F4',
        category: 'invites',
        tier: 2
    },
    invite_influencer: {
        id: 'invite_influencer',
        name: '🌟 Captain',
        description: 'Invite 25 members',
        emoji: '🌟',
        requirement: { type: 'invites', count: 25 },
        xpReward: 1000,
        roleColor: '#2196F3',
        category: 'invites',
        tier: 3
    }
};

// Cache for role IDs
const roleCache = new Map();

/**
 * Get or create achievement role
 */
async function getOrCreateAchievementRole(guild, achievement) {
    const cacheKey = `${guild.id}_${achievement.id}`;

    // Check cache first
    if (roleCache.has(cacheKey)) {
        const roleId = roleCache.get(cacheKey);
        const role = guild.roles.cache.get(roleId);
        if (role) return role;
    }

    // Check if role exists by name
    const roleName = achievement.name.replace(/[^\w\s]/g, '').trim();
    let role = guild.roles.cache.find(r => r.name === roleName);

    if (!role) {
        try {
            // Create the role
            role = await guild.roles.create({
                name: roleName,
                color: achievement.roleColor,
                reason: `Achievement role: ${achievement.name}`,
                mentionable: false,
                hoist: false
            });
            console.log(`🎭 Created achievement role: ${roleName}`);
        } catch (error) {
            console.error(`Failed to create role ${roleName}:`, error);
            return null;
        }
    }

    // Cache the role ID
    roleCache.set(cacheKey, role.id);
    return role;
}

/**
 * Get all achievements in a category sorted by tier
 */
function getAchievementsInCategory(category) {
    return Object.values(ACHIEVEMENTS)
        .filter(a => a.category === category)
        .sort((a, b) => a.tier - b.tier);
}

/**
 * Remove lower tier roles in same category
 */
async function removeLowerTierRoles(member, category, currentTier) {
    const categoryAchievements = getAchievementsInCategory(category);

    for (const ach of categoryAchievements) {
        if (ach.tier < currentTier) {
            const roleName = ach.name.replace(/[^\w\s]/g, '').trim();
            const role = member.guild.roles.cache.find(r => r.name === roleName);
            if (role && member.roles.cache.has(role.id)) {
                try {
                    await member.roles.remove(role);
                    console.log(`🎭 Removed lower tier role: ${roleName} from ${member.user.tag}`);
                } catch (error) {
                    console.error(`Failed to remove role:`, error);
                }
            }
        }
    }
}

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

        // Get the actual member object
        const actualMember = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
        if (!actualMember) return [];

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

                // Give achievement role
                const role = await getOrCreateAchievementRole(guild, achievement);
                if (role) {
                    try {
                        // Remove lower tier roles in same category first
                        await removeLowerTierRoles(actualMember, achievement.category, achievement.tier);

                        // Add new role
                        await actualMember.roles.add(role);
                        console.log(`🎭 Gave role ${role.name} to ${actualMember.user.tag}`);
                    } catch (error) {
                        console.error(`Failed to add role:`, error);
                    }
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
 * Send achievement unlock notification
 */
async function sendAchievementNotification(channel, userId, achievement) {
    const embed = new EmbedBuilder()
        .setColor(achievement.roleColor || '#FFD700')
        .setTitle(`${achievement.emoji} Achievement Unlocked!`)
        .setDescription([
            `<@${userId}> unlocked an achievement:`,
            '',
            `**${achievement.name}**`,
            `> ${achievement.description}`,
            '',
            `🎁 **+${achievement.xpReward} XP** earned!`,
            `🎭 Role **${achievement.name.replace(/[^\w\s]/g, '').trim()}** awarded!`
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
    getUserAchievements,
    getOrCreateAchievementRole
};
