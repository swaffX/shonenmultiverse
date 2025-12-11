const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserAchievements, ACHIEVEMENTS } = require('../../systems/achievementSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('achievements')
        .setDescription('Başarımlarını görüntüle')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Kimin başarımlarını görmek istiyorsun?')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;

        try {
            const achievements = await getUserAchievements(targetUser.id, interaction.guild.id);

            // Group by category
            const categories = {
                messages: { name: '💬 Mesaj', items: [] },
                voice: { name: '🎤 Ses', items: [] },
                level: { name: '⭐ Level', items: [] },
                invites: { name: '📨 Davet', items: [] },
                special: { name: '✨ Özel', items: [] }
            };

            let totalUnlocked = 0;
            const totalAchievements = achievements.length;

            for (const ach of achievements) {
                const type = ach.requirement.type;
                if (ach.unlocked) totalUnlocked++;

                const status = ach.unlocked
                    ? `✅ ${ach.emoji} **${ach.name}**`
                    : `⬜ ${ach.emoji} ${ach.name} (${ach.progress}/${ach.max})`;

                if (categories[type]) {
                    categories[type].items.push(status);
                }
            }

            // Build embed
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setAuthor({
                    name: `${targetUser.username} - Başarımlar`,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setDescription(`🏆 **${totalUnlocked}/${totalAchievements}** başarım açıldı`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .setTimestamp();

            // Add category fields
            for (const [key, cat] of Object.entries(categories)) {
                if (cat.items.length > 0) {
                    embed.addFields({
                        name: cat.name,
                        value: cat.items.join('\n'),
                        inline: false
                    });
                }
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Achievements command error:', error);
            await interaction.editReply({ content: '❌ Başarımlar yüklenemedi.' });
        }
    }
};
