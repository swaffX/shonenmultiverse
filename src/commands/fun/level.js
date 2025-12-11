const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getUserRank, formatDuration } = require('../../systems/levelSystem');
const { createRankCard } = require('../../systems/rankCardSystem');

// Only allowed in this channel
const LEVEL_CHANNEL_ID = '1447220694244003880';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Shows your current level and rank card.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check')
                .setRequired(false)),

    async execute(interaction) {
        // Check if in correct channel (if configured)
        if (LEVEL_CHANNEL_ID && interaction.channel.id !== LEVEL_CHANNEL_ID) {
            return interaction.reply({
                content: `❌ This command can only be used in <#${LEVEL_CHANNEL_ID}>!`,
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;

        if (targetUser.bot) {
            return interaction.editReply('🤖 Bots do not gain XP!');
        }

        const rankData = await getUserRank(targetUser.id, interaction.guild.id);

        if (!rankData) {
            return interaction.editReply('❌ User has no XP yet.');
        }

        try {
            // Try to generate image
            const attachment = await createRankCard(targetUser, rankData);

            if (attachment) {
                await interaction.editReply({ files: [attachment] });
            } else {
                // Modern fallback embed
                const { user, rank, progressXP, neededXP, percentage } = rankData;

                // Create visual progress bar
                const barLength = 12;
                const filled = Math.floor((percentage / 100) * barLength);
                const empty = barLength - filled;
                const progressBar = '▓'.repeat(filled) + '░'.repeat(empty);

                const embed = new EmbedBuilder()
                    .setColor('#2B2D31')
                    .setAuthor({
                        name: 'SHONEN MULTIVERSE',
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    })
                    .setTitle(`${targetUser.username}'s Profile`)
                    .setDescription(
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `**🏆 Server Rank:** \`#${rank}\`\n\n` +
                        `**🎖️ Level:** \`${user.level}\`\n\n` +
                        `**✨ Total XP:** \`${Math.floor(user.xp).toLocaleString()}\`\n\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                    )
                    .addFields(
                        {
                            name: '📊 Level Progress',
                            value: [
                                '```',
                                `${progressBar} ${percentage}%`,
                                ``,
                                `${progressXP.toLocaleString()} / ${neededXP.toLocaleString()} XP`,
                                '```'
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '📈 Stats',
                            value: `> 💬 Messages: \`${(user.totalMessages || 0).toLocaleString()}\`\n> 🎤 Voice: \`${formatVoiceTime(user.totalVoiceTime || 0)}\``,
                            inline: false
                        }
                    )
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
                    .setFooter({
                        text: '⚠️ Image generation failed - showing stats',
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Rank command error:', error);
            await interaction.editReply('❌ An error occurred while fetching rank.');
        }
    },
};

function formatVoiceTime(minutes) {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}
