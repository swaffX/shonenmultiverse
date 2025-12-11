const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Invite = require('../../models/Invite');
const { INVITE_MILESTONES } = require('../../systems/inviteSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('View invite statistics and leaderboard')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Check another user\'s invites')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const isSelf = targetUser.id === interaction.user.id;

        try {
            const inviteData = await Invite.findOrCreate(targetUser.id, interaction.guild.id);

            // Calculate stats
            const validInvites = inviteData.validInvites || 0;
            const leftInvites = inviteData.leftInvites || 0;
            const fakeInvites = inviteData.fakeInvites || 0;
            const totalInvites = inviteData.totalInvites || 0;
            const rewardsClaimed = inviteData.rewardsClaimed?.length || 0;

            // Find next milestone
            const nextMilestone = INVITE_MILESTONES.find(m => m > validInvites);
            const prevMilestone = nextMilestone
                ? INVITE_MILESTONES[INVITE_MILESTONES.indexOf(nextMilestone) - 1] || 0
                : INVITE_MILESTONES[INVITE_MILESTONES.length - 1];

            // Calculate progress
            let progressText = '';
            let progressBar = '';

            if (nextMilestone) {
                const currentProgress = validInvites - prevMilestone;
                const needed = nextMilestone - prevMilestone;
                const percentage = Math.round((currentProgress / needed) * 100);
                const filled = Math.floor((currentProgress / needed) * 15);

                progressBar = '▓'.repeat(filled) + '░'.repeat(15 - filled);
                progressText = `**${validInvites}** / **${nextMilestone}** invites (${percentage}%)`;
            } else {
                progressBar = '▓'.repeat(15);
                progressText = '🏆 **All milestones completed!**';
            }

            // Get guild rank
            const allInvites = await Invite.find({ guildId: interaction.guild.id })
                .sort({ validInvites: -1 })
                .limit(100);
            const rank = allInvites.findIndex(i => i.userId === targetUser.id) + 1;

            // Build modern embed
            const embed = new EmbedBuilder()
                .setColor('#8B5CF6')
                .setAuthor({
                    name: isSelf ? 'Your Invite Statistics' : `${targetUser.username}'s Invites`,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .setDescription([
                    `### 📊 Invite Overview`,
                    ``,
                    `\`${progressBar}\``,
                    progressText,
                    ``
                ].join('\n'))
                .addFields(
                    {
                        name: '✅ Valid Invites',
                        value: `\`${validInvites}\``,
                        inline: true
                    },
                    {
                        name: '👋 Left After Join',
                        value: `\`${leftInvites}\``,
                        inline: true
                    },
                    {
                        name: '⚠️ Fake/Invalid',
                        value: `\`${fakeInvites}\``,
                        inline: true
                    },
                    {
                        name: '📈 Total Invited',
                        value: `\`${totalInvites}\``,
                        inline: true
                    },
                    {
                        name: '🏅 Rewards Claimed',
                        value: `\`${rewardsClaimed}\``,
                        inline: true
                    },
                    {
                        name: '🏆 Server Rank',
                        value: rank > 0 ? `\`#${rank}\`` : '`N/A`',
                        inline: true
                    }
                )
                .setFooter({
                    text: `💡 Tip: Share your invite link to climb the leaderboard!`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();

            // Add milestone info
            if (nextMilestone) {
                const remaining = nextMilestone - validInvites;
                embed.addFields({
                    name: '🎯 Next Milestone',
                    value: `Invite **${remaining}** more to reach **${nextMilestone}** invites!`,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Invites command error:', error);
            await interaction.editReply({ content: '❌ Failed to load invite statistics.' });
        }
    }
};
