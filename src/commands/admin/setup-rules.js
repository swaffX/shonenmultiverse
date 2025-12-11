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

            const rulesEmbed = new EmbedBuilder()
                .setColor('#2B2D31')
                .setAuthor({
                    name: 'SHONEN MULTIVERSE',
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTitle('📜 Server Rules')
                .setDescription(
                    `> By being in this server, you agree to follow all rules below.\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                )
                .addFields(
                    {
                        name: '📋 General Conduct',
                        value: [
                            '> **1.** Be respectful to all members',
                            '> **2.** No hate speech, harassment, or discrimination',
                            '> **3.** No spam or excessive caps',
                            '> **4.** No NSFW content (zero tolerance)',
                            '> **5.** No advertising without permission'
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '🎙️ Voice Chat',
                        value: [
                            '```',
                            '• No mic spam or loud noises',
                            '• No voice changers without permission',
                            '• Respect ongoing conversations',
                            '• Keep background noise minimal',
                            '```'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '⚔️ Gaming',
                        value: [
                            '```',
                            '• No cheating or exploiting',
                            '• Be a good sport',
                            '• Report bugs, dont abuse them',
                            '• Help new players',
                            '```'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '⚠️ Consequences',
                        value: [
                            '> **Tier 1:** Verbal Warning',
                            '> **Tier 2:** Temporary Mute',
                            '> **Tier 3:** Temporary Ban',
                            '> **Tier 4:** Permanent Ban'
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '📜 Terms of Service',
                        value: '> 🔗 [Discord ToS](https://discord.com/terms) • [Roblox ToS](https://en.help.roblox.com/hc/en-us/articles/115004647846)',
                        inline: false
                    }
                )
                .setFooter({
                    text: '⚖️ Staff decisions are final • Last updated',
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();

            if (bannerUrl) {
                rulesEmbed.setImage(bannerUrl);
            }

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
