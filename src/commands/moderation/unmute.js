const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isModerator, canModerateTarget } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove timeout from a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('user').setDescription('User to unmute').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({ embeds: [errorEmbed('Error', 'User not in server.')], ephemeral: true });
        }

        if (!member.isCommunicationDisabled()) {
            return interaction.reply({ embeds: [errorEmbed('Error', 'User is not muted.')], ephemeral: true });
        }

        try {
            await member.timeout(null, `${reason} | By: ${interaction.user.tag}`);
            logger.moderation('UNMUTE', interaction.user.id, user.id, interaction.guild.id, reason);

            try {
                await user.send({
                    embeds: [new EmbedBuilder()
                        .setColor(config.colors.success)
                        .setTitle('🔊 Unmuted')
                        .setDescription(`You have been unmuted in **${interaction.guild.name}**`)
                        .setTimestamp()]
                });
            } catch { }

            return interaction.reply({ embeds: [successEmbed('Unmuted', `**${user.tag}** has been unmuted.`)] });
        } catch (error) {
            console.error('Unmute error:', error);
            return interaction.reply({ embeds: [errorEmbed('Error', 'Failed to unmute user.')], ephemeral: true });
        }
    }
};
