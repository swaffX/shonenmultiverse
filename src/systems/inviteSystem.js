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
 * Prevents rejoin exploit by checking if user was already invited
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

        // Don't count self-invites
        if (inviter.id === member.id) return;

        // Check if this user was already invited before (REJOIN PREVENTION)
        const existingInvite = await Invite.findOne({
            guildId: guild.id,
            'invitedUsers.userId': member.id
        });

        if (existingInvite) {
            // User already invited before - this is a rejoin, don't count
            console.log(`📨 Rejoin detected for ${member.user.tag} - not counting`);
            return;
        }

        // Check if fake invite (account less than 7 days old)
        const accountAge = Date.now() - member.user.createdTimestamp;
        const isFake = accountAge < 7 * 24 * 60 * 60 * 1000;

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
        const inviteData = await Invite.findOne({
            guildId: member.guild.id,
            'invitedUsers.userId': member.id
        });

        if (!inviteData) return;

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
 * Send invite notification
 */
async function sendInviteNotification(guild, member, inviter, inviteData, isFake) {
    const channel = guild.channels.cache.get(INVITE_CHANNEL_ID);
    if (!channel) return;

    // Generate image with inviter name
    const inviterName = inviter.username || inviter.displayName || 'Unknown';
    const attachment = await createInviteImage(member.user, inviterName);

    const embed = new EmbedBuilder()
        .setColor(isFake ? '#F59E0B' : '#10B981')
        .setAuthor({
            name: '📨 New Invite',
            iconURL: guild.iconURL({ dynamic: true })
        })
        .setTitle(`${member.user.username} joined the server!`)
        .setDescription(`Invited by <@${inviter.id}>\n✅ Valid Invites: **${inviteData.validInvites}** | 📊 Total: **${inviteData.totalInvites}**${isFake ? '\n\n⚠️ *Suspicious: Account is less than 7 days old*' : ''}`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({
            text: `Member ID: ${member.id}`,
            iconURL: inviter.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

    if (attachment) {
        embed.setImage('attachment://invite.png');
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
                inviteData.rewardsClaimed.push({ milestone, claimedAt: new Date() });
                await inviteData.save();

                if (channel) {
                    const embed = new EmbedBuilder()
                        .setColor('#FFD700')
                        .setTitle('🎉 Invite Milestone Reached!')
                        .setDescription(`Congratulations <@${inviter.id}>! You reached **${milestone}** valid invites! 🏆`)
                        .setTimestamp();

                    await channel.send({ embeds: [embed] });
                }
                break;
            }
        }
    }
}

async function handleInviteCreate(invite) {
    const cachedInvites = inviteCache.get(invite.guild.id) || new Collection();
    cachedInvites.set(invite.code, invite.uses);
    inviteCache.set(invite.guild.id, cachedInvites);
}

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
