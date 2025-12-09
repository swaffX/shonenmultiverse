const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserRank, formatDuration } = require('../../systems/levelSystem');

// Only allowed in this channel
const LEVEL_CHANNEL_ID = '1447220694244003880';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Check your or someone else\'s level')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check')
                .setRequired(false)),

    async execute(interaction, client) {
        // Check if in correct channel
        if (interaction.channel.id !== LEVEL_CHANNEL_ID) {
            return interaction.reply({
                content: `❌ This command can only be used in <#${LEVEL_CHANNEL_ID}>!`,
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const rankData = await getUserRank(targetUser.id, interaction.guild.id);
        const { user, rank, progressXP, neededXP, percentage } = rankData;

        // Create progress bar
        const filled = Math.floor(percentage / 10);
        const empty = 10 - filled;
        const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setAuthor({
                name: targetUser.tag,
                iconURL: targetUser.displayAvatarURL({ dynamic: true })
            })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🏆 Server Rank', value: `#${rank}`, inline: true },
                { name: '📊 Level', value: `${user.level}`, inline: true },
                { name: '✨ XP', value: `${user.xp.toLocaleString()}`, inline: true },
                { name: '📈 Progress to Next Level', value: `${progressBar} ${percentage}%\n\`${progressXP}/${neededXP} XP\``, inline: false },
                { name: '💬 Messages', value: `${user.totalMessages.toLocaleString()}`, inline: true },
                { name: '🎤 Voice Time', value: formatDuration(user.totalVoiceTime), inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
