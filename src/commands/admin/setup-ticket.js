const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const { isAdmin } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { createTicketPanel, loadTicketCounter } = require('../../systems/ticketSystem');
const Guild = require('../../models/Guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Configure the ticket system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up the ticket system')
                .addChannelOption(option =>
                    option.setName('panel_channel')
                        .setDescription('Channel for ticket panel')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('category')
                        .setDescription('Category for ticket channels')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('support_role')
                        .setDescription('Support team role')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('banner_url')
                        .setDescription('Banner image URL (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Re-send the ticket panel'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View ticket system status')),

    async execute(interaction, client) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need administrator permission.')],
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            await handleSetup(interaction, client);
        } else if (subcommand === 'panel') {
            await handlePanel(interaction);
        } else if (subcommand === 'status') {
            await handleStatus(interaction);
        }
    }
};

async function handleSetup(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const panelChannel = interaction.options.getChannel('panel_channel');
        const category = interaction.options.getChannel('category');
        const supportRole = interaction.options.getRole('support_role');
        const bannerUrl = interaction.options.getString('banner_url');

        // Validate category
        if (category.type !== 4) { // 4 = CategoryChannel
            return interaction.editReply({
                embeds: [errorEmbed('Invalid Category', 'Please select a category channel.')]
            });
        }

        // Save to database
        let guildData = await Guild.findOne({ guildId: interaction.guild.id });
        if (!guildData) {
            guildData = new Guild({ guildId: interaction.guild.id });
        }

        guildData.ticketSystem = {
            enabled: true,
            panelChannelId: panelChannel.id,
            categoryId: category.id,
            supportRoleId: supportRole.id,
            bannerUrl: bannerUrl || null
        };

        await guildData.save();

        // Create the panel
        await createTicketPanel(panelChannel, bannerUrl);

        // Load ticket counter
        await loadTicketCounter(interaction.guild, category.id);

        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Ticket System Configured')
            .addFields(
                { name: '📍 Panel Channel', value: `<#${panelChannel.id}>`, inline: true },
                { name: '📁 Category', value: `\`${category.name}\``, inline: true },
                { name: '👥 Support Role', value: `<@&${supportRole.id}>`, inline: true },
                { name: '🖼️ Banner', value: bannerUrl ? '✓ Set' : '✗ Not set', inline: true }
            )
            .setFooter({ text: 'Users can now create tickets!' });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Ticket setup error:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to set up ticket system.')]
        });
    }
}

async function handlePanel(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });

        if (!guildData?.ticketSystem?.enabled) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Configured', 'Use `/ticket setup` first.')]
            });
        }

        const channel = interaction.guild.channels.cache.get(guildData.ticketSystem.panelChannelId);
        if (!channel) {
            return interaction.editReply({
                embeds: [errorEmbed('Error', 'Panel channel not found.')]
            });
        }

        await createTicketPanel(channel, guildData.ticketSystem.bannerUrl);

        await interaction.editReply({
            embeds: [successEmbed('Panel Sent', `Ticket panel sent to <#${channel.id}>!`)]
        });
    } catch (error) {
        console.error('Ticket panel error:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to send panel.')]
        });
    }
}

async function handleStatus(interaction) {
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    const ts = guildData?.ticketSystem;

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📊 Ticket System Status')
        .addFields(
            {
                name: '🔘 Status',
                value: ts?.enabled ? '✅ Enabled' : '❌ Disabled',
                inline: true
            },
            {
                name: '📍 Panel Channel',
                value: ts?.panelChannelId ? `<#${ts.panelChannelId}>` : 'Not set',
                inline: true
            },
            {
                name: '📁 Category',
                value: ts?.categoryId
                    ? interaction.guild.channels.cache.get(ts.categoryId)?.name || 'Not found'
                    : 'Not set',
                inline: true
            },
            {
                name: '👥 Support Role',
                value: ts?.supportRoleId ? `<@&${ts.supportRoleId}>` : 'Not set',
                inline: true
            }
        );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
