const { EmbedBuilder, ChannelType, PermissionFlagsBits, AuditLogEvent } = require('discord.js');
const Guild = require('../models/Guild');

// Log channel types
const LOG_CHANNELS = {
    messages: { name: '💬・message-logs', description: 'Message edits, deletes' },
    members: { name: '👥・member-logs', description: 'Joins, leaves, updates' },
    moderation: { name: '🔨・mod-logs', description: 'Bans, kicks, mutes, warns' },
    roles: { name: '🎭・role-logs', description: 'Role changes' },
    channels: { name: '📁・channel-logs', description: 'Channel create/delete/update' },
    voice: { name: '🔊・voice-logs', description: 'Voice channel activity' },
    server: { name: '⚙️・server-logs', description: 'Server setting changes' }
};

// Allowed roles to view logs
const ALLOWED_ROLES = [
    '1438874153796108288',
    '1446840899974860820',
    '1438874331164704838',
    '1439008644879486976'
];

/**
 * Initialize logging system - create category and channels
 */
async function setupLoggingSystem(guild) {
    try {
        // Create permission overwrites - only allowed roles can see
        const permissionOverwrites = [
            {
                id: guild.id, // @everyone
                deny: [PermissionFlagsBits.ViewChannel]
            }
        ];

        // Add allowed roles
        for (const roleId of ALLOWED_ROLES) {
            const role = guild.roles.cache.get(roleId);
            if (role) {
                permissionOverwrites.push({
                    id: roleId,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                });
            }
        }

        // Create logs category
        const category = await guild.channels.create({
            name: '📋 LOGS',
            type: ChannelType.GuildCategory,
            permissionOverwrites
        });

        // Create log channels
        const channels = {};
        for (const [key, config] of Object.entries(LOG_CHANNELS)) {
            const channel = await guild.channels.create({
                name: config.name,
                type: ChannelType.GuildText,
                parent: category.id,
                topic: config.description,
                permissionOverwrites
            });
            channels[key] = channel.id;
        }

        // Save to database
        await Guild.findOneAndUpdate(
            { guildId: guild.id },
            {
                'loggingSystem.enabled': true,
                'loggingSystem.categoryId': category.id,
                'loggingSystem.channels': channels
            },
            { upsert: true }
        );

        console.log(`📋 Logging system set up for ${guild.name}`);
        return { category, channels };
    } catch (error) {
        console.error('Logging system setup error:', error);
        throw error;
    }
}

/**
 * Get log channel by type
 */
async function getLogChannel(guild, type) {
    try {
        const guildData = await Guild.findOne({ guildId: guild.id });
        if (!guildData?.loggingSystem?.enabled) return null;

        const channelId = guildData.loggingSystem.channels?.[type];
        if (!channelId) return null;

        return guild.channels.cache.get(channelId);
    } catch (error) {
        return null;
    }
}

/**
 * Log message delete
 */
async function logMessageDelete(message) {
    if (!message.guild || message.author?.bot) return;

    const channel = await getLogChannel(message.guild, 'messages');
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({
            name: 'Message Deleted',
            iconURL: message.author?.displayAvatarURL({ dynamic: true })
        })
        .addFields(
            { name: '👤 Author', value: `<@${message.author?.id}> (${message.author?.tag})`, inline: true },
            { name: '📍 Channel', value: `<#${message.channel.id}>`, inline: true },
            { name: '📝 Content', value: message.content?.substring(0, 1000) || '*No content*', inline: false }
        )
        .setFooter({ text: `Message ID: ${message.id}` })
        .setTimestamp();

    if (message.attachments.size > 0) {
        embed.addFields({
            name: '📎 Attachments',
            value: message.attachments.map(a => a.url).join('\n').substring(0, 1000)
        });
    }

    await channel.send({ embeds: [embed] });
}

/**
 * Log message edit
 */
async function logMessageEdit(oldMessage, newMessage) {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const channel = await getLogChannel(oldMessage.guild, 'messages');
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setAuthor({
            name: 'Message Edited',
            iconURL: oldMessage.author?.displayAvatarURL({ dynamic: true })
        })
        .addFields(
            { name: '👤 Author', value: `<@${oldMessage.author?.id}>`, inline: true },
            { name: '📍 Channel', value: `<#${oldMessage.channel.id}>`, inline: true },
            { name: '🔗 Jump', value: `[Click here](${newMessage.url})`, inline: true },
            { name: '📝 Before', value: oldMessage.content?.substring(0, 500) || '*No content*', inline: false },
            { name: '📝 After', value: newMessage.content?.substring(0, 500) || '*No content*', inline: false }
        )
        .setFooter({ text: `Message ID: ${oldMessage.id}` })
        .setTimestamp();

    await channel.send({ embeds: [embed] });
}

/**
 * Log member join
 */
async function logMemberJoin(member) {
    const channel = await getLogChannel(member.guild, 'members');
    if (!channel) return;

    const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
    const isNew = accountAge < 7;

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({
            name: 'Member Joined',
            iconURL: member.user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '👤 User', value: `<@${member.id}> (${member.user.tag})`, inline: true },
            { name: '🆔 ID', value: `\`${member.id}\``, inline: true },
            { name: '📊 Member #', value: `\`${member.guild.memberCount}\``, inline: true },
            { name: '📅 Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: '⚠️ New Account', value: isNew ? '🔴 Yes (< 7 days)' : '🟢 No', inline: true }
        )
        .setFooter({ text: `User ID: ${member.id}` })
        .setTimestamp();

    await channel.send({ embeds: [embed] });
}

/**
 * Log member leave
 */
async function logMemberLeave(member) {
    const channel = await getLogChannel(member.guild, 'members');
    if (!channel) return;

    const roles = member.roles.cache
        .filter(r => r.id !== member.guild.id)
        .map(r => `<@&${r.id}>`)
        .join(', ') || 'None';

    const joinedAt = member.joinedTimestamp
        ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
        : 'Unknown';

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({
            name: 'Member Left',
            iconURL: member.user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '👤 User', value: `${member.user.tag}`, inline: true },
            { name: '🆔 ID', value: `\`${member.id}\``, inline: true },
            { name: '📊 Members Now', value: `\`${member.guild.memberCount}\``, inline: true },
            { name: '📅 Joined', value: joinedAt, inline: true },
            { name: '🎭 Roles', value: roles.substring(0, 1000), inline: false }
        )
        .setFooter({ text: `User ID: ${member.id}` })
        .setTimestamp();

    await channel.send({ embeds: [embed] });
}

/**
 * Log ban
 */
async function logBan(ban) {
    const channel = await getLogChannel(ban.guild, 'moderation');
    if (!channel) return;

    // Try to get who banned
    let executor = null;
    try {
        const auditLogs = await ban.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberBanAdd
        });
        const log = auditLogs.entries.first();
        if (log && log.target.id === ban.user.id) {
            executor = log.executor;
        }
    } catch (err) { }

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({
            name: '🔨 Member Banned',
            iconURL: ban.user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(ban.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '👤 User', value: `${ban.user.tag}`, inline: true },
            { name: '🆔 ID', value: `\`${ban.user.id}\``, inline: true },
            { name: '👮 Banned By', value: executor ? `<@${executor.id}>` : 'Unknown', inline: true },
            { name: '📝 Reason', value: ban.reason || 'No reason provided', inline: false }
        )
        .setFooter({ text: `User ID: ${ban.user.id}` })
        .setTimestamp();

    await channel.send({ embeds: [embed] });
}

/**
 * Log role changes
 */
async function logRoleUpdate(oldMember, newMember) {
    const channel = await getLogChannel(newMember.guild, 'roles');
    if (!channel) return;

    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    if (addedRoles.size === 0 && removedRoles.size === 0) return;

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({
            name: 'Member Roles Updated',
            iconURL: newMember.user.displayAvatarURL({ dynamic: true })
        })
        .addFields(
            { name: '👤 User', value: `<@${newMember.id}> (${newMember.user.tag})`, inline: false }
        )
        .setFooter({ text: `User ID: ${newMember.id}` })
        .setTimestamp();

    if (addedRoles.size > 0) {
        embed.addFields({
            name: '➕ Added Roles',
            value: addedRoles.map(r => `<@&${r.id}>`).join(', '),
            inline: true
        });
    }

    if (removedRoles.size > 0) {
        embed.addFields({
            name: '➖ Removed Roles',
            value: removedRoles.map(r => `<@&${r.id}>`).join(', '),
            inline: true
        });
    }

    await channel.send({ embeds: [embed] });
}

/**
 * Log channel create
 */
async function logChannelCreate(channel) {
    if (!channel.guild) return;

    const logChannel = await getLogChannel(channel.guild, 'channels');
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setAuthor({ name: '📁 Channel Created' })
        .addFields(
            { name: '📍 Channel', value: `<#${channel.id}> (\`${channel.name}\`)`, inline: true },
            { name: '📂 Type', value: `\`${channel.type}\``, inline: true },
            { name: '📁 Category', value: channel.parent?.name || 'None', inline: true }
        )
        .setFooter({ text: `Channel ID: ${channel.id}` })
        .setTimestamp();

    await logChannel.send({ embeds: [embed] });
}

/**
 * Log channel delete
 */
async function logChannelDelete(channel) {
    if (!channel.guild) return;

    const logChannel = await getLogChannel(channel.guild, 'channels');
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({ name: '📁 Channel Deleted' })
        .addFields(
            { name: '📍 Channel', value: `\`${channel.name}\``, inline: true },
            { name: '📂 Type', value: `\`${channel.type}\``, inline: true },
            { name: '📁 Category', value: channel.parent?.name || 'None', inline: true }
        )
        .setFooter({ text: `Channel ID: ${channel.id}` })
        .setTimestamp();

    await logChannel.send({ embeds: [embed] });
}

/**
 * Log voice state update
 */
async function logVoiceUpdate(oldState, newState) {
    const channel = await getLogChannel(newState.guild, 'voice');
    if (!channel) return;

    const member = newState.member;
    let action, color;

    if (!oldState.channel && newState.channel) {
        action = `Joined <#${newState.channel.id}>`;
        color = '#57F287';
    } else if (oldState.channel && !newState.channel) {
        action = `Left <#${oldState.channel.id}>`;
        color = '#ED4245';
    } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        action = `Moved from <#${oldState.channel.id}> to <#${newState.channel.id}>`;
        color = '#FEE75C';
    } else {
        return; // Mute/deafen changes, skip
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({
            name: '🔊 Voice Activity',
            iconURL: member.user.displayAvatarURL({ dynamic: true })
        })
        .addFields(
            { name: '👤 User', value: `<@${member.id}>`, inline: true },
            { name: '🎯 Action', value: action, inline: true }
        )
        .setFooter({ text: `User ID: ${member.id}` })
        .setTimestamp();

    await channel.send({ embeds: [embed] });
}

module.exports = {
    setupLoggingSystem,
    getLogChannel,
    logMessageDelete,
    logMessageEdit,
    logMemberJoin,
    logMemberLeave,
    logBan,
    logRoleUpdate,
    logChannelCreate,
    logChannelDelete,
    logVoiceUpdate,
    LOG_CHANNELS,
    ALLOWED_ROLES
};
