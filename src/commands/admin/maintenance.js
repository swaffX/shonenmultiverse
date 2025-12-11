const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActivityType } = require('discord.js');
const BotState = require('../../models/BotState');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maintenance')
        .setDescription('Toggle maintenance mode (Owner Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        // Double check owner permissions (redundant but safe)
        if (!config.ownerIds.includes(interaction.user.id)) {
            return interaction.reply({
                content: '❌ Only bot owners can use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Get or create state
            let state = await BotState.findOne({ clientId: client.user.id });
            if (!state) {
                state = new BotState({ clientId: client.user.id });
            }

            // Toggle mode
            state.maintenanceMode = !state.maintenanceMode;
            await state.save();

            // Update client state
            client.maintenanceMode = state.maintenanceMode;

            // Update presence immediately
            if (client.maintenanceMode) {
                client.user.setPresence({
                    activities: [{ name: 'MAINTENANCE', type: ActivityType.Playing }],
                    status: 'dnd'
                });
            } else {
                client.user.setPresence({
                    activities: [{ name: config.statusMessages[0].name, type: ActivityType.Playing }],
                    status: 'online'
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(client.maintenanceMode ? '⛔ Maintenance Enabled' : '✅ Maintenance Disabled')
                .setDescription(client.maintenanceMode
                    ? 'The bot is now in maintenance mode. Only owners can use commands.'
                    : 'The bot is now in normal mode. All commands are available.')
                .setColor(client.maintenanceMode ? config.colors.error : config.colors.success)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Maintenance toggle error:', error);
            await interaction.editReply({ content: '❌ An error occurred while toggling maintenance mode.' });
        }
    }
};
