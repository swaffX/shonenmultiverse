const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserAchievements, ACHIEVEMENTS } = require('../../systems/achievementSystem');
const { createAchievementCard } = require('../../systems/welcomeImageSystem');

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

            // Calculate stats
            const unlocked = achievements.filter(a => a.unlocked);
            const totalXP = unlocked.reduce((sum, a) => sum + (a.xpReward || 0), 0);

            // Find rarest achievement (highest tier unlocked)
            const rarestAch = unlocked.sort((a, b) => (b.tier || 0) - (a.tier || 0))[0];
            const rarest = rarestAch ? rarestAch.name.replace(/[^\w\s]/g, '').trim() : 'None yet';

            const stats = { totalXP, rarest };

            // Generate achievement card image
            const attachment = await createAchievementCard(targetUser, achievements, stats);

            if (attachment) {
                // Simple embed with image
                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setAuthor({
                        name: `${targetUser.username}'s Achievements`,
                        iconURL: targetUser.displayAvatarURL({ dynamic: true })
                    })
                    .setDescription(`🏆 **${unlocked.length}/${achievements.length}** achievements unlocked\n💰 **${totalXP} XP** earned from achievements`)
                    .setImage('attachment://achievements.png')
                    .setFooter({
                        text: 'Keep grinding to unlock more achievements!',
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed], files: [attachment] });
            } else {
                // Fallback to text-based display
                const categories = {
                    messages: { name: '💬 Messages', items: [] },
                    voice: { name: '🎤 Voice', items: [] },
                    level: { name: '⭐ Level', items: [] },
                    invites: { name: '📨 Invites', items: [] },
                    special: { name: '✨ Special', items: [] }
                };

                for (const ach of achievements) {
                    const type = ach.requirement?.type || ach.category;
                    const status = ach.unlocked
                        ? `✅ **${ach.name}**`
                        : `⬜ ${ach.name} (${ach.progress}/${ach.max})`;

                    if (categories[type]) {
                        categories[type].items.push(status);
                    }
                }

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setAuthor({
                        name: `${targetUser.username} - Achievements`,
                        iconURL: targetUser.displayAvatarURL({ dynamic: true })
                    })
                    .setDescription(`🏆 **${unlocked.length}/${achievements.length}** achievements unlocked`)
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setTimestamp();

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
            }

        } catch (error) {
            console.error('Achievements command error:', error);
            await interaction.editReply({ content: '❌ Failed to load achievements.' });
        }
    }
};
