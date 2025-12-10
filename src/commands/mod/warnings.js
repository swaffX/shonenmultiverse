const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View user warnings')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to check')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');

        const user = await User.findOne({ oderId: targetUser.id, guildId: interaction.guild.id });

        if (!user || !user.warnings || user.warnings.length === 0) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#2ECC71')
                        .setTitle('User Warnings')
                        .setDescription(`✅ **${targetUser.tag}** has no warnings.`)
                ],
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#E67E22')
            .setTitle(`⚠️ Warnings for ${targetUser.tag}`)
            .setFooter({ text: `Total Warnings: ${user.warnings.length}` })
            .setTimestamp();

        // Show last 10 warnings
        const recentWarnings = user.warnings.slice(-10).reverse();

        const description = recentWarnings.map((w, index) => {
            const date = new Date(w.timestamp).toLocaleDateString();
            return `**${index + 1}.** Reason: ${w.reason}\n   By: <@${w.moderatorId}> • Date: ${date}`;
        }).join('\n\n');

        embed.setDescription(description);

        if (user.warnings.length > 10) {
            embed.addFields({ name: 'Note', value: `Showing last 10 of ${user.warnings.length} warnings.` });
        }

        await interaction.reply({ embeds: [embed] });
    }
};
