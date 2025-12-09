const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../models/User');
const Guild = require('../models/Guild');
const { formatDuration } = require('./levelSystem');

// Stats channel
const STATS_CHANNEL_ID = '1448093485205815437';

// Level roles configuration
const LEVEL_ROLE_CONFIG = [
    { level: 5, name: '🌱 Newcomer', color: '#95A5A6' },
    { level: 10, name: '⭐ Active', color: '#3498DB' },
    { level: 15, name: '🔥 Regular', color: '#E74C3C' },
    { level: 20, name: '💎 Veteran', color: '#9B59B6' },
    { level: 25, name: '🏆 Elite', color: '#F1C40F' },
    { level: 30, name: '👑 Champion', color: '#E67E22' },
    { level: 50, name: '🌟 Legend', color: '#1ABC9C' },
    { level: 75, name: '⚡ Mythic', color: '#E91E63' },
    { level: 100, name: '🔮 Immortal', color: '#FFD700' }
];

let statsMessageId = null;

/**
 * Create level roles in the guild
 */
async function createLevelRoles(guild) {
    const createdRoles = [];

    for (const config of LEVEL_ROLE_CONFIG) {
        // Check if role already exists
        let role = guild.roles.cache.find(r => r.name === config.name);

        if (!role) {
            role = await guild.roles.create({
                name: config.name,
                color: config.color,
                reason: `Level ${config.level} role`
            });
            console.log(`🎭 Created level role: ${config.name}`);
        }

        createdRoles.push({ level: config.level, roleId: role.id, name: config.name });
    }

    // Save to database
    await Guild.findOneAndUpdate(
        { guildId: guild.id },
        { 'levelSystem.roles': createdRoles },
        { upsert: true }
    );

    return createdRoles;
}

/**
 * Get level roles from database
 */
async function getLevelRoles(guildId) {
    const guildData = await Guild.findOne({ guildId });
    return guildData?.levelSystem?.roles || [];
}

/**
 * Assign level role to member
 */
async function assignLevelRole(member, level) {
    try {
        const levelRoles = await getLevelRoles(member.guild.id);
        if (levelRoles.length === 0) return;

        // Find highest applicable role
        const applicableRoles = levelRoles
            .filter(r => r.level <= level)
            .sort((a, b) => b.level - a.level);

        if (applicableRoles.length === 0) return;

        const targetRole = applicableRoles[0];

        // Remove all other level roles
        for (const roleConfig of levelRoles) {
            if (member.roles.cache.has(roleConfig.roleId) && roleConfig.roleId !== targetRole.roleId) {
                await member.roles.remove(roleConfig.roleId).catch(() => { });
            }
        }

        // Add the target role
        if (!member.roles.cache.has(targetRole.roleId)) {
            await member.roles.add(targetRole.roleId);
            console.log(`🎭 Assigned ${targetRole.name} to ${member.user.tag}`);
        }
    } catch (error) {
        console.error('Assign level role error:', error);
    }
}

/**
 * Initialize stats embed system
 */
async function initStatsEmbed(client) {
    console.log('📊 Stats embed system initializing...');

    // Update every 30 seconds (not every second to avoid rate limits)
    setInterval(async () => {
        await updateStatsEmbed(client);
    }, 30000);

    // Initial update
    setTimeout(() => updateStatsEmbed(client), 5000);
}

/**
 * Update the stats embed
 */
async function updateStatsEmbed(client) {
    try {
        for (const [, guild] of client.guilds.cache) {
            const channel = guild.channels.cache.get(STATS_CHANNEL_ID);
            if (!channel) continue;

            const guildData = await Guild.findOne({ guildId: guild.id });

            // Get leaderboard data
            const topXP = await User.getLeaderboard(guild.id, 5);
            const topMessages = await User.getWeeklyMessageLeaders(guild.id, 5);
            const topVoice = await User.getWeeklyVoiceLeaders(guild.id, 5);

            // Build leaderboard strings
            const xpLeaders = await buildLeaderboard(guild, topXP, 'xp');
            const msgLeaders = await buildLeaderboard(guild, topMessages, 'weeklyMessages');
            const voiceLeaders = await buildLeaderboard(guild, topVoice, 'weeklyVoiceTime');

            // Calculate server totals
            const totalUsers = await User.countDocuments({ guildId: guild.id });
            const totalMessages = await User.aggregate([
                { $match: { guildId: guild.id } },
                { $group: { _id: null, total: { $sum: '$totalMessages' } } }
            ]);
            const totalVoice = await User.aggregate([
                { $match: { guildId: guild.id } },
                { $group: { _id: null, total: { $sum: '$totalVoiceTime' } } }
            ]);

            // Get weekly reset time (next Monday)
            const now = new Date();
            const daysUntilMonday = ((1 - now.getDay()) + 7) % 7 || 7;
            const nextMonday = new Date(now);
            nextMonday.setDate(now.getDate() + daysUntilMonday);
            nextMonday.setHours(0, 0, 0, 0);

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({
                    name: '📊 Server Statistics',
                    iconURL: guild.iconURL({ dynamic: true })
                })
                .setTitle(`${guild.name} Leaderboards`)
                .addFields(
                    {
                        name: '🏆 Top XP (All Time)',
                        value: xpLeaders || '*No data yet*',
                        inline: true
                    },
                    {
                        name: '💬 Weekly Messages',
                        value: msgLeaders || '*No data yet*',
                        inline: true
                    },
                    {
                        name: '🎤 Weekly Voice',
                        value: voiceLeaders || '*No data yet*',
                        inline: true
                    },
                    {
                        name: '📈 Server Totals',
                        value: [
                            `👥 **Active Users:** \`${totalUsers}\``,
                            `💬 **Total Messages:** \`${(totalMessages[0]?.total || 0).toLocaleString()}\``,
                            `🎤 **Total Voice:** \`${formatDuration(totalVoice[0]?.total || 0)}\``
                        ].join('\n'),
                        inline: false
                    }
                )
                .setFooter({
                    text: `Weekly stats reset: ${nextMonday.toLocaleDateString('en-US', { weekday: 'long' })} • Last updated`
                })
                .setTimestamp();

            // Try to edit existing message or send new
            const storedMessageId = guildData?.levelSystem?.statsMessageId;

            if (storedMessageId) {
                try {
                    const message = await channel.messages.fetch(storedMessageId);
                    await message.edit({ embeds: [embed] });
                } catch {
                    // Message deleted, send new
                    const newMsg = await channel.send({ embeds: [embed] });
                    await Guild.findOneAndUpdate(
                        { guildId: guild.id },
                        { 'levelSystem.statsMessageId': newMsg.id }
                    );
                }
            } else {
                const newMsg = await channel.send({ embeds: [embed] });
                await Guild.findOneAndUpdate(
                    { guildId: guild.id },
                    { 'levelSystem.statsMessageId': newMsg.id },
                    { upsert: true }
                );
            }
        }
    } catch (error) {
        console.error('Stats embed update error:', error);
    }
}

/**
 * Build leaderboard string
 */
async function buildLeaderboard(guild, users, field) {
    if (!users || users.length === 0) return null;

    const lines = [];
    const medals = ['🥇', '🥈', '🥉', '4.', '5.'];

    for (let i = 0; i < Math.min(users.length, 5); i++) {
        const user = users[i];
        if (field === 'weeklyMessages' && user.weeklyMessages === 0) continue;
        if (field === 'weeklyVoiceTime' && user.weeklyVoiceTime === 0) continue;

        const member = await guild.members.fetch(user.oderId).catch(() => null);
        const name = member ? member.user.username.substring(0, 12) : 'Unknown';

        let value;
        if (field === 'xp') {
            value = `L${user.level}`;
        } else if (field === 'weeklyMessages') {
            value = `${user.weeklyMessages}`;
        } else if (field === 'weeklyVoiceTime') {
            value = formatDuration(user.weeklyVoiceTime);
        }

        lines.push(`${medals[i]} ${name}: \`${value}\``);
    }

    return lines.length > 0 ? lines.join('\n') : null;
}

module.exports = {
    createLevelRoles,
    getLevelRoles,
    assignLevelRole,
    initStatsEmbed,
    updateStatsEmbed,
    LEVEL_ROLE_CONFIG
};
