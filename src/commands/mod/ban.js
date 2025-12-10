const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isModerator, canModerateTarget } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Ban reason').setRequired(false))
        .addIntegerOption(opt => opt.setName('delete_days').setDescription('Delete message history (days)').setMinValue(0).setMaxValue(7).setRequired(false))
        .addBooleanOption(opt => opt.setName('silent').setDescription('Don\'t notify user').setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteDays = interaction.options.getInteger('delete_days') || 0;
        const silent = interaction.options.getBoolean('silent') || false;

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (member) {
            if (!canModerateTarget(interaction.member, member)) {
                return interaction.reply({ embeds: [errorEmbed('Error', 'Cannot ban higher ranked member.')], ephemeral: true });
            }
            if (!member.bannable) {
                return interaction.reply({ embeds: [errorEmbed('Error', 'Cannot ban this user. Check bot permissions.')], ephemeral: true });
            }
        }

        try {
            if (!silent) {
                try {
                    await user.send({
                        embeds: [new EmbedBuilder()
                            .setColor(config.colors.error)
                            .setTitle('🔨 Banned')
                            .setDescription(`You have been banned from **${interaction.guild.name}**`)
                            .addFields({ name: 'Reason', value: reason })
                            .setTimestamp()]
                    });
                } catch { }
            }

            await interaction.guild.members.ban(user, { reason: `${reason} | By: ${interaction.user.tag}`, deleteMessageDays: deleteDays });
            logger.moderation('BAN', interaction.user.id, user.id, interaction.guild.id, reason);

            return interaction.reply({ embeds: [successEmbed('Banned', `**${user.tag}** has been banned.\n**Reason:** ${reason}`)] });
        } catch (error) {
            console.error('Ban error:', error);
            return interaction.reply({ embeds: [errorEmbed('Error', 'Failed to ban user.')], ephemeral: true });
        }
    }
};
