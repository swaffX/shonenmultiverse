const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const Invite = require('../../models/Invite');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('Lider tablolarını görüntüle')
        .addSubcommand(sub =>
            sub.setName('messages')
                .setDescription('En çok mesaj gönderenler'))
        .addSubcommand(sub =>
            sub.setName('voice')
                .setDescription('En uzun süre sesli kanalda kalanlar'))
        .addSubcommand(sub =>
            sub.setName('weekly')
                .setDescription('Bu haftanın en aktif üyeleri'))
        .addSubcommand(sub =>
            sub.setName('monthly')
                .setDescription('Bu ayın en aktif üyeleri'))
        .addSubcommand(sub =>
            sub.setName('invites')
                .setDescription('En çok davet edenler'))
        .addSubcommand(sub =>
            sub.setName('level')
                .setDescription('En yüksek levelli üyeler')),

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
            await interaction.editReply({ content: '❌ Lider tablosu yüklenemedi.' });
        }
    }
};

async function getMessagesLeaderboard(guild) {
    const users = await User.find({ guildId: guild.id })
        .sort({ totalMessages: -1 })
        .limit(10);

    return createLeaderboardEmbed(
        '💬 En Çok Mesaj Gönderenler',
        users,
        (u, i) => `**${i + 1}.** <@${u.oderId}> — \`${u.totalMessages.toLocaleString()}\` mesaj`,
        '#3498DB'
    );
}

async function getVoiceLeaderboard(guild) {
    const users = await User.find({ guildId: guild.id })
        .sort({ totalVoiceTime: -1 })
        .limit(10);

    return createLeaderboardEmbed(
        '🎤 En Uzun Süre Seste Kalanlar',
        users,
        (u, i) => `**${i + 1}.** <@${u.oderId}> — \`${formatTime(u.totalVoiceTime)}\``,
        '#9B59B6'
    );
}

async function getWeeklyLeaderboard(guild) {
    const users = await User.find({ guildId: guild.id })
        .sort({ weeklyMessages: -1 })
        .limit(10);

    return createLeaderboardEmbed(
        '📅 Bu Haftanın En Aktif Üyeleri',
        users,
        (u, i) => `**${i + 1}.** <@${u.oderId}> — \`${u.weeklyMessages}\` mesaj, \`${formatTime(u.weeklyVoiceTime || 0)}\` ses`,
        '#E67E22'
    );
}

async function getMonthlyLeaderboard(guild) {
    const users = await User.find({ guildId: guild.id })
        .sort({ monthlyMessages: -1 })
        .limit(10);

    return createLeaderboardEmbed(
        '📆 Bu Ayın En Aktif Üyeleri',
        users,
        (u, i) => `**${i + 1}.** <@${u.oderId}> — \`${u.monthlyMessages || 0}\` mesaj`,
        '#1ABC9C'
    );
}

async function getInvitesLeaderboard(guild) {
    const invites = await Invite.getTopInviters(guild.id, 10);

    return createLeaderboardEmbed(
        '📨 En Çok Davet Edenler',
        invites,
        (u, i) => `**${i + 1}.** <@${u.oderId}> — \`${u.validInvites}\` davet`,
        '#2ECC71'
    );
}

async function getLevelLeaderboard(guild) {
    const users = await User.find({ guildId: guild.id })
        .sort({ xp: -1 })
        .limit(10);

    return createLeaderboardEmbed(
        '⭐ En Yüksek Level',
        users,
        (u, i) => `**${i + 1}.** <@${u.oderId}> — Level \`${u.level}\` (\`${Math.floor(u.xp).toLocaleString()}\` XP)`,
        '#F1C40F'
    );
}

function createLeaderboardEmbed(title, data, formatter, color) {
    const description = data.length > 0
        ? data.map((item, index) => formatter(item, index)).join('\n')
        : '*Henüz veri yok.*';

    return new EmbedBuilder()
        .setColor(color)
        .setTitle(`🏆 ${title}`)
        .setDescription(description)
        .setFooter({ text: 'Shonen Multiverse Leaderboard' })
        .setTimestamp();
}

function formatTime(minutes) {
    if (!minutes) return '0dk';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}s ${mins}dk`;
    }
    return `${mins}dk`;
}
