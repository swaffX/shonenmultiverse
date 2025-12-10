const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const Guild = require('../../models/Guild');
const { getUserRank } = require('../../systems/levelSystem');
const { formatDuration } = require('../../utils/levelUtils');
const { getLevelRoles } = require('../../systems/statsEmbedSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View server leaderboards and your personal stats'),

    async execute(interaction, client) {
        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        // Get leaderboard data
        const topXP = await User.getLeaderboard(guildId, 5);
        const topMessages = await User.getWeeklyMessageLeaders(guildId, 5);
        const topVoice = await User.getWeeklyVoiceLeaders(guildId, 5);

        // Get personal stats
        const rankData = await getUserRank(userId, guildId);
        const { user, rank, progressXP, neededXP, percentage } = rankData;

        // Get user's level role
        const levelRoles = await getLevelRoles(guildId);
        const applicableRole = levelRoles
            .filter(r => r.level <= user.level)
            .sort((a, b) => b.level - a.level)[0];

        const levelRoleText = applicableRole
            ? `<@&${applicableRole.roleId}>`
            : 'None';

        // Build leaderboard strings
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

        const xpLeaders = topXP.slice(0, 5).map((u, i) =>
            `${medals[i]} <@${u.oderId}> • Level **${u.level}**`
        ).join('\n') || '*No data*';

        const msgLeaders = topMessages
            .filter(u => u.weeklyMessages > 0)
            .slice(0, 5)
            .map((u, i) => `${medals[i]} <@${u.oderId}> • \`${u.weeklyMessages}\``)
            .join('\n') || '*No activity*';

        const voiceLeaders = topVoice
            .filter(u => u.weeklyVoiceTime > 0)
            .slice(0, 5)
            .map((u, i) => `${medals[i]} <@${u.oderId}> • \`${formatDuration(u.weeklyVoiceTime)}\``)
            .join('\n') || '*No activity*';

        // Create progress bar
        const filled = Math.floor(percentage / 10);
        const empty = 10 - filled;
        const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

        // Calculate next Monday (weekly reset)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
        const nextMonday = new Date(now);
        nextMonday.setDate(now.getDate() + daysUntilMonday);
        nextMonday.setHours(0, 0, 0, 0);

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({
                name: 'Server Statistics',
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setDescription(`**${interaction.guild.name}** Leaderboards & Your Stats`)
            .addFields(
                {
                    name: '🏆 XP Leaderboard',
                    value: xpLeaders,
                    inline: true
                },
                {
                    name: '💬 Weekly Messages',
                    value: msgLeaders,
                    inline: true
                },
                {
                    name: '🎤 Weekly Voice',
                    value: voiceLeaders,
                    inline: true
                },
                {
                    name: '\u200b',
                    value: `**Your Stats** — <@${userId}>`,
                    inline: false
                },
                {
                    name: '🏆 Rank',
                    value: `#${rank}`,
                    inline: true
                },
                {
                    name: '📊 Level',
                    value: `${user.level}`,
                    inline: true
                },
                {
                    name: '✨ XP',
                    value: `${user.xp.toLocaleString()}`,
                    inline: true
                },
                {
                    name: '📈 Progress',
                    value: `${progressBar} **${percentage}%**\n\`${progressXP}/${neededXP} XP\``,
                    inline: false
                },
                {
                    name: '🎭 Role',
                    value: levelRoleText,
                    inline: true
                },
                {
                    name: '💬 Messages',
                    value: `${user.totalMessages.toLocaleString()}`,
                    inline: true
                },
                {
                    name: '🎤 Voice',
                    value: `${formatDuration(user.totalVoiceTime || 0)}`,
                    inline: true
                },
                {
                    name: '📅 Weekly',
                    value: `💬 \`${user.weeklyMessages || 0}\` msgs • 🎤 \`${formatDuration(user.weeklyVoiceTime || 0)}\`\n⏰ Resets <t:${Math.floor(nextMonday.getTime() / 1000)}:R>`,
                    inline: false
                }
            )
            .setFooter({ text: 'Keep being active to level up!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
