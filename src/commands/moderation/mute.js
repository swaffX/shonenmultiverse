const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isModerator, canModerateTarget } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const config = require('../../config/config');
const logger = require('../../utils/logger');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Timeout/mute a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('user').setDescription('User to mute').setRequired(true))
        .addStringOption(opt => opt.setName('duration').setDescription('Duration (1m, 1h, 1d, 7d)').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Mute reason').setRequired(false))
        .addBooleanOption(opt => opt.setName('silent').setDescription('Don\'t notify user').setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const durationStr = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const silent = interaction.options.getBoolean('silent') || false;

        const duration = ms(durationStr);
        if (!duration || duration < 1000 || duration > 28 * 24 * 60 * 60 * 1000) {
            return interaction.reply({ embeds: [errorEmbed('Error', 'Duration must be between 1 second and 28 days.')], ephemeral: true });
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({ embeds: [errorEmbed('Error', 'User not in server.')], ephemeral: true });
        }

        if (!canModerateTarget(interaction.member, member)) {
            return interaction.reply({ embeds: [errorEmbed('Error', 'Cannot mute higher ranked member.')], ephemeral: true });
        }

        if (!member.moderatable) {
            return interaction.reply({ embeds: [errorEmbed('Error', 'Cannot mute this user. Check bot permissions.')], ephemeral: true });
        }

        try {
            await member.timeout(duration, `${reason} | By: ${interaction.user.tag}`);
            logger.moderation('MUTE', interaction.user.id, user.id, interaction.guild.id, `${durationStr} - ${reason}`);

            if (!silent) {
                try {
                    await user.send({
                        embeds: [new EmbedBuilder()
                            .setColor(config.colors.warning)
                            .setTitle('🔇 Muted')
                            .setDescription(`You have been muted in **${interaction.guild.name}**`)
                            .addFields({ name: 'Duration', value: durationStr, inline: true }, { name: 'Reason', value: reason, inline: true })
                            .setTimestamp()]
                    });
                } catch { }
            }

            return interaction.reply({ embeds: [successEmbed('Muted', `**${user.tag}** muted for **${durationStr}**\n**Reason:** ${reason}`)] });
        } catch (error) {
            console.error('Mute error:', error);
            return interaction.reply({ embeds: [errorEmbed('Error', 'Failed to mute user.')], ephemeral: true });
        }
    }
};
