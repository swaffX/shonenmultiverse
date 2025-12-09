const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');
const { isModerator, canModerateTarget } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Manage user warnings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(sub => sub
            .setName('add')
            .setDescription('Add a warning')
            .addUserOption(opt => opt.setName('user').setDescription('User to warn').setRequired(true))
            .addStringOption(opt => opt.setName('reason').setDescription('Warning reason').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('Remove a warning')
            .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
            .addIntegerOption(opt => opt.setName('number').setDescription('Warning # to remove').setMinValue(1).setRequired(true)))
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('View warnings')
            .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('clear')
            .setDescription('Clear all warnings')
            .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))),

    async execute(interaction) {
        if (!isModerator(interaction.member)) {
            return interaction.reply({ embeds: [errorEmbed('Denied', 'Moderator permission required.')], ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (member && !canModerateTarget(interaction.member, member)) {
            return interaction.reply({ embeds: [errorEmbed('Error', 'Cannot warn higher ranked member.')], ephemeral: true });
        }

        const userData = await User.findOrCreate(user.id, interaction.guild.id);

        if (sub === 'add') {
            const reason = interaction.options.getString('reason');
            userData.warnings.push({ moderatorId: interaction.user.id, reason, date: new Date() });
            await userData.save();

            logger.moderation('WARN', interaction.user.id, user.id, interaction.guild.id, reason);

            try {
                await user.send({
                    embeds: [new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setTitle('⚠️ Warning')
                        .setDescription(`You received a warning in **${interaction.guild.name}**`)
                        .addFields({ name: 'Reason', value: reason }, { name: 'Total', value: `${userData.warnings.length}` })
                        .setTimestamp()]
                });
            } catch { }

            return interaction.reply({ embeds: [successEmbed('Warned', `**${user.tag}** warned.\n**Reason:** ${reason}\n**Total:** ${userData.warnings.length}`)] });
        }

        if (sub === 'remove') {
            const num = interaction.options.getInteger('number') - 1;
            if (num < 0 || num >= userData.warnings.length) {
                return interaction.reply({ embeds: [errorEmbed('Error', `Invalid #. User has ${userData.warnings.length} warnings.`)], ephemeral: true });
            }
            const removed = userData.warnings.splice(num, 1)[0];
            await userData.save();
            return interaction.reply({ embeds: [successEmbed('Removed', `Warning #${num + 1} removed.\n**Was:** ${removed.reason}`)] });
        }

        if (sub === 'list') {
            if (userData.warnings.length === 0) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.colors.success).setTitle(`${user.tag} - Warnings`).setDescription('No warnings ✨')
                        .setThumbnail(user.displayAvatarURL()).setTimestamp()], ephemeral: true
                });
            }

            const list = userData.warnings.map((w, i) =>
                `**#${i + 1}** - ${w.reason}\n> By <@${w.moderatorId}> • ${new Date(w.date).toLocaleDateString()}`
            ).join('\n\n');

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(config.colors.warning).setTitle(`${user.tag} - ${userData.warnings.length} Warnings`)
                    .setDescription(list).setThumbnail(user.displayAvatarURL()).setTimestamp()], ephemeral: true
            });
        }

        if (sub === 'clear') {
            const count = userData.warnings.length;
            if (count === 0) return interaction.reply({ embeds: [errorEmbed('Error', 'No warnings to clear.')], ephemeral: true });
            userData.warnings = [];
            await userData.save();
            return interaction.reply({ embeds: [successEmbed('Cleared', `Cleared **${count}** warning(s) from ${user.tag}.`)] });
        }
    }
};
