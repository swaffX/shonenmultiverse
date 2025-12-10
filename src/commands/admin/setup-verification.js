const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-verification')
        .setDescription('Send the verification panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channelId = '1439267075456761906';
        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel) {
            return interaction.editReply('Target channel not found!');
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({
                name: 'Shonen Multiverse Verification',
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setDescription(`## ✅ Verification Required\nWelcome to **${interaction.guild.name}**! To access the full server and sync your roles, please verify your Roblox account.\n\n### 🛡️ Why verify?\n- Get your Roblox rank roles\n- Sync your nickname\n- Access verified-only channels`)
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({ text: 'Secure Verification System' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('start_verification')
                    .setLabel('Verify Account')
                    .setEmoji('🔗')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setLabel('Need Help?')
                    .setEmoji('❔')
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId('verify_help')
            );

        await channel.send({ embeds: [embed], components: [row] });

        await interaction.editReply({ content: '✅ Verification panel sent!', flags: 64 });
    }
};
