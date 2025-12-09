const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isAdmin, isOwner } = require('../../utils/permissions');
const { errorEmbed } = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Send a custom embed message')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Embed title')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Embed content')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Color (hex code, e.g., #FF0000)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('image')
                .setDescription('Image URL')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('thumbnail')
                .setDescription('Thumbnail URL')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('footer')
                .setDescription('Footer text')
                .setRequired(false)),

    async execute(interaction, client) {
        if (!isAdmin(interaction.member) && !isOwner(interaction.user.id)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You don\'t have permission to use this command.')],
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const color = interaction.options.getString('color') || '#FF4444';
            const image = interaction.options.getString('image');
            const thumbnail = interaction.options.getString('thumbnail');
            const footer = interaction.options.getString('footer');

            // Validate color
            let validColor = color;
            if (!color.startsWith('#')) {
                validColor = '#' + color;
            }

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description.replace(/\\n/g, '\n'))
                .setColor(validColor)
                .setTimestamp();

            if (image) embed.setImage(image);
            if (thumbnail) embed.setThumbnail(thumbnail);
            if (footer) {
                embed.setFooter({ text: footer });
            } else {
                embed.setFooter({ text: 'Shonen Multiverse • Anime RPG' });
            }

            // Send the embed
            await interaction.channel.send({ embeds: [embed] });

            await interaction.editReply({
                content: '✅ Embed sent!'
            });
        } catch (error) {
            console.error('Embed command error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Error', 'Failed to send embed. Check your color format or URLs.')]
            });
        }
    }
};
