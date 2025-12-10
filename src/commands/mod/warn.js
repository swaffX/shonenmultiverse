const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the warning')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');

        if (targetUser.bot) {
            return interaction.reply({ content: '❌ You cannot warn a bot.', ephemeral: true });
        }

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({ content: '❌ You cannot warn yourself.', ephemeral: true });
        }

        let user = await User.findOne({ oderId: targetUser.id, guildId: interaction.guild.id });
        if (!user) {
            user = new User({ oderId: targetUser.id, guildId: interaction.guild.id });
        }

        // Add warning
        user.warnings.push({
            moderatorId: interaction.user.id,
            reason: reason,
            timestamp: new Date()
        });

        await user.save();

        // Check warning count for auto-action
        const warningCount = user.warnings.length;
        let actionTaken = '';

        if (warningCount >= 3) {
            try {
                const member = await interaction.guild.members.fetch(targetUser.id);
                // Timeout for 1 hour
                await member.timeout(60 * 60 * 1000, 'Reached 3 warnings');
                actionTaken = '\n🚨 **Action Taken:** User timed out for 1 hour (3rd warning)';
            } catch (err) {
                actionTaken = '\n⚠️ Could not timeout user (Missing Permissions)';
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('⚠️ User Warned')
            .addFields(
                { name: 'User', value: `${targetUser.tag}`, inline: true },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Total Warnings', value: `${warningCount}`, inline: true }
            )
            .setFooter({ text: `User ID: ${targetUser.id}` })
            .setTimestamp();

        // Send DM to user
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle(`⚠️ You were warned in ${interaction.guild.name}`)
                .addFields(
                    { name: 'Reason', value: reason },
                    { name: 'Total Warnings', value: `${warningCount}` }
                );
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (e) {
            // DM failed
        }

        await interaction.reply({ embeds: [embed], content: actionTaken ? actionTaken.trim() : null });
    }
};
