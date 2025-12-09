const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const { isAdmin } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { createLevelRoles, LEVEL_ROLE_CONFIG } = require('../../systems/statsEmbedSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-levels')
        .setDescription('Set up level roles for the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction, client) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need administrator permission.')],
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const roles = await createLevelRoles(interaction.guild);

            const roleList = roles
                .map(r => `Level **${r.level}** → <@&${r.roleId}>`)
                .join('\n');

            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('✅ Level Roles Created')
                .setDescription('The following level roles have been created:')
                .addFields({ name: '🎭 Roles', value: roleList, inline: false })
                .setFooter({ text: 'Users will automatically get these roles as they level up!' });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Setup levels error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Error', 'Failed to create level roles.')]
            });
        }
    }
};
