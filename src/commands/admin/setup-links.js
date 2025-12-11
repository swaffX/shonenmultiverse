const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-links')
        .setDescription('Send the official links embed')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channelId = '1448717081972314323';
        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel) {
            return interaction.editReply('❌ Links channel not found!');
        }

        const embed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setAuthor({
                name: 'SHONEN MULTIVERSE',
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTitle('🔗 Official Links')
            .setDescription(
                `> Connect with us across all platforms!\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            )
            .addFields(
                {
                    name: '🎮 Play Our Game',
                    value: `> Experience the ultimate anime adventure!\n> [**Click to Play on Roblox**](${config.game.robloxLink})`,
                    inline: false
                },
                {
                    name: '👥 Join Our Group',
                    value: `> Get exclusive perks and updates!\n> [**Shomei Studios on Roblox**](${config.game.groupLink})`,
                    inline: false
                },
                {
                    name: '🎵 Follow on TikTok',
                    value: `> Behind the scenes & epic moments!\n> [**@shomeistudios**](https://www.tiktok.com/@shomeistudios)`,
                    inline: false
                }
            )
            .setImage('https://cdn.discordapp.com/attachments/531892263652032522/1448720874743267379/Gemini_Generated_Image_df23r5df23r5df23.png')
            .setFooter({
                text: '⭐ Follow us everywhere for the latest updates!',
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Play Game')
                    .setEmoji('🎮')
                    .setStyle(ButtonStyle.Link)
                    .setURL(config.game.robloxLink),
                new ButtonBuilder()
                    .setLabel('Join Group')
                    .setEmoji('👥')
                    .setStyle(ButtonStyle.Link)
                    .setURL(config.game.groupLink),
                new ButtonBuilder()
                    .setLabel('TikTok')
                    .setEmoji('🎵')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://www.tiktok.com/@shomeistudios')
            );

        await channel.send({ embeds: [embed], components: [row] });

        await interaction.editReply({ content: '✅ Links embed sent!', flags: 64 });
    }
};
