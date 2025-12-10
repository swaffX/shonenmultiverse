// Partial content of interactionCreate.js to update handleInfoSelect function
const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { errorEmbed, successEmbed } = require('../utils/embedBuilder');
const { joinGiveaway, leaveGiveaway, updateGiveawayEmbed } = require('../systems/giveawaySystem');
const { createTicket, closeTicket } = require('../systems/ticketSystem');
const { handleStatsButton } = require('../systems/statsEmbedSystem');
const {
    showRoomSettingsModal,
    handleRoomSettingsModal,
    handleControlPanelButton,
    handlePrivacySelection,
    handleLimitModal,
    handleWhitelistModal
} = require('../systems/customVoiceSystem');
const Guild = require('../models/Guild');
const User = require('../models/User');
const logger = require('../utils/logger');
const config = require('../config/config');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction, client) {
        try {
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;
                logger.command(interaction.commandName, interaction.user.id, interaction.guildId);
                try {
                    await command.execute(interaction, client);
                } catch (error) {
                    const errorResponse = { embeds: [errorEmbed('Error', 'An error occurred.')], ephemeral: true };
                    if (interaction.replied || interaction.deferred) await interaction.followUp(errorResponse);
                    else await interaction.reply(errorResponse);
                }
            }
            else if (interaction.isButton()) {
                await handleButtonInteraction(interaction, client);
            }
            else if (interaction.isStringSelectMenu()) {
                await handleSelectMenuInteraction(interaction, client);
            }
            else if (interaction.isModalSubmit()) {
                await handleModalSubmit(interaction, client);
            }
        } catch (error) {
            console.error('InteractionCreate event error:', error);
        }
    }
};

async function handleButtonInteraction(interaction, client) {
    const customId = interaction.customId;

    // Handle verification start button (Main Panel)
    if (customId === 'start_verification') {
        const clientId = config.roblox.clientId;
        const redirectUri = config.roblox.redirectUri;

        if (!clientId || !redirectUri) {
            return interaction.reply({
                content: '❌ Verification system is not fully configured (Missing Client ID or Redirect URI). Please contact an administrator.',
                ephemeral: true
            });
        }

        // State acts as the security token and carrier of Discord User ID
        const state = interaction.user.id;

        // Roblox OAuth2 URL
        const oauthUrl = `https://authorize.roblox.com/?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=Code&scope=openid+profile&state=${state}`;

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Authorize with Roblox')
                    .setStyle(ButtonStyle.Link)
                    .setURL(oauthUrl)
            );

        await interaction.reply({
            content: 'Click the button below to authorize your Roblox account securely via Roblox.com:',
            components: [row],
            ephemeral: true
        });
        return;
    }

    // Handle Help Button
    if (customId === 'verify_help') {
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const ticketChannelId = guildData?.ticketSystem?.panelChannelId;

        if (ticketChannelId) {
            await interaction.reply({
                content: `🆘 Need help? Please open a ticket in our support channel: <#${ticketChannelId}>`,
                flags: 64
            });
        } else {
            await interaction.reply({
                content: '🆘 Need help? Please ask a moderator for assistance or check the #ticket-creation channel.',
                flags: 64
            });
        }
        return;
    }

    // Handle verification check (Old button, keep for backward compatibility or remove)
    if (customId.startsWith('verify_check_')) {
        await interaction.deferReply({ flags: 64 });
        const parts = customId.split('_');
        const robloxId = parts[2];
        const verifyCode = parts.slice(3).join('_');

        try {
            const blurbRes = await fetch(`https://users.roblox.com/v1/users/${robloxId}`);
            if (!blurbRes.ok) throw new Error('Failed to fetch profile');
            const blurbData = await blurbRes.json();
            const blurb = blurbData.description || '';

            if (blurb.includes(verifyCode)) {
                // Success
                let user = await User.findOne({ oderId: interaction.user.id, guildId: interaction.guild.id });
                if (!user) {
                    user = new User({
                        oderId: interaction.user.id,
                        guildId: interaction.guild.id
                    });
                }

                user.robloxId = robloxId;
                user.robloxUsername = blurbData.name;
                user.isVerified = true;
                await user.save();

                // Add Verified Role if configured
                const roleId = config.server.roles.verified;
                if (roleId) {
                    const role = interaction.guild.roles.cache.get(roleId);
                    if (role) {
                        await interaction.member.roles.add(role).catch(err => console.error('Failed to add verified role:', err));
                    }
                }

                await interaction.editReply({
                    content: `✅ **Success!** You have been verified as **${blurbData.name}**!`,
                    embeds: []
                });
            } else {
                await interaction.editReply({
                    content: `❌ I couldn't find the code \`${verifyCode}\` in your profile blurb.\nPlease add it and try again.`,
                    embeds: []
                });
            }
        } catch (error) {
            console.error('Verify check error:', error);
            await interaction.editReply({ content: '❌ An error occurred while checking verification.' });
        }
        return;
    }

    // Handle ticket create button
    if (customId === 'ticket_create') {
        const modal = new ModalBuilder()
            .setCustomId('ticket_modal')
            .setTitle('🎫 Open a Ticket');

        const reasonInput = new TextInputBuilder()
            .setCustomId('ticket_reason')
            .setLabel('What do you need help with?')
            .setPlaceholder('Please describe your issue in detail...')
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(10)
            .setMaxLength(1000)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
        return;
    }

    // Handle ticket close button
    if (customId.startsWith('ticket_close_')) {
        const channelId = customId.replace('ticket_close_', '');
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });

        if (!guildData?.ticketSystem?.supportRoleId) {
            return interaction.reply({
                embeds: [errorEmbed('Error', 'Ticket system not configured.')],
                ephemeral: true
            });
        }

        const result = await closeTicket(interaction, channelId, guildData.ticketSystem.supportRoleId);

        if (result.success) {
            await interaction.reply({
                embeds: [successEmbed('Closing', result.message)],
                ephemeral: true
            });
        } else {
            await interaction.reply({
                embeds: [errorEmbed('Error', result.message)],
                ephemeral: true
            });
        }
        return;
    }

    // Handle role buttons
    if (customId.startsWith('role_')) {
        const roleId = customId.replace('role_', '');
        const member = interaction.member;
        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) {
            return interaction.reply({ content: '❌ Role not found!', ephemeral: true });
        }

        try {
            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
                await interaction.reply({
                    content: `✅ Removed **${role.name}** role from you!`,
                    ephemeral: true
                });
            } else {
                await member.roles.add(roleId);
                await interaction.reply({
                    content: `✅ Added **${role.name}** role to you!`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Role toggle error:', error);
            await interaction.reply({
                content: '❌ Failed to update your roles. I may not have permission.',
                ephemeral: true
            });
        }
        return;
    }

    if (customId === 'giveaway_join') {
        const result = await joinGiveaway(interaction.message.id, interaction.user.id);
        if (result.success) {
            await updateGiveawayEmbed(interaction.message.id, client);
            await interaction.reply({ content: '✅ You have entered the giveaway!', ephemeral: true });
        } else {
            await interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
        }
    }
    else if (customId === 'giveaway_leave') {
        const result = await leaveGiveaway(interaction.message.id, interaction.user.id);
        if (result.success) {
            await updateGiveawayEmbed(interaction.message.id, client);
            await interaction.reply({ content: '✅ You have left the giveaway.', ephemeral: true });
        } else {
            await interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
        }
    }
    else if (customId.startsWith('poll_')) {
        await interaction.reply({ content: '✅ Your vote has been recorded!', ephemeral: true });
    }
    // Stats period switch buttons
    else if (customId === 'stats_weekly' || customId === 'stats_monthly') {
        await handleStatsButton(interaction);
    }
    // Custom voice buttons
    else if (customId === 'customvoice_create') {
        await showRoomSettingsModal(interaction);
    }
    // Privacy selection buttons
    else if (customId === 'customvoice_privacy_public' || customId === 'customvoice_privacy_private') {
        await handlePrivacySelection(interaction);
    }
    // Control panel buttons
    else if (customId.startsWith('customvoice_')) {
        await handleControlPanelButton(interaction);
    }
}

async function handleSelectMenuInteraction(interaction, client) {
    if (interaction.customId === 'info_select') {
        await handleInfoSelect(interaction, client);
    }
}

async function handleInfoSelect(interaction, client) {
    const selected = interaction.values[0];
    const { roles } = config.server;
    let embed;

    switch (selected) {
        case 'info_roles':
            embed = new EmbedBuilder()
                .setColor(config.colors.info)
                .setTitle('🎭 Server Roles')
                .setDescription('Here are the roles on our server:')
                .addFields(
                    { name: '👑 Management', value: `<@&${roles.owner}>\n<@&${roles.developer}>`, inline: true },
                    { name: '🛡️ Staff', value: `<@&${roles.admin}>\n<@&${roles.moderator}>`, inline: true },
                    { name: '👥 Members', value: `<@&${roles.supporter}>\n<@&${roles.verified}>\n<@&${roles.unverified}>`, inline: true },
                    {
                        name: '⚔️ Level Roles',
                        value: [
                            '`Lv.100` Pirate King',
                            '`Lv.75` Hokage',
                            '`Lv.50` Hashira',
                            '`Lv.40` Espada',
                            '`Lv.30` Jonin'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '\u200b',
                        value: [
                            '`Lv.25` Demon Slayer',
                            '`Lv.20` Supernova',
                            '`Lv.15` Chunin',
                            '`Lv.10` Soul Reaper',
                            '`Lv.5` Genin'
                        ].join('\n'),
                        inline: true
                    }
                )
                .setFooter({ text: 'Shonen Multiverse • Level up by chatting and being in voice!' })
                .setTimestamp();
            break;

        case 'info_links':
            embed = new EmbedBuilder()
                .setColor(config.colors.info)
                .setTitle('🔗 Official Links')
                .setDescription('Find us here:')
                .addFields(
                    { name: '🎮 Roblox Game', value: `[Shonen Multiverse](${config.game.robloxLink})`, inline: false },
                    { name: '👥 Roblox Group', value: `[Shomei Studios](${config.game.groupLink})`, inline: false },
                    { name: '📜 Terms of Service', value: '[Discord TOS](https://discord.com/terms) • [Roblox TOS](https://en.help.roblox.com/hc/en-us/articles/115004647846)', inline: false }
                )
                .setFooter({ text: 'Shonen Multiverse' })
                .setTimestamp();
            break;

        case 'info_cc':
            embed = new EmbedBuilder()
                .setColor(config.colors.info)
                .setTitle('📹 Content Creation')
                .setDescription('Requirements to get the Content Creator role:')
                .addFields(
                    { name: 'YouTube', value: '1,000+ Subs', inline: true },
                    { name: 'Twitch', value: '500+ Followers', inline: true },
                    { name: 'TikTok', value: '5k+ Followers', inline: true }
                )
                .setFooter({ text: 'Open a ticket to apply!' })
                .setTimestamp();
            break;

        default:
            embed = new EmbedBuilder().setColor(config.colors.error).setDescription('Unknown selection.');
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleModalSubmit(interaction, client) {
    const customId = interaction.customId;

    if (customId === 'ticket_modal') {
        await interaction.deferReply({ ephemeral: true });

        try {
            const reason = interaction.fields.getTextInputValue('ticket_reason');
            const guildData = await Guild.findOne({ guildId: interaction.guild.id });

            if (!guildData?.ticketSystem?.enabled) {
                return interaction.editReply({
                    embeds: [errorEmbed('Error', 'Ticket system is not configured.')]
                });
            }

            const { ticketChannel, ticketId } = await createTicket(
                interaction,
                reason,
                guildData.ticketSystem.categoryId,
                guildData.ticketSystem.supportRoleId
            );

            await interaction.editReply({
                embeds: [successEmbed('Ticket Created', `Your ticket has been created: <#${ticketChannel.id}>\n\nTicket ID: \`#${ticketId}\``)]
            });
        } catch (error) {
            console.error('Ticket modal error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Error', 'Failed to create ticket. Please try again.')]
            });
        }
    }
    // Custom voice room settings modal
    else if (customId === 'customvoice_settings') {
        await handleRoomSettingsModal(interaction);
    }
    // Custom voice limit modal
    else if (customId === 'customvoice_limit_modal') {
        await handleLimitModal(interaction);
    }
    // Custom voice whitelist modal
    else if (customId === 'customvoice_whitelist_modal') {
        await handleWhitelistModal(interaction);
    }
    // Verify Username Modal
    else if (customId === 'verify_username_modal') {
        await interaction.deferReply({ flags: 64 });
        const robloxUsername = interaction.fields.getTextInputValue('verify_username_input');

        try {
            // 1. Get Roblox ID
            const idRes = await fetch('https://users.roblox.com/v1/usernames/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernames: [robloxUsername], excludeBannedUsers: true })
            });

            if (!idRes.ok) throw new Error('Roblox API Error');
            const idData = await idRes.json();

            if (!idData.data || idData.data.length === 0) {
                return interaction.editReply({ content: `❌ User **${robloxUsername}** not found on Roblox.` });
            }

            const robloxUser = idData.data[0];
            const robloxId = robloxUser.id;
            const discordUser = interaction.user;

            // 2. Generate Code
            const verifyCode = `SM-${Math.floor(Math.random() * 10000)}-${discordUser.username.substring(0, 3).toUpperCase()}`;

            const embed = new EmbedBuilder()
                .setColor('#2B2D31')
                .setTitle('🔐 Verification Steps')
                .setDescription(`Hello **${robloxUser.name}**! To prove you own this account:`)
                .addFields(
                    { name: 'Step 1', value: `Go to your [Roblox Profile](https://www.roblox.com/users/${robloxId}/profile)` },
                    { name: 'Step 2', value: `Put this code in your **About/Blurb** box:\n\`\`\`${verifyCode}\`\`\`` },
                    { name: 'Step 3', value: 'Click **Done** when saved.' }
                )
                .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${robloxId}&width=420&height=420&format=png`);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`verify_check_${robloxId}_${verifyCode}`)
                        .setLabel('Done')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setLabel('Profile Link')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://www.roblox.com/users/${robloxId}/profile`)
                );

            await interaction.editReply({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Failed to fetch Roblox user.');
        }
    }
}

// Store suggestion votes (messageId -> { upvotes: Set, downvotes: Set })
const suggestionVotes = new Map();

async function handleSuggestionVote(interaction, isUpvote) {
    const messageId = interaction.message.id;
    const userId = interaction.user.id;

    // Initialize votes for this suggestion
    if (!suggestionVotes.has(messageId)) {
        suggestionVotes.set(messageId, {
            upvotes: new Set(),
            downvotes: new Set()
        });
    }

    const votes = suggestionVotes.get(messageId);

    // Remove previous vote if exists
    votes.upvotes.delete(userId);
    votes.downvotes.delete(userId);

    // Add new vote
    if (isUpvote) {
        votes.upvotes.add(userId);
    } else {
        votes.downvotes.add(userId);
    }

    // Update button labels
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('suggest_upvote')
            .setLabel(String(votes.upvotes.size))
            .setEmoji('👍')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('suggest_downvote')
            .setLabel(String(votes.downvotes.size))
            .setEmoji('👎')
            .setStyle(ButtonStyle.Danger)
    );

    await interaction.update({ components: [row] });
}
