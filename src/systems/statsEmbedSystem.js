const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../models/User');
const Guild = require('../models/Guild');
const { formatDuration } = require('../utils/levelUtils');

// Stats channel
const STATS_CHANNEL_ID = '1448093485205815437';

// Level roles configuration - Anime themed (highest first)
const LEVEL_ROLE_CONFIG = [
    { level: 100, name: 'Pirate King', color: '#FFD700' },       // One Piece
    { level: 75, name: 'Hokage', color: '#FF6B35' },             // Naruto
    { level: 50, name: 'Hashira', color: '#E91E63' },            // Demon Slayer
    { level: 40, name: 'Espada', color: '#9B59B6' },             // Bleach
    { level: 30, name: 'Jonin', color: '#3498DB' },              // Naruto
    { level: 25, name: 'Demon Slayer', color: '#E74C3C' },       // Demon Slayer
    { level: 20, name: 'Supernova', color: '#1ABC9C' },          // One Piece
    { level: 15, name: 'Chunin', color: '#F39C12' },             // Naruto
    { level: 10, name: 'Soul Reaper', color: '#9B59B6' },        // Bleach
    { level: 5, name: 'Genin', color: '#95A5A6' }                // Naruto
];

/**
 * Create level roles in the guild
 */
async function createLevelRoles(guild) {
    const createdRoles = [];

    for (const config of LEVEL_ROLE_CONFIG) {
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

        const applicableRoles = levelRoles
            .filter(r => r.level <= level)
            .sort((a, b) => b.level - a.level);

        if (applicableRoles.length === 0) return;

        const targetRole = applicableRoles[0];

        for (const roleConfig of levelRoles) {
            if (member.roles.cache.has(roleConfig.roleId) && roleConfig.roleId !== targetRole.roleId) {
                await member.roles.remove(roleConfig.roleId).catch(() => { });
            }
        }

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

    setInterval(async () => {
        await updateStatsEmbed(client, 'weekly');
    }, 30000);

    setTimeout(() => updateStatsEmbed(client, 'weekly'), 5000);
}

/**
 * Update the stats embed
 */
async function updateStatsEmbed(client, period = 'weekly') {
    try {
        for (const [, guild] of client.guilds.cache) {
            const channel = guild.channels.cache.get(STATS_CHANNEL_ID);
            if (!channel) continue;

            const guildData = await Guild.findOne({ guildId: guild.id });
            const embed = await buildStatsEmbed(guild, period);
            const row = buildPeriodButtons(period);

            const storedMessageId = guildData?.levelSystem?.statsMessageId;

            if (storedMessageId) {
                try {
                    const message = await channel.messages.fetch(storedMessageId);
                    if (message) {
                        await message.edit({ embeds: [embed], components: [row] });
                        continue; // Successfully updated, move to next guild
                    }
                } catch (err) {
                    console.log('⚠️ Stats message not found, creating new one...');
                    // Clear invalid message ID
                    await Guild.findOneAndUpdate(
                        { guildId: guild.id },
                        { 'levelSystem.statsMessageId': null }
                    );
                }
            }

            // Only create new message if we reach here
            const newMsg = await channel.send({ embeds: [embed], components: [row] });
            await Guild.findOneAndUpdate(
                { guildId: guild.id },
                { 'levelSystem.statsMessageId': newMsg.id },
                { upsert: true }
            );
            console.log('📨 New stats embed created and saved');
        }
    } catch (error) {
        console.error('Stats embed update error:', error);
    }
}

/**
 * Build stats embed for given period - EXPANDED VERTICAL FORMAT
 */
async function buildStatsEmbed(guild, period) {
    const topXP = await User.getLeaderboard(guild.id, 5);

    let topMessages, topVoice, periodMsgs, periodVoice;

    if (period === 'weekly') {
        topMessages = await User.getWeeklyMessageLeaders(guild.id, 5);
        topVoice = await User.getWeeklyVoiceLeaders(guild.id, 5);
        periodMsgs = await User.aggregate([
            { $match: { guildId: guild.id } },
            { $group: { _id: null, total: { $sum: '$weeklyMessages' } } }
        ]);
        periodVoice = await User.aggregate([
            { $match: { guildId: guild.id } },
            { $group: { _id: null, total: { $sum: '$weeklyVoiceTime' } } }
        ]);
    } else {
        topMessages = await User.getMonthlyMessageLeaders(guild.id, 5);
        topVoice = await User.getMonthlyVoiceLeaders(guild.id, 5);
        periodMsgs = await User.aggregate([
            { $match: { guildId: guild.id } },
            { $group: { _id: null, total: { $sum: '$monthlyMessages' } } }
        ]);
        periodVoice = await User.aggregate([
            { $match: { guildId: guild.id } },
            { $group: { _id: null, total: { $sum: '$monthlyVoiceTime' } } }
        ]);
    }

    const xpLeaders = await buildLeaderboard(guild, topXP, 'xp');
    const msgLeaders = await buildLeaderboard(guild, topMessages, period === 'weekly' ? 'weeklyMessages' : 'monthlyMessages');
    const voiceLeaders = await buildLeaderboard(guild, topVoice, period === 'weekly' ? 'weeklyVoiceTime' : 'monthlyVoiceTime');

    // Calculate totals
    const totalUsers = await User.countDocuments({ guildId: guild.id });
    const totalMessages = await User.aggregate([
        { $match: { guildId: guild.id } },
        { $group: { _id: null, total: { $sum: '$totalMessages' } } }
    ]);
    const totalVoice = await User.aggregate([
        { $match: { guildId: guild.id } },
        { $group: { _id: null, total: { $sum: '$totalVoiceTime' } } }
    ]);

    // Calculate next reset time
    const now = new Date();
    let nextResetTimestamp;

    if (period === 'weekly') {
        const dayOfWeek = now.getDay();
        const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
        const nextMonday = new Date(now);
        nextMonday.setDate(now.getDate() + daysUntilMonday);
        nextMonday.setHours(0, 0, 0, 0);
        nextResetTimestamp = Math.floor(nextMonday.getTime() / 1000);
    } else {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
        nextResetTimestamp = Math.floor(nextMonth.getTime() / 1000);
    }

    const periodLabel = period === 'weekly' ? 'Weekly' : 'Monthly';

    return new EmbedBuilder()
        .setColor(period === 'weekly' ? '#5865F2' : '#9B59B6')
        .setAuthor({
            name: `📊 Server Statistics — ${periodLabel}`,
            iconURL: guild.iconURL({ dynamic: true })
        })
        .setTitle(guild.name)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .addFields(
            {
                name: '🏆 Top XP (All Time)',
                value: xpLeaders || '*No data yet*',
                inline: false
            },
            {
                name: `💬 ${periodLabel} Top Chatters`,
                value: msgLeaders || '*No activity yet*',
                inline: false
            },
            {
                name: `🎤 ${periodLabel} Voice Champions`,
                value: voiceLeaders || '*No activity yet*',
                inline: false
            },
            {
                name: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                value: '\u200b',
                inline: false
            },
            {
                name: '📈 All Time Statistics',
                value: [
                    `👥 **Tracked Users:** \`${totalUsers}\``,
                    `💬 **Total Messages:** \`${(totalMessages[0]?.total || 0).toLocaleString()}\``,
                    `🎤 **Total Voice Time:** \`${formatDuration(totalVoice[0]?.total || 0)}\``
                ].join('\n'),
                inline: false
            },
            {
                name: `📅 This ${period === 'weekly' ? 'Week' : 'Month'}`,
                value: [
                    `💬 **Messages:** \`${(periodMsgs[0]?.total || 0).toLocaleString()}\``,
                    `🎤 **Voice Time:** \`${formatDuration(periodVoice[0]?.total || 0)}\``,
                    `⏰ **Resets:** <t:${nextResetTimestamp}:R>`
                ].join('\n'),
                inline: false
            }
        )
        .setFooter({ text: 'Last Updated' })
        .setTimestamp();
}

/**
 * Build period switch buttons
 */
function buildPeriodButtons(currentPeriod) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('stats_weekly')
            .setLabel('Weekly')
            .setEmoji('📅')
            .setStyle(currentPeriod === 'weekly' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(currentPeriod === 'weekly'),
        new ButtonBuilder()
            .setCustomId('stats_monthly')
            .setLabel('Monthly')
            .setEmoji('📆')
            .setStyle(currentPeriod === 'monthly' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(currentPeriod === 'monthly')
    );
}

/**
 * Handle stats button interaction - with defer to prevent timeout
 */
async function handleStatsButton(interaction) {
    try {
        await interaction.deferUpdate();

        const period = interaction.customId === 'stats_weekly' ? 'weekly' : 'monthly';
        const embed = await buildStatsEmbed(interaction.guild, period);
        const row = buildPeriodButtons(period);

        await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error('Stats button error:', error);
    }
}

/**
 * Build leaderboard string with mentions - NO ABBREVIATIONS
 */
async function buildLeaderboard(guild, users, field) {
    if (!users || users.length === 0) return null;

    const lines = [];
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

    for (let i = 0; i < Math.min(users.length, 5); i++) {
        const user = users[i];

        if (field === 'weeklyMessages' && (!user.weeklyMessages || user.weeklyMessages === 0)) continue;
        if (field === 'weeklyVoiceTime' && (!user.weeklyVoiceTime || user.weeklyVoiceTime === 0)) continue;
        if (field === 'monthlyMessages' && (!user.monthlyMessages || user.monthlyMessages === 0)) continue;
        if (field === 'monthlyVoiceTime' && (!user.monthlyVoiceTime || user.monthlyVoiceTime === 0)) continue;

        let value;
        if (field === 'xp') {
            value = `Level **${user.level}** • \`${user.xp.toLocaleString()} XP\``;
        } else if (field === 'weeklyMessages' || field === 'monthlyMessages') {
            const count = field === 'weeklyMessages' ? user.weeklyMessages : user.monthlyMessages;
            value = `\`${count}\` messages`;
        } else if (field === 'weeklyVoiceTime' || field === 'monthlyVoiceTime') {
            const time = field === 'weeklyVoiceTime' ? user.weeklyVoiceTime : user.monthlyVoiceTime;
            value = `\`${formatDuration(time)}\``;
        }

        lines.push(`${medals[i]} <@${user.oderId}> — ${value}`);
    }

    return lines.length > 0 ? lines.join('\n') : null;
}

/**
 * Delete user data when they leave
 */
async function deleteUserData(userId, guildId) {
    try {
        await User.deleteOne({ oderId: userId, guildId });
        console.log(`🗑️ Deleted data for user ${userId} from guild ${guildId}`);
    } catch (error) {
        console.error('Delete user data error:', error);
    }
}

module.exports = {
    createLevelRoles,
    getLevelRoles,
    assignLevelRole,
    initStatsEmbed,
    updateStatsEmbed,
    handleStatsButton,
    deleteUserData,
    LEVEL_ROLE_CONFIG
};
