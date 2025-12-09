const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const { isAdmin } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Create info dropdown menu')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('banner_url')
                .setDescription('Banner image URL (optional)')
                .setRequired(false)),

    async execute(interaction, client) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need administrator permission to use this command.')],
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const bannerUrl = interaction.options.getString('banner_url');

            // Create info embed
            const infoEmbed = new EmbedBuilder()
                .setColor(config.colors.info)
                .setTitle('ℹ️ Information Center')
                .setDescription([
                    '**Welcome to Shonen Multiverse!**',
                    '',
                    'Use the dropdown menu below to navigate to different info sections.',
                    '',
                    '> 💡 Don\'t forget to read the rules!'
                ].join('\n'))
                .setFooter({ text: 'Shonen Multiverse • Anime RPG' })
                .setTimestamp();

            if (bannerUrl) {
                infoEmbed.setImage(bannerUrl);
            }

            // Create select menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('info_select')
                .setPlaceholder('Select a category...')
                .addOptions([
                    {
                        label: 'Roles',
                        description: 'View available server roles',
                        value: 'info_roles',
                        emoji: '🎭'
                    },
                    {
                        label: 'Links',
                        description: 'View important links',
                        value: 'info_links',
                        emoji: '🔗'
                    },
                    {
                        label: 'CC Requirements',
                        description: 'Content Creator requirements',
                        value: 'info_cc',
                        emoji: '📋'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Send the message
            await interaction.channel.send({ embeds: [infoEmbed], components: [row] });

            await interaction.editReply({
                embeds: [successEmbed('Success', 'Info dropdown menu created!')]
            });
        } catch (error) {
            console.error('Info command error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Error', 'Failed to create info menu.')]
            });
        }
    }
};
