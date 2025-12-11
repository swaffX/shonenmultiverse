const { Events, EmbedBuilder } = require('discord.js');
const { logMemberLeave } = require('../systems/loggingSystem');
const { deleteUserData } = require('../systems/statsEmbedSystem');
const { handleMemberLeave: handleInviteLeave } = require('../systems/inviteSystem');
const { createLeaveImage } = require('../systems/welcomeImageSystem');

// Hardcoded channel ID - no setup required
const LEAVE_CHANNEL_ID = '1448030623108305081';

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,
    async execute(member, client) {
        // Log member leave
        await logMemberLeave(member).catch(console.error);

        // Track invite validity
        await handleInviteLeave(member).catch(console.error);

        // Delete user level/stats data
        await deleteUserData(member.id, member.guild.id).catch(console.error);

        // Skip bots for goodbye message
        if (member.user.bot) return;

        // Send goodbye message (no setup required)
        await sendGoodbyeMessage(member, client);
    }
};

async function sendGoodbyeMessage(member, client) {
    try {
        const channel = member.guild.channels.cache.get(LEAVE_CHANNEL_ID);
        if (!channel) {
            console.log('Leave channel not found:', LEAVE_CHANNEL_ID);
            return;
        }

        const memberCount = member.guild.memberCount;

        // Calculate how long they were in the server
        const joinedAt = member.joinedTimestamp;
        const duration = joinedAt ? formatDuration(Date.now() - joinedAt) : 'Unknown';

        const goodbyeEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setAuthor({
                name: '👋 Member Left',
                iconURL: member.guild.iconURL({ dynamic: true })
            })
            .setTitle(`Goodbye, ${member.user.username}`)
            .setDescription(`Goodbye **${member.user.username}**.. We are **${memberCount}** people now.`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                {
                    name: '👤 Username',
                    value: member.user.username,
                    inline: true
                },
                {
                    name: '📊 Members Now',
                    value: `${memberCount}`,
                    inline: true
                },
                {
                    name: '⏱️ Time in Server',
                    value: duration,
                    inline: true
                }
            )
            .setFooter({
                text: `${member.guild.name} • We'll miss you!`,
                iconURL: member.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        // Generate custom leave image
        const attachment = await createLeaveImage(member);

        if (attachment) {
            goodbyeEmbed.setImage('attachment://goodbye.png');
            await channel.send({ embeds: [goodbyeEmbed], files: [attachment] });
        } else {
            await channel.send({ embeds: [goodbyeEmbed] });
        }

        console.log(`👋 Goodbye message sent for ${member.user.tag} in ${member.guild.name}`);
    } catch (error) {
        console.error('Goodbye message error:', error);
    }
}

// Helper function to format duration
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}
