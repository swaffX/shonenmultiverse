const { EmbedBuilder, Collection } = require('discord.js');
const { createInviteImage } = require('./welcomeImageSystem');

// Cache for tracking invites
const inviteCache = new Collection();

// Invite notification channel
const INVITE_CHANNEL_ID = '1448580403970572380';

/**
 * Initialize invite tracking - cache current invite uses
 */
async function initInviteSystem(client) {
    console.log('📨 Initializing invite tracking...');

    for (const [, guild] of client.guilds.cache) {
        try {
            const invites = await guild.invites.fetch();
            const inviteData = new Collection();

            invites.forEach(invite => {
                inviteData.set(invite.code, {
                    uses: invite.uses || 0,
                    inviterId: invite.inviter?.id || null,
                    inviterTag: invite.inviter?.tag || 'Unknown'
                });
            });

            inviteCache.set(guild.id, inviteData);
            console.log(`📨 Cached ${inviteData.size} invites for ${guild.name}`);
        } catch (err) {
            console.error(`Failed to cache invites for ${guild.name}:`, err);
        }
    }

    console.log('📨 Invite tracking initialized!');
}

/**
 * Handle member join - detect which invite was used
 */
async function handleMemberJoin(member) {
    if (member.user.bot) return;

    try {
        const guild = member.guild;
        const oldInvites = inviteCache.get(guild.id) || new Collection();

        // Fetch current invites
        const newInvites = await guild.invites.fetch();

        // Find the invite that was used (uses increased)
        let usedInvite = null;
        let inviter = null;

        for (const [code, invite] of newInvites) {
            const oldData = oldInvites.get(code);
            const oldUses = oldData?.uses || 0;

            if (invite.uses > oldUses) {
                usedInvite = invite;
                inviter = invite.inviter;
                break;
            }
        }

        // Update cache with new invite data
        const newCacheData = new Collection();
        newInvites.forEach(invite => {
            newCacheData.set(invite.code, {
                uses: invite.uses || 0,
                inviterId: invite.inviter?.id || null,
                inviterTag: invite.inviter?.tag || 'Unknown'
            });
        });
        inviteCache.set(guild.id, newCacheData);

        // If no invite found or self-invite, skip
        if (!usedInvite || !inviter || inviter.id === member.id) {
            console.log(`📨 No invite detected for ${member.user.tag}`);
            return;
        }

        // Get inviter's total invites from Discord
        const inviterInvites = await getInviterStats(guild, inviter.id);

        // Send notification
        await sendInviteNotification(guild, member, inviter, inviterInvites);

        console.log(`📨 ${member.user.tag} was invited by ${inviter.tag} (${inviterInvites.total} total invites)`);

    } catch (error) {
        console.error('Invite tracking error:', error);
    }
}

/**
 * Get inviter's stats from Discord invites
 */
async function getInviterStats(guild, inviterId) {
    try {
        const invites = await guild.invites.fetch();
        let total = 0;

        for (const [, invite] of invites) {
            if (invite.inviter?.id === inviterId) {
                total += invite.uses || 0;
            }
        }

        return { total };
    } catch (error) {
        console.error('Error getting inviter stats:', error);
        return { total: 0 };
    }
}

/**
 * Send invite notification to channel
 */
async function sendInviteNotification(guild, member, inviter, inviterStats) {
    try {
        const channel = guild.channels.cache.get(INVITE_CHANNEL_ID);
        if (!channel) {
            console.log('Invite channel not found:', INVITE_CHANNEL_ID);
            return;
        }

        // Generate image
        const attachment = await createInviteImage(member.user, inviter.username);

        const embed = new EmbedBuilder()
            .setColor('#10B981')
            .setAuthor({
                name: '📨 New Invite',
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setTitle(`${member.user.username} joined the server!`)
            .setDescription(`Invited by <@${inviter.id}>\n📊 **${inviter.username}** now has **${inviterStats.total}** total invites`)
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

        console.log(`📨 Invite notification sent for ${member.user.tag}`);
    } catch (error) {
        console.error('Error sending invite notification:', error);
    }
}

/**
 * Handle member leave - just log it, no complex tracking
 */
async function handleMemberLeave(member) {
    // Simple leave handling - no database needed
    console.log(`📨 ${member.user.tag} left the server`);
}

/**
 * Update cache when invite is created
 */
async function handleInviteCreate(invite) {
    const cachedInvites = inviteCache.get(invite.guild.id) || new Collection();
    cachedInvites.set(invite.code, {
        uses: invite.uses || 0,
        inviterId: invite.inviter?.id || null,
        inviterTag: invite.inviter?.tag || 'Unknown'
    });
    inviteCache.set(invite.guild.id, cachedInvites);
}

/**
 * Update cache when invite is deleted
 */
async function handleInviteDelete(invite) {
    const cachedInvites = inviteCache.get(invite.guild.id);
    if (cachedInvites) {
        cachedInvites.delete(invite.code);
    }
}

/**
 * Get user's invite count from Discord (for /invites command)
 */
async function getUserInvites(guild, userId) {
    try {
        const invites = await guild.invites.fetch();
        let total = 0;

        for (const [, invite] of invites) {
            if (invite.inviter?.id === userId) {
                total += invite.uses || 0;
            }
        }

        return total;
    } catch (error) {
        console.error('Error getting user invites:', error);
        return 0;
    }
}

/**
 * Get invite leaderboard
 */
async function getInviteLeaderboard(guild) {
    try {
        const invites = await guild.invites.fetch();
        const userInvites = new Map();

        for (const [, invite] of invites) {
            if (invite.inviter) {
                const current = userInvites.get(invite.inviter.id) || {
                    userId: invite.inviter.id,
                    username: invite.inviter.username,
                    total: 0
                };
                current.total += invite.uses || 0;
                userInvites.set(invite.inviter.id, current);
            }
        }

        // Sort by total invites
        return Array.from(userInvites.values())
            .sort((a, b) => b.total - a.total);
    } catch (error) {
        console.error('Error getting invite leaderboard:', error);
        return [];
    }
}

module.exports = {
    initInviteSystem,
    handleMemberJoin,
    handleMemberLeave,
    handleInviteCreate,
    handleInviteDelete,
    getUserInvites,
    getInviteLeaderboard
};
