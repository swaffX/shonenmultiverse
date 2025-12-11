const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Invite = require('../../models/Invite');
const { INVITE_MILESTONES } = require('../../systems/inviteSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Davet istatistiklerini göster')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Kimin davetlerini görmek istiyorsun?')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;

        try {
            const inviteData = await Invite.findOrCreate(targetUser.id, interaction.guild.id);

            // Find next milestone
            let nextMilestone = INVITE_MILESTONES.find(m => m > inviteData.validInvites) || 'MAX';
            let progress = nextMilestone === 'MAX'
                ? '🏆 Tüm milestonelara ulaştın!'
                : `Sonraki: **${nextMilestone}** davet (${inviteData.validInvites}/${nextMilestone})`;

            // Progress bar
            let progressBar = '';
            if (nextMilestone !== 'MAX') {
                const prevMilestone = INVITE_MILESTONES[INVITE_MILESTONES.indexOf(nextMilestone) - 1] || 0;
                const currentProgress = inviteData.validInvites - prevMilestone;
                const needed = nextMilestone - prevMilestone;
                const filled = Math.floor((currentProgress / needed) * 10);
                progressBar = '█'.repeat(filled) + '░'.repeat(10 - filled);
            }

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({
                    name: `${targetUser.username} - Davet İstatistikleri`,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '✅ Geçerli Davetler', value: `\`${inviteData.validInvites}\``, inline: true },
                    { name: '❌ Ayrılanlar', value: `\`${inviteData.leftInvites}\``, inline: true },
                    { name: '⚠️ Sahte/Geçersiz', value: `\`${inviteData.fakeInvites}\``, inline: true },
                    { name: '📊 Toplam', value: `\`${inviteData.totalInvites}\``, inline: true },
                    { name: '🏅 Kazanılan Ödüller', value: `\`${inviteData.rewardsClaimed.length}\``, inline: true },
                    { name: '\u200b', value: '\u200b', inline: true }
                )
                .setDescription([
                    progressBar ? `\`${progressBar}\`` : '',
                    progress
                ].join('\n'))
                .setFooter({ text: 'Davet linkini /invite ile oluştur!' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Invites command error:', error);
            await interaction.editReply({ content: '❌ Davet bilgileri yüklenemedi.' });
        }
    }
};
