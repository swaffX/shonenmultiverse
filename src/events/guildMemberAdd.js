const { Events, EmbedBuilder } = require('discord.js');
const { checkRaid } = require('../handlers/antiRaidHandler');
const { checkBotAddition } = require('../systems/protectionSystem');
const { logMemberJoin } = require('../systems/loggingSystem');
const Guild = require('../models/Guild');
const { createWelcomeImage } = require('../systems/welcomeImageSystem');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member, client) {
        // Log member join
        await logMemberJoin(member).catch(console.error);

        // Check for bot additions
        if (member.user.bot) {
            await checkBotAddition(member, client);
            return;
        }

        // Check for raid
        if (config.antiRaid.enabled) {
            await checkRaid(member, client);
        }

        // Send welcome message
        await sendWelcomeMessage(member, client);
    }
};

async function sendWelcomeMessage(member, client) {
    try {
        const guildData = await Guild.findOne({ guildId: member.guild.id });

        // Check if welcome is enabled
        if (!guildData?.welcome?.enabled || !guildData.welcome.channelId) {
            return;
        }

        const channel = member.guild.channels.cache.get(guildData.welcome.channelId);
        if (!channel) return;

        const memberCount = member.guild.memberCount;

        // Modern styled message with bold emphasis
        const defaultMessage = `Hey <@${member.id}>! 🎉\n\nWelcome to **${member.guild.name}**!\nYou are our **${memberCount}${getOrdinalSuffix(memberCount)}** member!`;

        const message = (guildData.welcome.message || defaultMessage)
            .replace('{user}', `<@${member.id}>`)
            .replace('{server}', `**${member.guild.name}**`)
            .replace('{count}', `**${memberCount}**`);

        // Modern gradient-style color
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#5865F2') // Discord blurple for modern look
            .setAuthor({
                name: '✨ New Member Joined!',
                iconURL: member.guild.iconURL({ dynamic: true })
            })
            .setTitle(`Welcome, ${member.user.username}!`)
            .setDescription(message)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                {
                    name: '👤 Username',
                    value: `\`${member.user.tag}\``,
                    inline: true
                },
                {
                    name: '📊 Member #',
                    value: `\`#${memberCount}\``,
                    inline: true
                },
                {
                    name: '📅 Joined',
                    value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                    inline: true
                }
            )
            .setFooter({
                text: `${member.guild.name} • Enjoy your stay!`,
                iconURL: member.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        // Generate custom welcome image
        const attachment = await createWelcomeImage(member);

        if (attachment) {
            welcomeEmbed.setImage('attachment://welcome.png');
            await channel.send({ embeds: [welcomeEmbed], files: [attachment] });
        } else {
            if (guildData.welcome.bannerUrl) {
                welcomeEmbed.setImage(guildData.welcome.bannerUrl);
            }
            await channel.send({ embeds: [welcomeEmbed] });
        }
        console.log(`👋 Welcome message sent for ${member.user.tag} in ${member.guild.name}`);
    } catch (error) {
        console.error('Welcome message error:', error);
    }
}

// Helper function for ordinal suffix
function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}
