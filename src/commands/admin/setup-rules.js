const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const { isAdmin } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rules')
        .setDescription('Create server rules embed')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('banner_url')
                .setDescription('Banner image URL (optional)')
                .setRequired(false)),

    async execute(interaction, client) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need administrator permission to use this command.')],
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const bannerUrl = interaction.options.getString('banner_url');
            const { roles } = config.server;

            // Single Consolidated Rules Embed
            const rulesEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`📜 Shonen Multiverse - Server Rules`)
                .setDescription('By being in this server, you agree to follow the rules below.')
                .addFields(
                    {
                        name: '📋 General Rules',
                        value: [
                            '```',
                            '1. Be Respectful - No hate speech, harassment, or discrimination.',
                            '',
                            '2. No Spam - Avoid repetitive messages or caps.',
                            '',
                            '3. No NSFW Content - Zero tolerance policy.',
                            '',
                            '4. No Advertising - DMs or channels.',
                            '',
                            '5. Respect Staff - Follow moderator decisions.',
                            '```'
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '🎙️ Voice Rules',
                        value: '```\n• No mic spam\n• No voice changers\n• Respect others\n```',
                        inline: true
                    },
                    {
                        name: '⚠️ Punishments',
                        value: '```\n• Warn\n• Mute\n• Kick\n• Ban\n```',
                        inline: true
                    },
                    {
                        name: '📜 Terms of Service',
                        value: '> Follow [Discord TOS](https://discord.com/terms) & [Roblox TOS](https://en.help.roblox.com/hc/en-us/articles/115004647846)',
                        inline: false
                    }
                )
                .setFooter({ text: 'Shonen Multiverse • Last Updated' })
                .setTimestamp();

            if (bannerUrl) {
                rulesEmbed.setImage(bannerUrl);
            }

            // Send the single embed
            await interaction.channel.send({ embeds: [rulesEmbed] });

            await interaction.editReply({
                embeds: [successEmbed('Success', 'Rules embed created!')]
            });
        } catch (error) {
            console.error('Rules command error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Error', 'Failed to create rules embed.')]
            });
        }
    }
};
