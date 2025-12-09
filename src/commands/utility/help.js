const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all bot commands'),

    async execute(interaction, client) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('📚 Shonen Multiverse Bot')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '⚙️ Admin', value: '`/reactionrole` `/rules` `/info` `/embed`', inline: false },
                { name: '🔨 Moderation', value: '`/ban` `/kick` `/mute` `/unmute` `/warn` `/clear`', inline: false },
                { name: '🎉 Fun', value: '`/giveaway` `/poll`', inline: false },
                { name: '🔧 Utility', value: '`/serverinfo` `/help`', inline: false }
            )
            .addFields({
                name: '🔗 Links',
                value: `[Game](${config.game.robloxLink}) • [Group](${config.game.groupLink})`,
                inline: false
            })
            .setFooter({ text: 'Shonen Multiverse' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
