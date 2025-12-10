const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');
const { logAction } = require('./loggingSystem');

// Configuration
const CATEGORY_ID = '1447220764083228764';
const SETUP_CHANNEL_ID = '1448116452115878019';
const EMPTY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Track active custom rooms
const activeRooms = new Map();

/**
 * Initialize the custom voice system
 */
async function initCustomVoiceSystem(client) {
    console.log('🎤 Custom voice system initializing...');

    // Send setup embed to the setup channel
    for (const [, guild] of client.guilds.cache) {
        const channel = guild.channels.cache.get(SETUP_CHANNEL_ID);
        if (!channel) continue;

        await sendSetupEmbed(channel);
    }

    // Check for empty channels every 5 minutes
    setInterval(() => checkEmptyChannels(client), 5 * 60 * 1000);

    console.log('🎤 Custom voice system initialized!');
}

/**
 * Send the setup embed with create button
 */
async function sendSetupEmbed(channel) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({
            name: '🎤 Custom Voice Channels',
            iconURL: channel.guild.iconURL({ dynamic: true })
        })
        .setTitle('Create Your Own Voice Room')
        .setDescription([
            'Create a private voice channel with custom settings!',
            '',
            '**Features:**',
            '• Set custom room name',
            '• Choose user limit (0-99)',
            '• Lock/unlock your room',
            '• Add users to whitelist',
            '• Full control panel',
            '',
            '> Click the button below to create your room!'
        ].join('\n'))
        .setImage('https://cdn.discordapp.com/attachments/531892263652032522/1448120074656551033/Gemini_Generated_Image_k0e7cik0e7cik0e7.png')
        .setFooter({ text: 'Rooms auto-delete after 30 minutes of inactivity' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('customvoice_create')
            .setLabel('Create Room')
            .setEmoji('➕')
            .setStyle(ButtonStyle.Primary)
    );

    // Check if setup message already exists
    const messages = await channel.messages.fetch({ limit: 10 });
    const existingMessage = messages.find(m =>
        m.author.id === channel.client.user.id &&
        m.embeds[0]?.title === 'Create Your Own Voice Room'
    );

    if (existingMessage) {
        await existingMessage.edit({ embeds: [embed], components: [row] });
    } else {
        await channel.send({ embeds: [embed], components: [row] });
    }
}

/**
 * Show the room settings modal
 */
async function showRoomSettingsModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('customvoice_settings')
        .setTitle('Create Voice Room');

    const nameInput = new TextInputBuilder()
        .setCustomId('room_name')
        .setLabel('Room Name')
        .setPlaceholder(`${interaction.user.username}'s Room`)
        .setStyle(TextInputStyle.Short)
        .setMaxLength(32)
        .setRequired(false);

    const limitInput = new TextInputBuilder()
        .setCustomId('user_limit')
        .setLabel('User Limit (0 = unlimited, max 99)')
        .setPlaceholder('0')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(2)
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(limitInput)
    );

    await interaction.showModal(modal);
}

// Store pending room creations (userId -> { roomName, userLimit })
const pendingRooms = new Map();

/**
 * Handle the room settings modal submission - show privacy buttons
 */
async function handleRoomSettingsModal(interaction) {
    const roomName = interaction.fields.getTextInputValue('room_name') || `${interaction.user.username}'s Room`;
    const userLimitStr = interaction.fields.getTextInputValue('user_limit') || '0';
    const userLimit = Math.min(99, Math.max(0, parseInt(userLimitStr) || 0));

    // Store pending room data
    pendingRooms.set(interaction.user.id, { roomName, userLimit });

    // Show privacy selection buttons
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🔐 Select Room Privacy')
        .setDescription([
            `**Room Name:** ${roomName}`,
            `**User Limit:** ${userLimit || 'Unlimited'}`,
            '',
            'Choose your room privacy:'
        ].join('\n'));

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('customvoice_privacy_public')
            .setLabel('Public Room')
            .setEmoji('🔓')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('customvoice_privacy_private')
            .setLabel('Private Room')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

/**
 * Handle privacy button selection and create room
 */
async function handlePrivacySelection(interaction) {
    const isPrivate = interaction.customId === 'customvoice_privacy_private';
    const pendingData = pendingRooms.get(interaction.user.id);

    if (!pendingData) {
        return interaction.update({
            content: '❌ Session expired. Please start over.',
            embeds: [],
            components: []
        });
    }

    pendingRooms.delete(interaction.user.id);

    await interaction.update({
        content: '⏳ Creating your room...',
        embeds: [],
        components: []
    });

    const { roomName, userLimit } = pendingData;

    try {
        const category = interaction.guild.channels.cache.get(CATEGORY_ID);
        if (!category) {
            return interaction.editReply({ content: '❌ Category not found!' });
        }

        // Create the voice channel with lock emoji if private
        const channelName = isPrivate ? `🔒 ${roomName}` : `🎤 ${roomName}`;

        const voiceChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: CATEGORY_ID,
            userLimit: userLimit,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    allow: isPrivate ? [] : [PermissionFlagsBits.Connect],
                    deny: isPrivate ? [PermissionFlagsBits.Connect] : []
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.Connect,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.MoveMembers,
                        PermissionFlagsBits.MuteMembers
                    ]
                }
            ]
        });

        // Store room data
        activeRooms.set(voiceChannel.id, {
            ownerId: interaction.user.id,
            createdAt: new Date(),
            lastEmpty: null,
            isLocked: isPrivate,
            whitelist: [interaction.user.id]
        });

        // Move user to the channel
        if (interaction.member.voice.channel) {
            await interaction.member.voice.setChannel(voiceChannel);
        }

        // Send control panel to the voice channel's text chat
        await sendControlPanel(voiceChannel, interaction.user);

        // Log the action
        await logAction(interaction.guild, 'CUSTOM_VOICE_CREATE', {
            executor: interaction.user,
            details: `Created voice room "${roomName}" (Limit: ${userLimit || 'Unlimited'}, Private: ${isPrivate ? 'Yes' : 'No'})`
        });

        await interaction.editReply({
            content: `✅ Your room **${roomName}** has been created!\n\n${interaction.member.voice.channel ? '🎤 You have been moved to your room.' : '⚠️ Join a voice channel first to be moved automatically.'}`
        });

    } catch (error) {
        console.error('Create room error:', error);
        await interaction.editReply({ content: '❌ Failed to create room. Please try again.' });
    }
}

/**
 * Send control panel embed to the voice channel
 */
async function sendControlPanel(voiceChannel, owner) {
    const embed = new EmbedBuilder()
        .setColor('#00D166')
        .setAuthor({
            name: '🎮 Room Control Panel',
            iconURL: owner.displayAvatarURL({ dynamic: true })
        })
        .setDescription([
            `**Room Owner:** <@${owner.id}>`,
            '',
            '**Controls:**',
            '🔒 **Lock/Unlock** — Toggle room access',
            '👥 **User Limit** — Change max users',
            '➕ **Whitelist** — Add user to whitelist',
            '❌ **Close Room** — Delete this room',
            '',
            '> Only the room owner can use these controls.'
        ].join('\n'))
        .setFooter({ text: 'Room auto-deletes after 30 min of inactivity' });

    const roomData = activeRooms.get(voiceChannel.id);
    const isLocked = roomData?.isLocked || false;

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('customvoice_lock')
            .setLabel(isLocked ? 'Unlock' : 'Lock')
            .setEmoji(isLocked ? '🔓' : '🔒')
            .setStyle(isLocked ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('customvoice_limit')
            .setLabel('User Limit')
            .setEmoji('👥')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('customvoice_whitelist')
            .setLabel('Whitelist')
            .setEmoji('➕')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('customvoice_close')
            .setLabel('Close Room')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger)
    );

    await voiceChannel.send({ embeds: [embed], components: [row] });
}

/**
 * Handle control panel button interactions
 */
async function handleControlPanelButton(interaction) {
    const channelId = interaction.channel.id;
    const roomData = activeRooms.get(channelId);

    if (!roomData) {
        return interaction.reply({ content: '❌ This is not a custom voice room.', ephemeral: true });
    }

    if (roomData.ownerId !== interaction.user.id) {
        return interaction.reply({ content: '❌ Only the room owner can use these controls.', ephemeral: true });
    }

    const action = interaction.customId;

    switch (action) {
        case 'customvoice_lock':
            await handleLockToggle(interaction, roomData);
            break;
        case 'customvoice_limit':
            await showLimitModal(interaction);
            break;
        case 'customvoice_whitelist':
            await showWhitelistModal(interaction);
            break;
        case 'customvoice_close':
            await handleCloseRoom(interaction, roomData);
            break;
    }
}

/**
 * Toggle room lock
 */
async function handleLockToggle(interaction, roomData) {
    await interaction.deferUpdate();

    const isLocked = !roomData.isLocked;
    roomData.isLocked = isLocked;

    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
        Connect: isLocked ? false : null
    });

    // Update button
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('customvoice_lock')
            .setLabel(isLocked ? 'Unlock' : 'Lock')
            .setEmoji(isLocked ? '🔓' : '🔒')
            .setStyle(isLocked ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('customvoice_limit')
            .setLabel('User Limit')
            .setEmoji('👥')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('customvoice_whitelist')
            .setLabel('Whitelist')
            .setEmoji('➕')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('customvoice_close')
            .setLabel('Close Room')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger)
    );

    await interaction.message.edit({ components: [row] });

    await logAction(interaction.guild, 'CUSTOM_VOICE_UPDATE', {
        executor: interaction.user,
        details: `${isLocked ? 'Locked' : 'Unlocked'} room "${interaction.channel.name}"`
    });

    await interaction.followUp({ content: `✅ Room ${isLocked ? 'locked' : 'unlocked'}!`, ephemeral: true });
}

/**
 * Show user limit modal
 */
async function showLimitModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('customvoice_limit_modal')
        .setTitle('Change User Limit');

    const limitInput = new TextInputBuilder()
        .setCustomId('new_limit')
        .setLabel('New User Limit (0 = unlimited)')
        .setPlaceholder('0')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(2)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
    await interaction.showModal(modal);
}

/**
 * Handle user limit modal submission
 */
async function handleLimitModal(interaction) {
    const newLimit = Math.min(99, Math.max(0, parseInt(interaction.fields.getTextInputValue('new_limit')) || 0));

    await interaction.channel.setUserLimit(newLimit);

    await logAction(interaction.guild, 'CUSTOM_VOICE_UPDATE', {
        executor: interaction.user,
        details: `Changed user limit to ${newLimit || 'Unlimited'} in room "${interaction.channel.name}"`
    });

    await interaction.reply({ content: `✅ User limit set to ${newLimit || 'Unlimited'}!`, ephemeral: true });
}

/**
 * Show whitelist modal
 */
async function showWhitelistModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('customvoice_whitelist_modal')
        .setTitle('Add to Whitelist');

    const userInput = new TextInputBuilder()
        .setCustomId('user_id')
        .setLabel('User ID or @mention')
        .setPlaceholder('123456789012345678')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(userInput));
    await interaction.showModal(modal);
}

/**
 * Handle whitelist modal submission
 */
async function handleWhitelistModal(interaction) {
    const userIdInput = interaction.fields.getTextInputValue('user_id');
    const userId = userIdInput.replace(/[<@!>]/g, '');

    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    if (!member) {
        return interaction.reply({ content: '❌ User not found!', ephemeral: true });
    }

    const roomData = activeRooms.get(interaction.channel.id);
    if (roomData && !roomData.whitelist.includes(userId)) {
        roomData.whitelist.push(userId);
    }

    await interaction.channel.permissionOverwrites.edit(userId, {
        Connect: true,
        ViewChannel: true
    });

    await logAction(interaction.guild, 'CUSTOM_VOICE_WHITELIST', {
        executor: interaction.user,
        target: member.user,
        details: `Added ${member.user.tag} to whitelist in room "${interaction.channel.name}"`
    });

    await interaction.reply({ content: `✅ <@${userId}> added to whitelist!`, ephemeral: true });
}

/**
 * Close the room
 */
async function handleCloseRoom(interaction, roomData) {
    await interaction.reply({ content: '🗑️ Closing room...', ephemeral: true });

    const channelName = interaction.channel.name;

    await logAction(interaction.guild, 'CUSTOM_VOICE_DELETE', {
        executor: interaction.user,
        details: `Manually closed room "${channelName}"`
    });

    activeRooms.delete(interaction.channel.id);
    await interaction.channel.delete().catch(() => { });
}

/**
 * Check for empty channels and delete after timeout
 */
async function checkEmptyChannels(client) {
    const now = Date.now();

    for (const [channelId, roomData] of activeRooms.entries()) {
        try {
            const channel = client.channels.cache.get(channelId);

            if (!channel) {
                activeRooms.delete(channelId);
                continue;
            }

            const memberCount = channel.members?.size || 0;

            if (memberCount === 0) {
                if (!roomData.lastEmpty) {
                    roomData.lastEmpty = now;
                } else if (now - roomData.lastEmpty >= EMPTY_TIMEOUT) {
                    await logAction(channel.guild, 'CUSTOM_VOICE_DELETE', {
                        details: `Auto-deleted empty room "${channel.name}" after 30 minutes of inactivity`
                    });

                    activeRooms.delete(channelId);
                    await channel.delete().catch(() => { });
                }
            } else {
                roomData.lastEmpty = null;
            }
        } catch (error) {
            console.error('Check empty channels error:', error);
        }
    }
}

/**
 * Handle voice state update for tracking
 */
async function handleVoiceStateUpdate(oldState, newState) {
    // Update lastEmpty when someone leaves
    if (oldState.channelId && activeRooms.has(oldState.channelId)) {
        const channel = oldState.channel;
        if (channel && channel.members.size === 0) {
            const roomData = activeRooms.get(oldState.channelId);
            if (roomData) {
                roomData.lastEmpty = Date.now();
            }
        }
    }

    // Clear lastEmpty when someone joins
    if (newState.channelId && activeRooms.has(newState.channelId)) {
        const roomData = activeRooms.get(newState.channelId);
        if (roomData) {
            roomData.lastEmpty = null;
        }
    }
}

module.exports = {
    initCustomVoiceSystem,
    showRoomSettingsModal,
    handleRoomSettingsModal,
    handleControlPanelButton,
    handlePrivacySelection,
    handleLimitModal,
    handleWhitelistModal,
    handleVoiceStateUpdate,
    activeRooms
};
