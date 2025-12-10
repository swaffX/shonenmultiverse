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
                // Fallback to Embed if image fails
                const { user, rank, progressXP, neededXP, percentage } = rankData;

                // Create progress bar text
                const filled = Math.floor(percentage / 10);
                const empty = 10 - filled;
                const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

                const embed = new EmbedBuilder()
                    .setColor('#00D166')
                    .setAuthor({ name: targetUser.username, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
                    .setTitle(`Level ${user.level}`)
                    .setDescription(`**Rank #${rank}**`)
                    .addFields(
                        { name: '✨ XP', value: `${user.xp.toLocaleString()}`, inline: true },
                        { name: '� Progress', value: `${progressBar} ${percentage}%`, inline: true },
                        { name: '📈 Next Level', value: `${progressXP}/${neededXP} XP`, inline: true }
                    )
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

                await interaction.editReply({ content: '⚠️ Could not generate image, showing basic stats:', embeds: [embed] });
            }
        } catch (error) {
            console.error('Rank command error:', error);
            await interaction.editReply('❌ An error occurred while fetching rank.');
        }
    },
};
