const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const { isAdmin } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const { updateBoosterEmbed } = require('../../systems/boosterSystem');
const Guild = require('../../models/Guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('booster')
        .setDescription('Configure the booster showcase system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up the booster showcase embed')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel for booster showcase')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('banner_url')
                        .setDescription('Banner image URL (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('refresh')
                .setDescription('Manually refresh the booster embed'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable the booster showcase system'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View booster system status')),

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
        } else if (subcommand === 'refresh') {
            await handleRefresh(interaction);
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
        const channel = interaction.options.getChannel('channel');
        const bannerUrl = interaction.options.getString('banner_url');

        // Create the booster embed
        const message = await updateBoosterEmbed(interaction.guild, channel.id, bannerUrl);

        if (!message) {
            return interaction.editReply({
                embeds: [errorEmbed('Error', 'Failed to create booster embed.')]
            });
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Booster Showcase Configured')
            .addFields(
                { name: '📍 Channel', value: `<#${channel.id}>`, inline: true },
                { name: '🖼️ Banner', value: bannerUrl ? '✓ Set' : '✗ Not set', inline: true }
            )
            .setFooter({ text: 'Boosters will be showcased and thanked automatically!' });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Booster setup error:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to set up booster system.')]
        });
    }
}

async function handleRefresh(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });

        if (!guildData?.boosterSystem?.enabled) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Configured', 'Use `/booster setup` first.')]
            });
        }

        await updateBoosterEmbed(
            interaction.guild,
            guildData.boosterSystem.channelId,
            guildData.boosterSystem.bannerUrl
        );

        await interaction.editReply({
            embeds: [successEmbed('Refreshed', 'Booster embed has been updated!')]
        });
    } catch (error) {
        console.error('Booster refresh error:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to refresh booster embed.')]
        });
    }
}

async function handleDisable(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        await Guild.findOneAndUpdate(
            { guildId: interaction.guild.id },
            { 'boosterSystem.enabled': false }
        );

        await interaction.editReply({
            embeds: [successEmbed('Disabled', 'Booster showcase system has been disabled.')]
        });
    } catch (error) {
        console.error('Booster disable error:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to disable booster system.')]
        });
    }
}

async function handleStatus(interaction) {
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    const guild = interaction.guild;

    const embed = new EmbedBuilder()
        .setColor('#FF73FA')
        .setTitle('📊 Booster System Status')
        .addFields(
            {
                name: '🔘 Status',
                value: guildData?.boosterSystem?.enabled ? '✅ Enabled' : '❌ Disabled',
                inline: true
            },
            {
                name: '📍 Channel',
                value: guildData?.boosterSystem?.channelId
                    ? `<#${guildData.boosterSystem.channelId}>`
                    : 'Not set',
                inline: true
            },
            {
                name: '🖼️ Banner',
                value: guildData?.boosterSystem?.bannerUrl ? '✓ Set' : '✗ Not set',
                inline: true
            },
            {
                name: '🚀 Server Stats',
                value: [
                    `**Boosts:** ${guild.premiumSubscriptionCount || 0}`,
                    `**Level:** ${guild.premiumTier}`,
                    `**Boosters:** ${guild.members.cache.filter(m => m.premiumSince).size}`
                ].join('\n'),
                inline: false
            }
        );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
