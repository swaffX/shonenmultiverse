const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set channel slowmode')
        .addIntegerOption(option =>
            option.setName('seconds')
                .setDescription('Slowmode duration in seconds (0 to disable)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)) // 6 hours max
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const seconds = interaction.options.getInteger('seconds');
        const channel = interaction.channel;

        try {
            await channel.setRateLimitPerUser(seconds);

            if (seconds === 0) {
                await interaction.reply({ content: '🐢 Slowmode disabled.', ephemeral: false });
            } else {
                await interaction.reply({ content: `🐢 Slowmode set to **${seconds} seconds**.`, ephemeral: false });
            }
        } catch (error) {
            console.error('Slowmode error:', error);
            await interaction.reply({ content: '❌ Failed to set slowmode.', ephemeral: true });
        }
    }
};
