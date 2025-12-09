const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config/config');

// Ticket counter for unique IDs
let ticketCounter = 0;

/**
 * Create the ticket panel embed with button
 */
async function createTicketPanel(channel, bannerUrl = null) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({
            name: '🎫 Support Ticket System',
            iconURL: channel.guild.iconURL({ dynamic: true })
        })
        .setTitle('Need Help?')
        .setDescription([
            '**Welcome to our support system!**',
            '',
            'If you need assistance, please click the button below to open a ticket.',
            '',
            '```',
            '📝 How it works:',
            '1. Click "Open Ticket" button',
            '2. Fill in your reason in the form',
            '3. Submit and wait for support',
            '```',
            '',
            '⚠️ **Please do not spam tickets!**'
        ].join('\n'))
        .setFooter({
            text: `${channel.guild.name} • Support Team`,
            iconURL: channel.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

    if (bannerUrl) {
        embed.setImage(bannerUrl);
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_create')
            .setLabel('🎫 Open Ticket')
            .setStyle(ButtonStyle.Primary)
    );

    const message = await channel.send({ embeds: [embed], components: [row] });
    return message;
}

/**
 * Create a new ticket channel
 */
async function createTicket(interaction, reason, categoryId, supportRoleId) {
    const guild = interaction.guild;
    const user = interaction.user;

    try {
        // Generate ticket ID
        ticketCounter++;
        const ticketId = String(ticketCounter).padStart(4, '0');
        const channelName = `ticket-${ticketId}-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        // Create the ticket channel
        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryId,
            permissionOverwrites: [
                {
                    id: guild.id, // @everyone
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id, // Ticket opener
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles
                    ]
                },
                {
                    id: supportRoleId, // Support role
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageMessages,
                        PermissionFlagsBits.AttachFiles
                    ]
                }
            ]
        });

        // Create the ticket info embed
        const ticketEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({
                name: '🎫 Support Ticket',
                iconURL: user.displayAvatarURL({ dynamic: true })
            })
            .setTitle(`Ticket #${ticketId}`)
            .setDescription([
                '**A support team member will assist you shortly.**',
                '',
                'Please describe your issue in detail while you wait.',
                '',
                '───────────────────'
            ].join('\n'))
            .addFields(
                {
                    name: '👤 Opened By',
                    value: `<@${user.id}>`,
                    inline: true
                },
                {
                    name: '📅 Opened At',
                    value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                    inline: true
                },
                {
                    name: '🆔 Ticket ID',
                    value: `\`#${ticketId}\``,
                    inline: true
                },
                {
                    name: '📝 Reason',
                    value: `\`\`\`${reason}\`\`\``,
                    inline: false
                }
            )
            .setFooter({
                text: 'Click the button below to close this ticket',
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ticket_close_${ticketChannel.id}`)
                .setLabel('🔒 Close Ticket')
                .setStyle(ButtonStyle.Danger)
        );

        // Send the embed and ping support
        await ticketChannel.send({
            content: `<@${user.id}> <@&${supportRoleId}>`,
            embeds: [ticketEmbed],
            components: [closeRow]
        });

        console.log(`🎫 Ticket #${ticketId} created by ${user.tag}`);
        return { ticketChannel, ticketId };
    } catch (error) {
        console.error('Ticket creation error:', error);
        throw error;
    }
}

/**
 * Close a ticket channel
 */
async function closeTicket(interaction, ticketChannelId, supportRoleId) {
    const member = interaction.member;
    const guild = interaction.guild;

    // Check if user has support role
    if (!member.roles.cache.has(supportRoleId)) {
        return { success: false, message: 'Only support team members can close tickets.' };
    }

    try {
        const ticketChannel = guild.channels.cache.get(ticketChannelId);

        if (!ticketChannel) {
            return { success: false, message: 'Ticket channel not found.' };
        }

        // Send closing message
        const closingEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🔒 Ticket Closed')
            .setDescription([
                `This ticket has been closed by <@${member.id}>.`,
                '',
                '*This channel will be deleted in 5 seconds...*'
            ].join('\n'))
            .setTimestamp();

        await ticketChannel.send({ embeds: [closingEmbed] });

        // Delete channel after delay
        setTimeout(async () => {
            try {
                await ticketChannel.delete('Ticket closed');
                console.log(`🔒 Ticket channel deleted: ${ticketChannel.name}`);
            } catch (err) {
                console.error('Failed to delete ticket channel:', err);
            }
        }, 5000);

        return { success: true, message: 'Ticket is being closed...' };
    } catch (error) {
        console.error('Ticket close error:', error);
        return { success: false, message: 'Failed to close ticket.' };
    }
}

/**
 * Load existing ticket count from channels
 */
async function loadTicketCounter(guild, categoryId) {
    try {
        const category = guild.channels.cache.get(categoryId);
        if (category) {
            const ticketChannels = category.children.cache.filter(ch => ch.name.startsWith('ticket-'));
            ticketChannels.forEach(ch => {
                const match = ch.name.match(/ticket-(\d+)/);
                if (match) {
                    const id = parseInt(match[1]);
                    if (id > ticketCounter) ticketCounter = id;
                }
            });
        }
        console.log(`🎫 Ticket counter initialized: ${ticketCounter}`);
    } catch (error) {
        console.error('Load ticket counter error:', error);
    }
}

module.exports = {
    createTicketPanel,
    createTicket,
    closeTicket,
    loadTicketCounter
};
