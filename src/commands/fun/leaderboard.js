const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');
const { getUserRank, formatDuration } = require('../../systems/levelSystem');

// Allowed channel for level command
const LEVEL_CHANNEL_ID = '1447220694244003880';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View server leaderboards')
        .addSubcommand(sub =>
            sub.setName('levels')
                .setDescription('View XP/Level leaderboard'))
        .addSubcommand(sub =>
            sub.setName('messages')
                .setDescription('View weekly messages leaderboard'))
        .addSubcommand(sub =>
            sub.setName('voice')
                .setDescription('View weekly voice time leaderboard'))
        .addSubcommand(sub =>
            sub.setName('stats')
                .setDescription('View your personal stats')),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'levels') {
            await showLevelLeaderboard(interaction);
        } else if (subcommand === 'messages') {
            await showMessageLeaderboard(interaction);
        } else if (subcommand === 'voice') {
            await showVoiceLeaderboard(interaction);
        } else if (subcommand === 'stats') {
            await showPersonalStats(interaction);
        }
    }
};

async function showLevelLeaderboard(interaction) {
    await interaction.deferReply();

    const users = await User.getLeaderboard(interaction.guild.id, 15);

    if (users.length === 0) {
        return interaction.editReply('No data yet! Start chatting to earn XP.');
    }

    const leaderboard = await Promise.all(users.map(async (user, index) => {
        const member = await interaction.guild.members.fetch(user.oderId).catch(() => null);
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
        const name = member ? member.user.tag : 'Unknown User';
        return `${medal} ${name}\n   Level **${user.level}** • \`${user.xp.toLocaleString()}\` XP`;
    }));

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setAuthor({
            name: '🏆 Level Leaderboard',
            iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setDescription(leaderboard.join('\n\n'))
        .setFooter({ text: `${interaction.guild.name} • Top ${users.length}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function showMessageLeaderboard(interaction) {
    await interaction.deferReply();

    const users = await User.getWeeklyMessageLeaders(interaction.guild.id, 15);

    if (users.length === 0 || users.every(u => u.weeklyMessages === 0)) {
        return interaction.editReply('No messages this week yet!');
    }

    const leaderboard = await Promise.all(users.filter(u => u.weeklyMessages > 0).map(async (user, index) => {
        const member = await interaction.guild.members.fetch(user.oderId).catch(() => null);
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
        const name = member ? member.user.tag : 'Unknown User';
        return `${medal} ${name} • \`${user.weeklyMessages.toLocaleString()}\` messages`;
    }));

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({
            name: '💬 Weekly Message Leaders',
            iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setDescription(leaderboard.join('\n') || 'No data')
        .setFooter({ text: 'Resets every Monday • Top chatters this week' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function showVoiceLeaderboard(interaction) {
    await interaction.deferReply();

    const users = await User.getWeeklyVoiceLeaders(interaction.guild.id, 15);

    if (users.length === 0 || users.every(u => u.weeklyVoiceTime === 0)) {
        return interaction.editReply('No voice activity this week yet!');
    }

    const leaderboard = await Promise.all(users.filter(u => u.weeklyVoiceTime > 0).map(async (user, index) => {
        const member = await interaction.guild.members.fetch(user.oderId).catch(() => null);
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
        const name = member ? member.user.tag : 'Unknown User';
        return `${medal} ${name} • \`${formatDuration(user.weeklyVoiceTime)}\``;
    }));

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({
            name: '🎤 Weekly Voice Leaders',
            iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setDescription(leaderboard.join('\n') || 'No data')
        .setFooter({ text: 'Resets every Monday • Most active in voice' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function showPersonalStats(interaction) {
    await interaction.deferReply();

    const rankData = await getUserRank(interaction.user.id, interaction.guild.id);
    const { user, rank, progressXP, neededXP, percentage } = rankData;

    // Create progress bar
    const filled = Math.floor(percentage / 10);
    const empty = 10 - filled;
    const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({
            name: `${interaction.user.tag}'s Stats`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '🏆 Rank', value: `#${rank}`, inline: true },
            { name: '📊 Level', value: `${user.level}`, inline: true },
            { name: '✨ Total XP', value: `${user.xp.toLocaleString()}`, inline: true },
            { name: '📈 Progress', value: `${progressBar} ${percentage}%\n\`${progressXP}/${neededXP} XP\``, inline: false },
            { name: '💬 Total Messages', value: `${user.totalMessages.toLocaleString()}`, inline: true },
            { name: '🎤 Total Voice', value: formatDuration(user.totalVoiceTime), inline: true },
            { name: '📅 This Week', value: `💬 ${user.weeklyMessages} msgs\n🎤 ${formatDuration(user.weeklyVoiceTime)}`, inline: true }
        )
        .setFooter({ text: 'Keep being active to level up!' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}
