const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const { isAdmin } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Create info dropdown menu')
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
            const memberCount = interaction.guild.memberCount;
            const boostLevel = interaction.guild.premiumTier;
            const boostCount = interaction.guild.premiumSubscriptionCount || 0;

            const infoEmbed = new EmbedBuilder()
                .setColor('#2B2D31')
                .setAuthor({
                    name: 'SHONEN MULTIVERSE',
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTitle('📚 Information Center')
                .setDescription(
                    `> Your hub for everything about ${interaction.guild.name}!\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `**📊 Server Statistics**\n\n` +
                    `> 👥 **Members:** \`${memberCount.toLocaleString()}\`\n` +
                    `> 💎 **Boost Level:** \`Level ${boostLevel}\`\n` +
                    `> 🚀 **Total Boosts:** \`${boostCount}\`\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                )
                .addFields(
                    {
                        name: '📖 Quick Navigation',
                        value: [
                            '```',
                            '🎭 Roles    - View server roles & perks',
                            '🔗 Links    - Official game & social links',
                            '📹 CC       - Content Creator requirements',
                            '```'
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '💡 Tip',
                        value: '> Use the dropdown menu below to explore each section!',
                        inline: false
                    }
                )
                .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 512 }))
                .setFooter({
                    text: '⭐ Select an option to learn more!',
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();

            if (bannerUrl) {
                infoEmbed.setImage(bannerUrl);
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('info_select')
                .setPlaceholder('🔍 Select a category to explore...')
                .addOptions([
                    {
                        label: 'Server Roles',
                        description: 'View all roles and how to get them',
                        value: 'info_roles',
                        emoji: '🎭'
                    },
                    {
                        label: 'Official Links',
                        description: 'Game, group, and social media links',
                        value: 'info_links',
                        emoji: '🔗'
                    },
                    {
                        label: 'Content Creator',
                        description: 'Requirements for CC role',
                        value: 'info_cc',
                        emoji: '📹'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.channel.send({ embeds: [infoEmbed], components: [row] });

            await interaction.editReply({
                embeds: [successEmbed('Success', 'Info dropdown menu created!')]
            });
        } catch (error) {
            console.error('Info command error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Error', 'Failed to create info menu.')]
            });
        }
    }
};
