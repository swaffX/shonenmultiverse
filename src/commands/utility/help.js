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
                    name: '🎮 Roblox & Oyun',
                    value: '`/verify` `/status` `/changelog` `/group`',
                    inline: false
                },
                {
                    name: '📊 Level & İstatistik',
                    value: '`/level` `/stats` `/serverinfo`',
                    inline: false
                },
                {
                    name: '🎉 Eğlence',
                    value: '`/poll` `/giveaway`',
                    inline: false
                },
                {
                    name: '🛡️ Moderasyon',
                    value: '`/warn` `/warnings` `/clearwarnings` `/slowmode` `/ban` `/kick` `/mute` `/unmute` `/clear`',
                    inline: false
                },
                {
                    name: '⚙️ Admin & Kurulum',
                    value: '`/event` `/update` `/ticket` `/setup-stats` `/setup-welcome` `/setup-levels` `/setup-booster` `/reactionrole` `/logs` `/embed`',
                    inline: false
                },
                {
                    name: 'ℹ️ Bilgi',
                    value: '`/info` `/roles` `/rules` `/booster`',
                    inline: false
                }
            )
            .setFooter({ text: 'Shonen Multiverse | /command ile detay gör' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
