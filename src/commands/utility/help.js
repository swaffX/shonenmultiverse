const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all bot commands'),

    async execute(interaction, client) {
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('📚 Shonen Multiverse Bot - Commands')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                {
                    name: '🛡️ Moderation',
                    value: '`/warn` `/warnings` `/clearwarnings` `/slowmode` `/ban` `/kick` `/mute` `/unmute` `/clear`',
                    inline: false
                },
                {
                    name: '⚙️ Admin & Setup',
                    value: '`/event` `/ticket` `/setup-stats` `/setup-welcome` `/setup-levels` `/setup-booster` `/reactionrole` `/logs` `/embed`',
                    inline: false
                },
                {
                    name: 'ℹ️ Information',
                    value: '`/status` (Game) `/serverinfo` `/info` `/roles` `/rules` `/booster`',
                    inline: false
                },
                {
                    name: '🎉 Levels & Fun',
                    value: '`/level` `/poll` `/giveaway`',
                    inline: false
                }
            )
            .setFooter({ text: 'Use /command to see more details' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
