const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isModerator, canModerateTarget } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Kick reason').setRequired(false))
        .addBooleanOption(opt => opt.setName('silent').setDescription('Don\'t notify user').setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const silent = interaction.options.getBoolean('silent') || false;

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({ embeds: [errorEmbed('Error', 'User not in server.')], ephemeral: true });
        }

        if (!canModerateTarget(interaction.member, member)) {
            return interaction.reply({ embeds: [errorEmbed('Error', 'Cannot kick higher ranked member.')], ephemeral: true });
        }

        if (!member.kickable) {
            return interaction.reply({ embeds: [errorEmbed('Error', 'Cannot kick this user. Check bot permissions.')], ephemeral: true });
        }

        try {
            if (!silent) {
                try {
                    await user.send({
                        embeds: [new EmbedBuilder()
                            .setColor(config.colors.warning)
                            .setTitle('👢 Kicked')
                            .setDescription(`You have been kicked from **${interaction.guild.name}**`)
                            .addFields({ name: 'Reason', value: reason })
                            .setTimestamp()]
                    });
                } catch { }
            }

            await member.kick(`${reason} | By: ${interaction.user.tag}`);
            logger.moderation('KICK', interaction.user.id, user.id, interaction.guild.id, reason);

            return interaction.reply({ embeds: [successEmbed('Kicked', `**${user.tag}** has been kicked.\n**Reason:** ${reason}`)] });
        } catch (error) {
            console.error('Kick error:', error);
            return interaction.reply({ embeds: [errorEmbed('Error', 'Failed to kick user.')], ephemeral: true });
        }
    }
};
