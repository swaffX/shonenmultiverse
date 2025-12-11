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
            .setColor('#2B2D31')
            .setAuthor({
                name: 'SHONEN MULTIVERSE',
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTitle('🔐 Account Verification')
            .setDescription(
                `Welcome to **${interaction.guild.name}**!\n\n` +
                `> To unlock the full server experience, you need to verify your Roblox account.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            )
            .addFields(
                {
                    name: '✨ Benefits',
                    value: [
                        '```',
                        '• 🎮 Access to all game channels',
                        '• 🏆 Automatic rank roles from Roblox',
                        '• 📛 Username sync with Roblox',
                        '• 🎁 Exclusive verified member perks',
                        '• 🔒 Access to VIP areas',
                        '```'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⚡ Quick & Secure',
                    value: '> Verification takes only **10 seconds**!\n> We use official Roblox OAuth2.0 - your password is never shared.',
                    inline: false
                }
            )
            .setImage('https://i.imgur.com/sGJfPkK.gif') // Anime banner
            .setFooter({
                text: '🛡️ Powered by Official Roblox OAuth2.0 • 100% Secure',
                iconURL: 'https://cdn.discordapp.com/emojis/1064277018159849514.webp'
            })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('start_verification')
                    .setLabel('Verify with Roblox')
                    .setEmoji('🔗')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setLabel('How It Works')
                    .setEmoji('📖')
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId('verify_help'),
                new ButtonBuilder()
                    .setLabel('Play Game')
                    .setEmoji('🎮')
                    .setStyle(ButtonStyle.Link)
                    .setURL(config.game.robloxLink)
            );

        await channel.send({ embeds: [embed], components: [row] });

        await interaction.editReply({ content: '✅ Verification panel sent!', flags: 64 });
    }
};
