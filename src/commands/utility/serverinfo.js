const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('View detailed server information'),

    async execute(interaction) {
        const guild = interaction.guild;
        await interaction.deferReply();

        try {
            const owner = await guild.fetchOwner();

            const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
            const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
            const categories = guild.channels.cache.filter(c => c.type === 4).size;
            const threads = guild.channels.cache.filter(c => c.type === 11 || c.type === 12).size;

            const totalMembers = guild.memberCount;
            const onlineMembers = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
            const botCount = guild.members.cache.filter(m => m.user.bot).size;

            const verificationLevels = ['None', 'Low', 'Medium', 'High', 'Very High'];
            const boostLevels = ['None', 'Level 1', 'Level 2', 'Level 3'];

            const features = guild.features.slice(0, 5).map(f =>
                f.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            );

            const embed = new EmbedBuilder()
                .setColor(config.colors.info)
                .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
                .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '👑 Owner', value: `${owner.user.tag}`, inline: true },
                    { name: '🆔 ID', value: `\`${guild.id}\``, inline: true },
                    { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                    {
                        name: '👥 Members', value: [
                            `Total: \`${totalMembers}\``,
                            `Humans: \`${totalMembers - botCount}\``,
                            `Bots: \`${botCount}\``
                        ].join('\n'), inline: true
                    },
                    {
                        name: '💬 Channels', value: [
                            `Text: \`${textChannels}\``,
                            `Voice: \`${voiceChannels}\``,
                            `Categories: \`${categories}\``
                        ].join('\n'), inline: true
                    },
                    { name: '🎭 Roles', value: `\`${guild.roles.cache.size}\` roles`, inline: true },
                    { name: '🔒 Verification', value: verificationLevels[guild.verificationLevel], inline: true },
                    { name: '💎 Boost', value: `${boostLevels[guild.premiumTier]}\n\`${guild.premiumSubscriptionCount}\` boosts`, inline: true },
                    { name: '😀 Emojis', value: `\`${guild.emojis.cache.size}\` emojis`, inline: true }
                )
                .setFooter({ text: 'Shonen Multiverse' })
                .setTimestamp();

            if (features.length > 0) {
                embed.addFields({ name: '✨ Features', value: features.join(', '), inline: false });
            }

            if (guild.bannerURL()) embed.setImage(guild.bannerURL({ size: 512 }));

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Serverinfo error:', error);
            await interaction.editReply({ content: '❌ Failed to fetch server info.' });
        }
    }
};
