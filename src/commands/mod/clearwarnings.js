const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearwarnings')
        .setDescription('Clear warnings for a user')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to clear')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');

        const user = await User.findOne({ oderId: targetUser.id, guildId: interaction.guild.id });

        if (!user || !user.warnings || user.warnings.length === 0) {
            return interaction.reply({ content: '❌ This user has no warnings to clear.', ephemeral: true });
        }

        const warningCount = user.warnings.length;
        user.warnings = [];
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('✅ Warnings Cleared')
            .setDescription(`Cleared **${warningCount}** warnings for ${targetUser.tag}.`)
            .setFooter({ text: `Cleared by ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
