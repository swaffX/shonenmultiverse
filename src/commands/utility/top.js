const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const Invite = require('../../models/Invite');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('View server leaderboards')
        .addSubcommand(sub =>
            sub.setName('messages')
                .setDescription('Top message senders'))
        .addSubcommand(sub =>
            sub.setName('voice')
                .setDescription('Top voice time'))
        .addSubcommand(sub =>
            sub.setName('weekly')
                .setDescription('This week\'s most active members'))
        .addSubcommand(sub =>
            sub.setName('monthly')
                .setDescription('This month\'s most active members'))
        .addSubcommand(sub =>
            sub.setName('invites')
                .setDescription('Top inviters'))
        .addSubcommand(sub =>
            sub.setName('level')
                .setDescription('Highest level members')),

    async execute(interaction) {
        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();
        let embed;

        try {
            switch (subcommand) {
                case 'messages':
                    embed = await getMessagesLeaderboard(interaction.guild);
                    break;
                case 'voice':
                    embed = await getVoiceLeaderboard(interaction.guild);
                    break;
                case 'weekly':
                    embed = await getWeeklyLeaderboard(interaction.guild);
                    break;
                case 'monthly':
                    embed = await getMonthlyLeaderboard(interaction.guild);
                    break;
                case 'invites':
                    embed = await getInvitesLeaderboard(interaction.guild);
                    break;
                case 'level':
                    embed = await getLevelLeaderboard(interaction.guild);
                    break;
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Top command error:', error);
            await interaction.editReply({ content: '❌ Failed to load leaderboard.' });
        }
    }
};

async function getMessagesLeaderboard(guild) {
    const users = await User.find({ guildId: guild.id })
        .sort({ totalMessages: -1 })
        .limit(10);

    return createModernLeaderboard(
        guild,
        '💬',
        'Message Leaders',
        'Most messages sent all-time',
        users,
        (u, i) => {
            const medal = getMedal(i);
            return `${medal} <@${u.oderId}>\n> 📝 **${u.totalMessages.toLocaleString()}** messages`;
        },
        '#3498DB'
    );
}

async function getVoiceLeaderboard(guild) {
    const users = await User.find({ guildId: guild.id })
        .sort({ totalVoiceTime: -1 })
        .limit(10);

    return createModernLeaderboard(
        guild,
        '🎤',
        'Voice Champions',
        'Most time spent in voice channels',
        users,
        (u, i) => {
            const medal = getMedal(i);
            return `${medal} <@${u.oderId}>\n> ⏱️ **${formatTime(u.totalVoiceTime)}** in voice`;
        },
        '#9B59B6'
    );
}

async function getWeeklyLeaderboard(guild) {
    const users = await User.find({ guildId: guild.id })
        .sort({ weeklyMessages: -1 })
        .limit(10);

    return createModernLeaderboard(
        guild,
        '📅',
        'Weekly Champions',
        'Most active members this week',
        users,
        (u, i) => {
            const medal = getMedal(i);
            const voiceTime = formatTime(u.weeklyVoiceTime || 0);
            return `${medal} <@${u.oderId}>\n> 📝 **${u.weeklyMessages}** msgs • 🎤 **${voiceTime}**`;
        },
        '#E67E22'
    );
}

async function getMonthlyLeaderboard(guild) {
    const users = await User.find({ guildId: guild.id })
        .sort({ monthlyMessages: -1 })
        .limit(10);

    return createModernLeaderboard(
        guild,
        '📆',
        'Monthly Champions',
        'Most active members this month',
        users,
        (u, i) => {
            const medal = getMedal(i);
            return `${medal} <@${u.oderId}>\n> 📝 **${u.monthlyMessages || 0}** messages`;
        },
        '#1ABC9C'
    );
}

async function getInvitesLeaderboard(guild) {
    const invites = await Invite.getTopInviters(guild.id, 10);

    return createModernLeaderboard(
        guild,
        '📨',
        'Top Recruiters',
        'Members who brought the most people',
        invites,
        (u, i) => {
            const medal = getMedal(i);
            return `${medal} <@${u.oderId}>\n> 👥 **${u.validInvites}** invites`;
        },
        '#2ECC71'
    );
}

async function getLevelLeaderboard(guild) {
    const users = await User.find({ guildId: guild.id })
        .sort({ xp: -1 })
        .limit(10);

    return createModernLeaderboard(
        guild,
        '⭐',
        'Level Kings',
        'Highest level members in the server',
        users,
        (u, i) => {
            const medal = getMedal(i);
            return `${medal} <@${u.oderId}>\n> 🎖️ **Level ${u.level}** • ✨ **${Math.floor(u.xp).toLocaleString()}** XP`;
        },
        '#F1C40F'
    );
}

function getMedal(index) {
    if (index === 0) return '👑';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `\`#${index + 1}\``;
}

function createModernLeaderboard(guild, emoji, title, subtitle, data, formatter, color) {
    const lines = data.length > 0
        ? data.map((item, index) => formatter(item, index)).join('\n\n')
        : '> *No data yet. Be the first!*';

    return new EmbedBuilder()
        .setColor(color)
        .setAuthor({
            name: 'SHONEN MULTIVERSE',
            iconURL: guild.iconURL({ dynamic: true })
        })
        .setTitle(`${emoji} ${title}`)
        .setDescription(
            `> ${subtitle}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            lines
        )
        .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
        .setFooter({
            text: `🏆 ${guild.name} Leaderboard`,
            iconURL: guild.iconURL({ dynamic: true })
        })
        .setTimestamp();
}

function formatTime(minutes) {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}
