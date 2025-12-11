const SecurityLog = require('../models/SecurityLog');
const config = require('../config/config');
const { EmbedBuilder } = require('discord.js');

// Record action
async function recordAction(guildId, oderId, actionType, targetId) {
    try {
        // Skip if user is a bot owner
        if (config.ownerIds.includes(oderId)) {
            return { count: 0, exceeded: false };
        }

        await SecurityLog.logAction(guildId, oderId, actionType, targetId);

        // Check if threshold exceeded
        const recentCount = await SecurityLog.countRecentActions(
            guildId,
            oderId,
            actionType,
            config.antiNuke.interval
        );

        let threshold;
        switch (actionType) {
            case 'BAN':
                threshold = config.antiNuke.banThreshold;
                break;
            case 'KICK':
                threshold = config.antiNuke.kickThreshold;
                break;
            case 'CHANNEL_DELETE':
                threshold = config.antiNuke.channelDeleteThreshold;
                break;
            case 'ROLE_DELETE':
                threshold = config.antiNuke.roleDeleteThreshold;
                break;
            default:
                threshold = 5;
        }

        return {
            count: recentCount,
            exceeded: recentCount >= threshold
        };
    } catch (error) {
        console.error('Action recording error:', error);
        return null;
    }
}

// Handle nuke attempt
async function handleNukeAttempt(guild, oderId, actionType, client) {
    console.log(`🚨 NUKE ATTEMPT DETECTED! User: ${oderId}, Action: ${actionType}`);

    try {
        const member = await guild.members.fetch(oderId);

        // Action based on config
        if (config.antiNuke.action === 'removeRoles') {
            // Remove all roles from user
            const roles = member.roles.cache.filter(r => r.id !== guild.roles.everyone.id);
            for (const [, role] of roles) {
                try {
                    await member.roles.remove(role);
                } catch (err) {
                    // May not have permission
                }
            }
            console.log(`✅ Removed all roles from ${member.user.tag}`);
        } else if (config.antiNuke.action === 'ban') {
            await member.ban({ reason: 'Nuke attempt detected' });
            console.log(`✅ Banned ${member.user.tag} for nuke attempt`);
        } else if (config.antiNuke.action === 'kick') {
            await member.kick('Nuke attempt detected');
            console.log(`✅ Kicked ${member.user.tag} for nuke attempt`);
        }

        // Notify owners
        for (const ownerId of config.ownerIds) {
            try {
                const owner = await client.users.fetch(ownerId);

                const actionTexts = {
                    'BAN': 'Mass banning users',
                    'KICK': 'Mass kicking users',
                    'CHANNEL_DELETE': 'Mass deleting channels',
                    'ROLE_DELETE': 'Mass deleting roles'
                };

                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🚨 NUKE ATTEMPT DETECTED!')
                    .setDescription(`A potential nuke attempt was blocked.`)
                    .addFields(
                        { name: '👤 Suspicious User', value: `<@${oderId}> (${member.user.tag})`, inline: false },
                        { name: '⚠️ Action Type', value: actionTexts[actionType] || actionType, inline: true },
                        { name: '🏠 Server', value: guild.name, inline: true },
                        { name: '🛡️ Action Taken', value: config.antiNuke.action === 'removeRoles' ? 'All roles removed' : config.antiNuke.action, inline: false }
                    )
                    .setFooter({ text: 'Shonen Multiverse Security' })
                    .setTimestamp();

                await owner.send({ embeds: [embed] });
            } catch (err) {
                console.error(`Failed to notify owner: ${ownerId}`);
            }
        }
    } catch (error) {
        console.error('Nuke handling error:', error);
    }
}

// Check bot addition
async function checkBotAddition(member, client) {
    if (!member.user.bot) return;

    console.log(`🤖 Bot added: ${member.user.tag}`);

    // Notify owners
    for (const ownerId of config.ownerIds) {
        try {
            const owner = await client.users.fetch(ownerId);

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🤖 Bot Added')
                .setDescription(`A new bot was added to the server.`)
                .addFields(
                    { name: '🤖 Bot', value: `${member.user.tag} (${member.id})`, inline: false },
                    { name: '🏠 Server', value: member.guild.name, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Shonen Multiverse Security' })
                .setTimestamp();

            await owner.send({ embeds: [embed] });
        } catch (err) {
            console.error(`Failed to notify owner: ${ownerId}`);
        }
    }
}

module.exports = {
    recordAction,
    handleNukeAttempt,
    checkBotAddition
};
