const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const { isAdmin } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { setupLoggingSystem, LOG_CHANNELS, ALLOWED_ROLES } = require('../../systems/loggingSystem');
const Guild = require('../../models/Guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Configure the logging system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up logging system - creates category and channels automatically'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable the logging system'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View logging system status')),

    async execute(interaction, client) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need administrator permission.')],
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            await handleSetup(interaction);
        } else if (subcommand === 'disable') {
            await handleDisable(interaction);
        } else if (subcommand === 'status') {
            await handleStatus(interaction);
        }
    }
};

async function handleSetup(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        // Check if already set up
        const existingData = await Guild.findOne({ guildId: interaction.guild.id });
        if (existingData?.loggingSystem?.enabled) {
            return interaction.editReply({
                embeds: [errorEmbed('Already Set Up', 'Logging system is already configured. Use `/logs disable` first to reconfigure.')]
            });
        }

        // Create category and channels
        const { category, channels } = await setupLoggingSystem(interaction.guild);

        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Logging System Configured')
            .setDescription('Log category and channels have been created!')
            .addFields(
                { name: '📁 Category', value: `<#${category.id}>`, inline: false },
                { name: '📋 Channels Created', value: Object.entries(channels).map(([key, id]) => `• <#${id}>`).join('\n'), inline: false },
                { name: '👥 Access Roles', value: ALLOWED_ROLES.map(id => `<@&${id}>`).join(', '), inline: false }
            )
            .setFooter({ text: 'All server events will now be logged!' });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Logs setup error:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to set up logging system. Make sure I have permission to create channels.')]
        });
    }
}

async function handleDisable(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });

        if (!guildData?.loggingSystem?.enabled) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Configured', 'Logging system is not set up.')]
            });
        }

        // Delete log channels and category
        const categoryId = guildData.loggingSystem.categoryId;
        const category = interaction.guild.channels.cache.get(categoryId);

        if (category) {
            // Delete all channels in category
            for (const [, channel] of category.children.cache) {
                await channel.delete('Logging system disabled').catch(() => { });
            }
            // Delete category
            await category.delete('Logging system disabled').catch(() => { });
        }

        // Update database
        await Guild.findOneAndUpdate(
            { guildId: interaction.guild.id },
            {
                'loggingSystem.enabled': false,
                'loggingSystem.categoryId': null,
                'loggingSystem.channels': {}
            }
        );

        await interaction.editReply({
            embeds: [successEmbed('Disabled', 'Logging system has been disabled and channels deleted.')]
        });
    } catch (error) {
        console.error('Logs disable error:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to disable logging system.')]
        });
    }
}

async function handleStatus(interaction) {
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    const ls = guildData?.loggingSystem;

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📋 Logging System Status')
        .addFields(
            {
                name: '🔘 Status',
                value: ls?.enabled ? '✅ Enabled' : '❌ Disabled',
                inline: true
            },
            {
                name: '📁 Category',
                value: ls?.categoryId ? `<#${ls.categoryId}>` : 'Not set',
                inline: true
            }
        );

    if (ls?.enabled && ls?.channels) {
        const channelList = Object.entries(ls.channels)
            .filter(([, id]) => id)
            .map(([type, id]) => `• **${type}:** <#${id}>`)
            .join('\n');

        embed.addFields({
            name: '📋 Log Channels',
            value: channelList || 'None',
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
