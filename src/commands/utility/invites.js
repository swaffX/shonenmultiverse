const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserInvites, getInviteLeaderboard } = require('../../systems/inviteSystem');
const { createInviteImage } = require('../../systems/welcomeImageSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('View invite statistics')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Check another user\'s invites')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;

        try {
            // Get invite count directly from Discord API
            const inviteCount = await getUserInvites(interaction.guild, targetUser.id);

            // Get leaderboard to find rank
            const leaderboard = await getInviteLeaderboard(interaction.guild);
            const rank = leaderboard.findIndex(u => u.userId === targetUser.id) + 1;

            const embed = new EmbedBuilder()
                .setColor('#8B5CF6')
                .setAuthor({
                    name: `${targetUser.username}'s Invite Stats`,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .setDescription(`📊 **Total Invites:** \`${inviteCount}\`\n🏆 **Server Rank:** ${rank > 0 ? `#${rank}` : 'N/A'}`)
                .setFooter({
                    text: `${interaction.guild.name} • Invite more friends!`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();

            // Generate image
            const attachment = await createInviteImage(targetUser, '');

            if (attachment) {
                embed.setImage('attachment://invite.png');
                await interaction.editReply({ embeds: [embed], files: [attachment] });
            } else {
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Invites command error:', error);
            await interaction.editReply({ content: '❌ Failed to load invite statistics.' });
        }
    }
};
