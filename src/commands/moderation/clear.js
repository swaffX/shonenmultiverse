const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Bulk delete messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(opt => opt
            .setName('amount')
            .setDescription('Number of messages to delete (1-100)')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true))
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('Only delete messages from this user')
            .setRequired(false))
        .addStringOption(opt => opt
            .setName('contains')
            .setDescription('Only delete messages containing this text')
            .setRequired(false)),

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');
        const contains = interaction.options.getString('contains')?.toLowerCase();

        await interaction.deferReply({ ephemeral: true });

        try {
            let messages = await interaction.channel.messages.fetch({ limit: 100 });

            // Filter messages
            messages = messages.filter(msg => {
                // Messages older than 14 days can't be bulk deleted
                if (Date.now() - msg.createdTimestamp > 14 * 24 * 60 * 60 * 1000) return false;
                if (targetUser && msg.author.id !== targetUser.id) return false;
                if (contains && !msg.content.toLowerCase().includes(contains)) return false;
                return true;
            });

            // Limit to requested amount
            const toDelete = Array.from(messages.values()).slice(0, amount);

            if (toDelete.length === 0) {
                return interaction.editReply({ embeds: [errorEmbed('Error', 'No messages found matching criteria.')] });
            }

            const deleted = await interaction.channel.bulkDelete(toDelete, true);

            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('🗑️ Messages Cleared')
                .setDescription(`Deleted **${deleted.size}** message(s).`)
                .setTimestamp();

            if (targetUser) embed.addFields({ name: 'From User', value: `${targetUser.tag}`, inline: true });
            if (contains) embed.addFields({ name: 'Containing', value: `"${contains}"`, inline: true });

            await interaction.editReply({ embeds: [embed] });

            // Log in channel (self-deleting)
            const logMsg = await interaction.channel.send({ content: `🗑️ ${interaction.user} cleared ${deleted.size} messages.` });
            setTimeout(() => logMsg.delete().catch(() => { }), 5000);

        } catch (error) {
            console.error('Clear error:', error);
            await interaction.editReply({ embeds: [errorEmbed('Error', 'Failed to delete messages.')] });
        }
    }
};
