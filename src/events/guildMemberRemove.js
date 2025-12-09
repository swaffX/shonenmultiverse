const { Events, EmbedBuilder } = require('discord.js');
const { logMemberLeave } = require('../systems/loggingSystem');
const config = require('../config/config');
const Guild = require('../models/Guild');

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,
    async execute(member, client) {
        // Log member leave
        await logMemberLeave(member).catch(console.error);

        // Skip bots for goodbye message
        if (member.user.bot) return;

        // Send goodbye message
        await sendGoodbyeMessage(member, client);
    }
};

async function sendGoodbyeMessage(member, client) {
    try {
        const guildData = await Guild.findOne({ guildId: member.guild.id });

        // Check if goodbye is enabled
        if (!guildData?.goodbye?.enabled || !guildData.goodbye.channelId) {
            return;
        }

        const channel = member.guild.channels.cache.get(guildData.goodbye.channelId);
        if (!channel) return;

        const memberCount = member.guild.memberCount;

        // Modern styled message
        const defaultMessage = `**${member.user.tag}** has left **${member.guild.name}**.\nWe now have **${memberCount}** members.`;

        const message = (guildData.goodbye.message || defaultMessage)
            .replace('{user}', `**${member.user.tag}**`)
            .replace('{server}', `**${member.guild.name}**`)
            .replace('{count}', `**${memberCount}**`);

        // Calculate how long they were in the server
        const joinedAt = member.joinedTimestamp;
        const duration = joinedAt ? formatDuration(Date.now() - joinedAt) : 'Unknown';

        const goodbyeEmbed = new EmbedBuilder()
            .setColor('#ED4245') // Red for goodbye
            .setAuthor({
                name: '👋 Member Left',
                iconURL: member.guild.iconURL({ dynamic: true })
            })
            .setTitle(`Goodbye, ${member.user.username}`)
            .setDescription(message)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                {
                    name: '👤 Username',
                    value: `\`${member.user.tag}\``,
                    inline: true
                },
                {
                    name: '📊 Members Now',
                    value: `\`${memberCount}\``,
                    inline: true
                },
                {
                    name: '⏱️ Time in Server',
                    value: `\`${duration}\``,
                    inline: true
                }
            )
            .setFooter({
                text: `${member.guild.name} • We'll miss you!`,
                iconURL: member.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        if (guildData.goodbye.bannerUrl) {
            goodbyeEmbed.setImage(guildData.goodbye.bannerUrl);
        }

        await channel.send({ embeds: [goodbyeEmbed] });
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
