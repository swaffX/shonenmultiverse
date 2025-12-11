const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Guild = require('../models/Guild');

// Hardcoded boost channel ID
const BOOST_CHANNEL_ID = '1448037609057030218';

/**
 * Initialize the booster system
 */
async function initBoosterSystem(client) {
    console.log('🚀 Booster system initialized');

    // Initial fetch to ensure cache is populated
    for (const [id, guild] of client.guilds.cache) {
        try {
            await guild.members.fetch();
        } catch (err) {
            console.error(`Failed to fetch members for ${guild.name}:`, err);
        }
    }

    // Update booster embeds periodically
    setInterval(() => {
        updateAllBoosterEmbeds(client);
    }, 60000); // Every minute
}

/**
 * Get boost count for a member (Discord doesn't provide this directly, so we estimate)
 * A user with premiumSince counts as 1 boost, but they might have multiple
 */
function getMemberBoostCount(member, guild) {
    // Discord API doesn't tell us how many boosts each user has
    // We can only know if they're boosting (premiumSince !== null)
    // For now, return 1 if boosting, but note in description
    return member.premiumSince ? 1 : 0;
}

/**
 * Create or update the booster leaderboard embed
 */
async function updateBoosterEmbed(guild, channelId, bannerUrl = null) {
    try {
        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
            console.log('Boost channel not found:', channelId);
            return null;
        }

        // Get all boosters - convert to array properly
        const boostersArray = Array.from(
            guild.members.cache
                .filter(member => member.premiumSince)
                .values()
        ).sort((a, b) => a.premiumSince - b.premiumSince);

        // Build booster list with proper mentions and boost time
        const boosterList = boostersArray.map((member, index) => {
            const boostTime = member.premiumSince;
            const timeAgo = `<t:${Math.floor(boostTime.getTime() / 1000)}:R>`;
            // Days boosting
            const daysBoosting = Math.floor((Date.now() - boostTime.getTime()) / (1000 * 60 * 60 * 24));
            return `**${index + 1}.** <@${member.id}> • Boosting for **${daysBoosting}** days • ${timeAgo}`;
        });

        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;
        const boostEmoji = getBoostEmoji(boostLevel);

        const embed = new EmbedBuilder()
            .setColor('#FF73FA') // Nitro pink
            .setAuthor({
                name: '✨ Server Boosters',
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setTitle(`${boostEmoji} ${guild.name} Boosters`)
            .setDescription([
                `**Total Boosts:** \`${boostCount}\` ${boostEmoji}`,
                `**Boost Level:** \`Level ${boostLevel}\``,
                `**Boosters:** \`${boostersArray.length}\``,
                '',
                '───────────────────',
                '',
                boostersArray.length > 0
                    ? boosterList.slice(0, 25).join('\n')
                    : '*No boosters yet. Be the first to boost!*',
                boostersArray.length > 25 ? `\n*...and ${boostersArray.length - 25} more boosters!*` : ''
            ].join('\n'))
            .setFooter({
                text: `Thank you for supporting ${guild.name}! 💖`,
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        // Add banner if provided
        if (bannerUrl) {
            embed.setImage(bannerUrl);
        }

        // Get guild data for stored message ID
        const guildData = await Guild.findOne({ guildId: guild.id });
        const storedMessageId = guildData?.boosterSystem?.messageId;

        // Try to edit existing message first
        if (storedMessageId) {
            try {
                const existingMessage = await channel.messages.fetch(storedMessageId);
                await existingMessage.edit({ embeds: [embed] });
                return existingMessage;
            } catch (err) {
                // Message was deleted or not found - send new one
                console.log('Booster message not found, creating new one...');
            }
        }

        // Only send new message if no existing message found
        const message = await channel.send({ embeds: [embed] });
        await saveBoosterMessageId(guild.id, message.id, channelId, bannerUrl);
        return message;
    } catch (error) {
        console.error('Booster embed update error:', error);
        return null;
    }
}

/**
 * Save the booster message ID to database
 */
async function saveBoosterMessageId(guildId, messageId, channelId, bannerUrl) {
    await Guild.findOneAndUpdate(
        { guildId },
        {
            'boosterSystem.enabled': true,
            'boosterSystem.messageId': messageId,
            'boosterSystem.channelId': channelId,
            'boosterSystem.bannerUrl': bannerUrl
        },
        { upsert: true }
    );
}

/**
 * Handle new boost event
 */
async function handleNewBoost(member, client) {
    const guild = member.guild;

    try {
        // Use hardcoded channel ID
        const channelId = BOOST_CHANNEL_ID;
        const channel = guild.channels.cache.get(channelId);

        if (!channel) {
            console.log('Boost channel not found:', channelId);
            return;
        }

        // Get boost count
        const boostCount = guild.premiumSubscriptionCount || 0;
        const boostLevel = guild.premiumTier;

        // Send thank you message
        const thankEmbed = new EmbedBuilder()
            .setColor('#FF73FA')
            .setTitle('🎉 New Server Boost!')
            .setDescription([
                `# Thank you <@${member.id}>!`,
                '',
                `You just boosted **${guild.name}**! 💖`,
                '',
                `🚀 **Server Stats:**`,
                `> Total Boosts: **${boostCount}**`,
                `> Boost Level: **Level ${boostLevel}**`,
                `> Total Boosters: **${guild.members.cache.filter(m => m.premiumSince).size}**`,
                '',
                `Your support helps make our community even better! ✨`
            ].join('\n'))
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setImage('https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif')
            .setFooter({
                text: `${guild.name} • ${new Date().toLocaleDateString()}`,
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        await channel.send({ embeds: [thankEmbed] });
        console.log(`🚀 Boost notification sent for ${member.user.tag}`);

        // Update the booster leaderboard embed
        const guildData = await Guild.findOne({ guildId: guild.id });
        if (guildData?.boosterSystem?.enabled) {
            await updateBoosterEmbed(guild, guildData.boosterSystem.channelId, guildData.boosterSystem.bannerUrl);
        } else {
            // Auto-enable and create embed in boost channel
            await updateBoosterEmbed(guild, channelId);
        }

        // Send DM to booster
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#FF73FA')
                .setTitle('💖 Thank You for Boosting!')
                .setDescription([
                    `Hey **${member.user.username}**!`,
                    '',
                    `Thank you so much for boosting **${guild.name}**! 🎉`,
                    '',
                    `Your support means the world to us and helps make the server even better!`,
                    '',
                    `As a booster, you now have access to exclusive perks. Enjoy! ✨`
                ].join('\n'))
                .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
                .setFooter({ text: guild.name })
                .setTimestamp();

            await member.send({ embeds: [dmEmbed] });
            console.log(`💖 Boost thank you DM sent to ${member.user.tag}`);
        } catch (dmError) {
            console.log(`Could not send DM to ${member.user.tag} (DMs disabled)`);
        }

    } catch (error) {
        console.error('New boost handler error:', error);
    }
}

/**
 * Update all booster embeds across guilds
 */
async function updateAllBoosterEmbeds(client) {
    try {
        const guilds = await Guild.find({ 'boosterSystem.enabled': true });

        for (const guildData of guilds) {
            const guild = client.guilds.cache.get(guildData.guildId);
            if (guild && guildData.boosterSystem?.channelId) {
                await updateBoosterEmbed(guild, guildData.boosterSystem.channelId, guildData.boosterSystem.bannerUrl);
            }
        }
    } catch (error) {
        console.error('Update all booster embeds error:', error);
    }
}

/**
 * Get boost emoji based on level
 */
function getBoostEmoji(level) {
    const emojis = ['🚀', '🔮', '💎', '👑'];
    return emojis[level] || '🚀';
}

module.exports = {
    initBoosterSystem,
    updateBoosterEmbed,
    handleNewBoost,
    updateAllBoosterEmbeds,
    BOOST_CHANNEL_ID
};
