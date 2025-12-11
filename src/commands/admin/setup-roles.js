const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config/config');
const { isAdmin } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const ReactionRole = require('../../models/ReactionRole');

// Ping roles configuration
const PING_ROLES = [
    { name: 'Announcements', emoji: '📢', description: 'Game news and announcements' },
    { name: 'Updates', emoji: '📋', description: 'Game updates and patches' },
    { name: 'Sneak Peeks', emoji: '👀', description: 'Exclusive previews' },
    { name: 'Polls', emoji: '📊', description: 'Community polls' },
    { name: 'Giveaways', emoji: '🎉', description: 'Giveaway notifications' },
    { name: 'Server News', emoji: '📰', description: 'Server announcements' },
    { name: 'Event', emoji: '🎮', description: 'Event notifications' }
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

            const roleMapping = {
                announcements: interaction.options.getRole('announcements').id,
                updates: interaction.options.getRole('updates').id,
                sneak_peeks: interaction.options.getRole('sneak_peeks').id,
                polls: interaction.options.getRole('polls').id,
                giveaways: interaction.options.getRole('giveaways').id,
                server_news: interaction.options.getRole('server_news').id,
                event: interaction.options.getRole('event').id
            };

            const rolesEmbed = new EmbedBuilder()
                .setColor('#2B2D31')
                .setAuthor({
                    name: 'SHONEN MULTIVERSE',
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTitle('🎭 Notification Roles')
                .setDescription(
                    `> Customize your notification preferences!\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `**🔔 Available Notifications**\n\n` +
                    `> 📢 **Announcements** - Game news\n` +
                    `> 📋 **Updates** - Patches & updates\n` +
                    `> 👀 **Sneak Peeks** - Exclusive previews\n` +
                    `> 📊 **Polls** - Community polls\n` +
                    `> 🎉 **Giveaways** - Free rewards\n` +
                    `> 📰 **Server News** - Server updates\n` +
                    `> 🎮 **Events** - Special events\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                )
                .addFields({
                    name: '💡 How to Use',
                    value: '> Click a button to **toggle** the role.\n> Click again to **remove** it.',
                    inline: false
                })
                .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 512 }))
                .setFooter({
                    text: '🔔 Stay updated with what matters to you!',
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
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
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`role_${roleMapping.updates}`)
                    .setLabel('Updates')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`role_${roleMapping.sneak_peeks}`)
                    .setLabel('Sneak Peeks')
                    .setEmoji('👀')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`role_${roleMapping.polls}`)
                    .setLabel('Polls')
                    .setEmoji('📊')
                    .setStyle(ButtonStyle.Primary)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`role_${roleMapping.giveaways}`)
                    .setLabel('Giveaways')
                    .setEmoji('🎉')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`role_${roleMapping.server_news}`)
                    .setLabel('Server News')
                    .setEmoji('📰')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`role_${roleMapping.event}`)
                    .setLabel('Events')
                    .setEmoji('🎮')
                    .setStyle(ButtonStyle.Danger)
            );

            const message = await interaction.channel.send({
                embeds: [rolesEmbed],
                components: [row1, row2]
            });

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
