const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config/config');
const { isAdmin } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const ReactionRole = require('../../models/ReactionRole');

// Ping roles configuration
const PING_ROLES = [
    {
        name: 'Announcements',
        description: 'Get pinged when news related to the game are posted.',
        emoji: '📢',
        roleId: null, // Will be set dynamically
        style: ButtonStyle.Primary
    },
    {
        name: 'Updates',
        description: 'Get pinged when updates for the game are posted.',
        emoji: '📋',
        roleId: null,
        style: ButtonStyle.Primary
    },
    {
        name: 'Sneak Peeks',
        description: 'Get pinged when sneaks for the game are posted.',
        emoji: '👀',
        roleId: null,
        style: ButtonStyle.Primary
    },
    {
        name: 'Polls',
        description: 'Get pinged when game-related polls are made.',
        emoji: '📊',
        roleId: null,
        style: ButtonStyle.Primary
    },
    {
        name: 'Giveaways',
        description: 'Get pinged when a giveaway is hosted on the server.',
        emoji: '🎉',
        roleId: null,
        style: ButtonStyle.Primary
    },
    {
        name: 'Server News',
        description: 'Get pinged when news related to the server are announced.',
        emoji: '📰',
        roleId: null,
        style: ButtonStyle.Primary
    },
    {
        name: 'Event',
        description: 'Get notified when events are hosted on the server.',
        emoji: '🎮',
        roleId: null,
        style: ButtonStyle.Primary
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roles')
        .setDescription('Create reaction roles embed with ping roles')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addRoleOption(option =>
            option.setName('announcements')
                .setDescription('Announcements ping role')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('updates')
                .setDescription('Updates ping role')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('sneak_peeks')
                .setDescription('Sneak Peeks ping role')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('polls')
                .setDescription('Polls ping role')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('giveaways')
                .setDescription('Giveaways ping role')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('server_news')
                .setDescription('Server News ping role')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('event')
                .setDescription('Event ping role')
                .setRequired(true))
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

            // Get role IDs from options
            const roleMapping = {
                announcements: interaction.options.getRole('announcements').id,
                updates: interaction.options.getRole('updates').id,
                sneak_peeks: interaction.options.getRole('sneak_peeks').id,
                polls: interaction.options.getRole('polls').id,
                giveaways: interaction.options.getRole('giveaways').id,
                server_news: interaction.options.getRole('server_news').id,
                event: interaction.options.getRole('event').id
            };

            // Create the embed
            const rolesEmbed = new EmbedBuilder()
                .setColor(config.colors.info)
                .setTitle('🎭 Reaction Roles')
                .setDescription([
                    '**Get notified for what matters to you!**',
                    '',
                    'Click the buttons below to toggle your notification preferences.',
                    '',
                    '```',
                    '📢 Announcements - Game news and announcements',
                    '📋 Updates      - Game updates and patches',
                    '👀 Sneak Peeks  - Exclusive previews',
                    '📊 Polls        - Community polls',
                    '🎉 Giveaways    - Giveaway notifications',
                    '📰 Server News  - Server announcements',
                    '🎮 Event        - Event notifications',
                    '```'
                ].join('\n'))
                .setFooter({ text: 'Shonen Multiverse • Click a button to toggle!' })
                .setTimestamp();

            if (bannerUrl) {
                rolesEmbed.setImage(bannerUrl);
            }

            // Create button rows (max 5 buttons per row)
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`role_${roleMapping.announcements}`)
                    .setLabel('Announcements')
                    .setEmoji('📢')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`role_${roleMapping.updates}`)
                    .setLabel('Updates')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`role_${roleMapping.sneak_peeks}`)
                    .setLabel('Sneak Peeks')
                    .setEmoji('👀')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`role_${roleMapping.polls}`)
                    .setLabel('Polls')
                    .setEmoji('📊')
                    .setStyle(ButtonStyle.Secondary)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`role_${roleMapping.giveaways}`)
                    .setLabel('Giveaways')
                    .setEmoji('🎉')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`role_${roleMapping.server_news}`)
                    .setLabel('Server News')
                    .setEmoji('📰')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`role_${roleMapping.event}`)
                    .setLabel('Event')
                    .setEmoji('🎮')
                    .setStyle(ButtonStyle.Secondary)
            );

            // Send the message
            const message = await interaction.channel.send({
                embeds: [rolesEmbed],
                components: [row1, row2]
            });

            // Save to database for persistence
            await ReactionRole.findOneAndUpdate(
                { guildId: interaction.guild.id, roleType: 'button' },
                {
                    guildId: interaction.guild.id,
                    messageId: message.id,
                    channelId: interaction.channel.id,
                    roleType: 'button',
                    buttonRoles: roleMapping
                },
                { upsert: true, new: true }
            );

            await interaction.editReply({
                embeds: [successEmbed('Success', 'Reaction roles embed created! Users can now click buttons to get roles.')]
            });
        } catch (error) {
            console.error('Roles command error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Error', `Failed to create roles embed: ${error.message}`)]
            });
        }
    }
};
