const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserAchievements } = require('../../systems/achievementSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('achievements')
        .setDescription('View your achievements')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Check another user\'s achievements')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;

        try {
            // Pass guild for invite count
            const achievements = await getUserAchievements(targetUser.id, interaction.guild.id, interaction.guild);

            // Group by category - ALL ENGLISH
            const categories = {
                messages: { name: '💬 Messages', items: [] },
                voice: { name: '🎤 Voice', items: [] },
                level: { name: '⭐ Level', items: [] },
                invites: { name: '📨 Invites', items: [] },
                special: { name: '✨ Special', items: [] }
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

            // Build embed - ALL ENGLISH
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setAuthor({
                    name: `${targetUser.username} - Achievements`,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setDescription(`🏆 **${totalUnlocked}/${totalAchievements}** achievements unlocked`)
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
            await interaction.editReply({ content: '❌ Failed to load achievements.' });
        }
    }
};
