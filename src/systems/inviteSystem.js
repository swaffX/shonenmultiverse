const { EmbedBuilder, Collection } = require('discord.js');
const Invite = require('../models/Invite');
const { createInviteImage } = require('./welcomeImageSystem');

// Cache for tracking invites
const inviteCache = new Collection();

// Invite notification channel
const INVITE_CHANNEL_ID = '1448580403970572380';

// Milestones for rewards
const INVITE_MILESTONES = [5, 10, 25, 50, 100];

/**
 * Initialize invite tracking
 */
async function initInviteSystem(client) {
    console.log('📨 Initializing invite tracking...');

    // Cache all guild invites
    for (const [, guild] of client.guilds.cache) {
        try {
            const invites = await guild.invites.fetch();
            inviteCache.set(guild.id, new Collection(invites.map(inv => [inv.code, inv.uses])));
        } catch (err) {
            console.error(`Failed to cache invites for ${guild.name}:`, err);
        }
    }

    console.log('📨 Invite tracking initialized!');
}

/**
 * Handle member join - track who invited them
 */
async function handleMemberJoin(member) {
    if (member.user.bot) return;

    try {
        const guild = member.guild;
        const cachedInvites = inviteCache.get(guild.id) || new Collection();
        const newInvites = await guild.invites.fetch();

        // Find which invite was used
        const usedInvite = newInvites.find(inv => {
            const oldUses = cachedInvites.get(inv.code) || 0;
            return inv.uses > oldUses;
        });

        // Update cache
        inviteCache.set(guild.id, new Collection(newInvites.map(inv => [inv.code, inv.uses])));

        if (!usedInvite || !usedInvite.inviter) return;

        const inviter = usedInvite.inviter;

        // Check if fake invite (account less than 7 days old)
        const accountAge = Date.now() - member.user.createdTimestamp;
        const isFake = accountAge < 7 * 24 * 60 * 60 * 1000; // 7 days

        // Update database
        const inviteData = await Invite.findOrCreate(inviter.id, guild.id);

        inviteData.invitedUsers.push({
            userId: member.id,
            username: member.user.username,
            joinedAt: new Date(),
            isValid: !isFake
        });

        inviteData.totalInvites += 1;
        if (isFake) {
            inviteData.fakeInvites += 1;
        } else {
            inviteData.validInvites += 1;
        }

        await inviteData.save();

        // Send notification
        await sendInviteNotification(guild, member, inviter, inviteData, isFake);

        // Check milestones
        await checkMilestone(guild, inviter, inviteData);

    } catch (error) {
        console.error('Invite tracking error:', error);
    }
}

/**
 * Handle member leave - update invite validity
 */
async function handleMemberLeave(member) {
    if (member.user.bot) return;

    try {
        // Find who invited this person
        const inviteData = await Invite.findOne({
            guildId: member.guild.id,
            'invitedUsers.userId': member.id
        });

        if (!inviteData) return;

        // Mark as invalid
        const invitedUser = inviteData.invitedUsers.find(u => u.userId === member.id);
        if (invitedUser && invitedUser.isValid) {
            invitedUser.isValid = false;
            inviteData.validInvites = Math.max(0, inviteData.validInvites - 1);
            inviteData.leftInvites += 1;
            await inviteData.save();
        }
    } catch (error) {
        console.error('Invite leave tracking error:', error);
    }
}

/**
 * Send invite notification to channel
 */
async function sendInviteNotification(guild, member, inviter, inviteData, isFake) {
    const channel = guild.channels.cache.get(INVITE_CHANNEL_ID);
    if (!channel) return;

    // Generate invite image
    const attachment = await createInviteImage(member.user, inviteData.validInvites);

    const embed = new EmbedBuilder()
        .setColor(isFake ? '#F59E0B' : '#10B981')
        .setAuthor({
            name: '📨 New Invite',
            iconURL: guild.iconURL({ dynamic: true })
        })
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setImage('attachment://invite.png')
        .setDescription([
            `### ${member.user.username} joined the server!`,
            ``
        ].join('\n'))
        .addFields(
            {
                name: '👤 Invited By',
                value: `<@${inviter.id}>`,
                inline: true
            },
            {
                name: '✅ Valid Invites',
                value: `\`${inviteData.validInvites}\``,
                inline: true
            },
            {
                name: '📊 Total Invites',
                value: `\`${inviteData.totalInvites}\` (+${inviteData.leftInvites} left)`,
                inline: true
            }
        )
        .setFooter({
            text: `Member ID: ${member.id}`,
            iconURL: member.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

    // Add warning for fake invites
    if (isFake) {
        embed.addFields({
            name: '⚠️ Warning',
            value: 'Account is less than 7 days old - marked as suspicious.',
            inline: false
        });
    }

    if (attachment) {
        await channel.send({ embeds: [embed], files: [attachment] });
    } else {
        await channel.send({ embeds: [embed] });
    }
}

/**
 * Check for milestone rewards
 */
async function checkMilestone(guild, inviter, inviteData) {
    const channel = guild.channels.cache.get(INVITE_CHANNEL_ID);

    for (const milestone of INVITE_MILESTONES) {
        if (inviteData.validInvites >= milestone) {
            const alreadyClaimed = inviteData.rewardsClaimed.some(r => r.milestone === milestone);
            if (!alreadyClaimed) {
                // Record milestone
                inviteData.rewardsClaimed.push({ milestone, claimedAt: new Date() });
                await inviteData.save();

                // Send celebration
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setColor('#FFD700')
                        .setTitle('🎉 INVITE MILESTONE REACHED!')
                        .setThumbnail(inviter.displayAvatarURL({ dynamic: true, size: 256 }))
                        .setDescription([
                            `### Congratulations <@${inviter.id}>!`,
                            ``,
                            `You've reached **${milestone}** valid invites! 🏆`,
                            ``,
                            `Thank you for helping grow our community!`
                        ].join('\n'))
                        .setFooter({ text: 'Contact staff for special rewards!' })
                        .setTimestamp();

                    await channel.send({ embeds: [embed] });
                }
                break; // Only announce one milestone at a time
            }
        }
    }
}

/**
 * Update invite cache when a new invite is created
 */
async function handleInviteCreate(invite) {
    const cachedInvites = inviteCache.get(invite.guild.id) || new Collection();
    cachedInvites.set(invite.code, invite.uses);
    inviteCache.set(invite.guild.id, cachedInvites);
}

/**
 * Update invite cache when an invite is deleted
 */
async function handleInviteDelete(invite) {
    const cachedInvites = inviteCache.get(invite.guild.id);
    if (cachedInvites) {
        cachedInvites.delete(invite.code);
    }
}

module.exports = {
    initInviteSystem,
    handleMemberJoin,
    handleMemberLeave,
    handleInviteCreate,
    handleInviteDelete,
    INVITE_MILESTONES
};
