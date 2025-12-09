const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const { isAdmin } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const Guild = require('../../models/Guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configure the welcome & goodbye system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        // Welcome subcommands
        .addSubcommandGroup(group =>
            group
                .setName('join')
                .setDescription('Configure welcome messages for joining members')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('setup')
                        .setDescription('Set up the welcome channel and message')
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('The welcome channel')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('banner_url')
                                .setDescription('Banner image URL (optional)')
                                .setRequired(false))
                        .addStringOption(option =>
                            option.setName('message')
                                .setDescription('Custom welcome message (use {user}, {server}, {count})')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('test')
                        .setDescription('Send a test welcome message'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('disable')
                        .setDescription('Disable the welcome system')))
        // Goodbye subcommands
        .addSubcommandGroup(group =>
            group
                .setName('leave')
                .setDescription('Configure goodbye messages for leaving members')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('setup')
                        .setDescription('Set up the goodbye channel and message')
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('The goodbye channel')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('banner_url')
                                .setDescription('Banner image URL (optional)')
                                .setRequired(false))
                        .addStringOption(option =>
                            option.setName('message')
                                .setDescription('Custom goodbye message (use {user}, {server}, {count})')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('test')
                        .setDescription('Send a test goodbye message'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('disable')
                        .setDescription('Disable the goodbye system')))
        // Status subcommand
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View current welcome & goodbye settings')),

    async execute(interaction, client) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need administrator permission to use this command.')],
                ephemeral: true
            });
        }

        const subcommandGroup = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();

        if (subcommandGroup === 'join') {
            if (subcommand === 'setup') await handleWelcomeSetup(interaction);
            else if (subcommand === 'test') await handleWelcomeTest(interaction);
            else if (subcommand === 'disable') await handleWelcomeDisable(interaction);
        } else if (subcommandGroup === 'leave') {
            if (subcommand === 'setup') await handleGoodbyeSetup(interaction);
            else if (subcommand === 'test') await handleGoodbyeTest(interaction);
            else if (subcommand === 'disable') await handleGoodbyeDisable(interaction);
        } else if (subcommand === 'status') {
            await handleStatus(interaction);
        }
    }
};

// ================== WELCOME HANDLERS ==================

async function handleWelcomeSetup(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const channel = interaction.options.getChannel('channel');
        const bannerUrl = interaction.options.getString('banner_url');
        const customMessage = interaction.options.getString('message');

        let guildData = await Guild.findOne({ guildId: interaction.guild.id });
        if (!guildData) {
            guildData = new Guild({ guildId: interaction.guild.id });
        }

        guildData.welcome = {
            enabled: true,
            channelId: channel.id,
            message: customMessage || 'Hey {user}! 🎉\n\nWelcome to {server}!\nYou are our {count} member!',
            bannerUrl: bannerUrl || null,
            embedEnabled: true
        };

        await guildData.save();

        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Welcome System Configured')
            .addFields(
                { name: '📍 Channel', value: `<#${channel.id}>`, inline: true },
                { name: '🖼️ Banner', value: bannerUrl ? '✓ Set' : '✗ Not set', inline: true },
                { name: '💬 Message', value: `\`\`\`${guildData.welcome.message.substring(0, 100)}...\`\`\``, inline: false }
            )
            .setFooter({ text: 'Use /welcome join test to preview' });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Welcome setup error:', error);
        await interaction.editReply({ embeds: [errorEmbed('Error', 'Failed to set up welcome system.')] });
    }
}

async function handleWelcomeTest(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });

        if (!guildData?.welcome?.enabled || !guildData.welcome.channelId) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Configured', 'Use `/welcome join setup` first.')]
            });
        }

        const channel = interaction.guild.channels.cache.get(guildData.welcome.channelId);
        if (!channel) {
            return interaction.editReply({ embeds: [errorEmbed('Error', 'Welcome channel not found.')] });
        }

        const welcomeEmbed = createWelcomeEmbed(interaction.member, interaction.guild, guildData.welcome);
        await channel.send({ embeds: [welcomeEmbed] });

        await interaction.editReply({
            embeds: [successEmbed('Test Sent', `Test welcome message sent to <#${channel.id}>!`)]
        });
    } catch (error) {
        console.error('Welcome test error:', error);
        await interaction.editReply({ embeds: [errorEmbed('Error', 'Failed to send test message.')] });
    }
}

async function handleWelcomeDisable(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        if (guildData) {
            guildData.welcome.enabled = false;
            await guildData.save();
        }

        await interaction.editReply({ embeds: [successEmbed('Disabled', 'Welcome system has been disabled.')] });
    } catch (error) {
        console.error('Welcome disable error:', error);
        await interaction.editReply({ embeds: [errorEmbed('Error', 'Failed to disable welcome system.')] });
    }
}

// ================== GOODBYE HANDLERS ==================

async function handleGoodbyeSetup(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const channel = interaction.options.getChannel('channel');
        const bannerUrl = interaction.options.getString('banner_url');
        const customMessage = interaction.options.getString('message');

        let guildData = await Guild.findOne({ guildId: interaction.guild.id });
        if (!guildData) {
            guildData = new Guild({ guildId: interaction.guild.id });
        }

        guildData.goodbye = {
            enabled: true,
            channelId: channel.id,
            message: customMessage || '{user} has left {server}.\nWe now have {count} members.',
            bannerUrl: bannerUrl || null
        };

        await guildData.save();

        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Goodbye System Configured')
            .addFields(
                { name: '📍 Channel', value: `<#${channel.id}>`, inline: true },
                { name: '🖼️ Banner', value: bannerUrl ? '✓ Set' : '✗ Not set', inline: true },
                { name: '💬 Message', value: `\`\`\`${guildData.goodbye.message.substring(0, 100)}...\`\`\``, inline: false }
            )
            .setFooter({ text: 'Use /welcome leave test to preview' });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Goodbye setup error:', error);
        await interaction.editReply({ embeds: [errorEmbed('Error', 'Failed to set up goodbye system.')] });
    }
}

async function handleGoodbyeTest(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });

        if (!guildData?.goodbye?.enabled || !guildData.goodbye.channelId) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Configured', 'Use `/welcome leave setup` first.')]
            });
        }

        const channel = interaction.guild.channels.cache.get(guildData.goodbye.channelId);
        if (!channel) {
            return interaction.editReply({ embeds: [errorEmbed('Error', 'Goodbye channel not found.')] });
        }

        const goodbyeEmbed = createGoodbyeEmbed(interaction.member, interaction.guild, guildData.goodbye);
        await channel.send({ embeds: [goodbyeEmbed] });

        await interaction.editReply({
            embeds: [successEmbed('Test Sent', `Test goodbye message sent to <#${channel.id}>!`)]
        });
    } catch (error) {
        console.error('Goodbye test error:', error);
        await interaction.editReply({ embeds: [errorEmbed('Error', 'Failed to send test message.')] });
    }
}

async function handleGoodbyeDisable(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        if (guildData) {
            guildData.goodbye.enabled = false;
            await guildData.save();
        }

        await interaction.editReply({ embeds: [successEmbed('Disabled', 'Goodbye system has been disabled.')] });
    } catch (error) {
        console.error('Goodbye disable error:', error);
        await interaction.editReply({ embeds: [errorEmbed('Error', 'Failed to disable goodbye system.')] });
    }
}

// ================== STATUS ==================

async function handleStatus(interaction) {
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });

    const embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('📊 Welcome & Goodbye System Status')
        .addFields(
            {
                name: '👋 Welcome (Join)',
                value: [
                    `**Status:** ${guildData?.welcome?.enabled ? '✅ Enabled' : '❌ Disabled'}`,
                    `**Channel:** ${guildData?.welcome?.channelId ? `<#${guildData.welcome.channelId}>` : 'Not set'}`,
                    `**Banner:** ${guildData?.welcome?.bannerUrl ? '✓ Set' : '✗ Not set'}`
                ].join('\n'),
                inline: true
            },
            {
                name: '🚪 Goodbye (Leave)',
                value: [
                    `**Status:** ${guildData?.goodbye?.enabled ? '✅ Enabled' : '❌ Disabled'}`,
                    `**Channel:** ${guildData?.goodbye?.channelId ? `<#${guildData.goodbye.channelId}>` : 'Not set'}`,
                    `**Banner:** ${guildData?.goodbye?.bannerUrl ? '✓ Set' : '✗ Not set'}`
                ].join('\n'),
                inline: true
            }
        )
        .setFooter({ text: 'Use /welcome join setup or /welcome leave setup to configure' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ================== EMBED CREATORS ==================

function createWelcomeEmbed(member, guild, welcomeSettings) {
    const memberCount = guild.memberCount;
    const message = (welcomeSettings.message || 'Welcome to {server}!')
        .replace('{user}', `<@${member.id}>`)
        .replace('{server}', `**${guild.name}**`)
        .replace('{count}', `**${memberCount}**`);

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({
            name: '✨ New Member Joined!',
            iconURL: guild.iconURL({ dynamic: true })
        })
        .setTitle(`Welcome, ${member.user.username}!`)
        .setDescription(message)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
        .addFields(
            { name: '👤 Username', value: `\`${member.user.tag}\``, inline: true },
            { name: '📊 Member #', value: `\`#${memberCount}\``, inline: true },
            { name: '📅 Joined', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: `${guild.name} • Enjoy your stay!`, iconURL: guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    if (welcomeSettings.bannerUrl) {
        embed.setImage(welcomeSettings.bannerUrl);
    }

    return embed;
}

function createGoodbyeEmbed(member, guild, goodbyeSettings) {
    const memberCount = guild.memberCount;
    const message = (goodbyeSettings.message || '{user} has left {server}.')
        .replace('{user}', `**${member.user.tag}**`)
        .replace('{server}', `**${guild.name}**`)
        .replace('{count}', `**${memberCount}**`);

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({
            name: '👋 Member Left',
            iconURL: guild.iconURL({ dynamic: true })
        })
        .setTitle(`Goodbye, ${member.user.username}`)
        .setDescription(message)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
        .addFields(
            { name: '👤 Username', value: `\`${member.user.tag}\``, inline: true },
            { name: '📊 Members Now', value: `\`${memberCount}\``, inline: true },
            { name: '⏱️ Left At', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: `${guild.name} • We'll miss you!`, iconURL: guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    if (goodbyeSettings.bannerUrl) {
        embed.setImage(goodbyeSettings.bannerUrl);
    }

    return embed;
}

module.exports.createWelcomeEmbed = createWelcomeEmbed;
module.exports.createGoodbyeEmbed = createGoodbyeEmbed;
