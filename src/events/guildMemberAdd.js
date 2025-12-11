const { Events, EmbedBuilder } = require('discord.js');
const { checkRaid } = require('../handlers/antiRaidHandler');
const { checkBotAddition } = require('../systems/protectionSystem');
const { logMemberJoin } = require('../systems/loggingSystem');
const { handleMemberJoin: handleInviteJoin } = require('../systems/inviteSystem');
const { createWelcomeImage } = require('../systems/welcomeImageSystem');
const config = require('../config/config');

// Hardcoded channel ID - no setup required
const WELCOME_CHANNEL_ID = '1447218395564085341';

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member, client) {
        // Log member join
        await logMemberJoin(member).catch(console.error);

        // Track invites
        await handleInviteJoin(member).catch(console.error);

        // Check for bot additions
        if (member.user.bot) {
            await checkBotAddition(member, client);
            return;
        }

        // Add Unverified Role
        const unverifiedRoleId = '1439010347716579519';
        await member.roles.add(unverifiedRoleId).catch(err => console.error('Failed to assign unverified role:', err));

        // Check for raid
        if (config.antiRaid?.enabled) {
            await checkRaid(member, client);
        }

        // Send welcome message (no setup required)
        await sendWelcomeMessage(member, client);
    }
};

async function sendWelcomeMessage(member, client) {
    try {
        const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
        if (!channel) {
            console.log('Welcome channel not found:', WELCOME_CHANNEL_ID);
            return;
        }

        const memberCount = member.guild.memberCount;

        // Modern styled embed
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({
                name: '✨ New Member Joined!',
                iconURL: member.guild.iconURL({ dynamic: true })
            })
            .setTitle(`Welcome, ${member.user.username}!`)
            .setDescription(`Welcome <@${member.id}>! Thanks for joining **${member.guild.name}**, we are **${memberCount}** people now.`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                {
                    name: '👤 Username',
                    value: member.user.username,
                    inline: true
                },
                {
                    name: '📊 Member #',
                    value: `#${memberCount}`,
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
