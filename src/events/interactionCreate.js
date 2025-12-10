// Partial content of interactionCreate.js to update handleInfoSelect function
const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed, successEmbed } = require('../utils/embedBuilder');
const { joinGiveaway, leaveGiveaway, updateGiveawayEmbed } = require('../systems/giveawaySystem');
const { createTicket, closeTicket } = require('../systems/ticketSystem');
const { handleStatsButton } = require('../systems/statsEmbedSystem');
const Guild = require('../models/Guild');
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
                .setDescription('Here are the main roles on our server:')
                .addFields(
                    { name: '👑 Management', value: `<@&${roles.owner}>\n<@&${roles.developer}>`, inline: true },
                    { name: '🛡️ Staff', value: `<@&${roles.admin}>\n<@&${roles.moderator}>`, inline: true },
                    { name: '👥 Members', value: `<@&${roles.supporter}>\n<@&${roles.verified}>\n<@&${roles.unverified}>`, inline: true }
                )
                .setFooter({ text: 'Shonen Multiverse' })
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
    if (interaction.customId === 'ticket_modal') {
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
