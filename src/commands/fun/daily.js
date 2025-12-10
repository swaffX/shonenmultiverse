const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const { getRequiredXP } = require('../../utils/levelUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily XP reward!'),

    async execute(interaction, client) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        let user = await User.findOne({ oderId: userId, guildId: guildId });
        if (!user) {
            user = new User({ oderId: userId, guildId: guildId });
        }

        const now = new Date();
        const lastDaily = user.lastDaily;
        const ONE_DAY = 24 * 60 * 60 * 1000;

        // Check if 24 hours have passed
        if (lastDaily && (now - lastDaily) < ONE_DAY) {
            const remaining = ONE_DAY - (now - lastDaily);
            const hours = Math.floor(remaining / (60 * 60 * 1000));
            const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

            return interaction.reply({ 
                content: `⏳ You have already claimed your daily reward!\nCome back in **${hours}h ${minutes}m**.`, 
                ephemeral: true 
            });
        }

        // Streak logic
        let streak = user.dailyStreak || 0;
        if (lastDaily && (now - lastDaily) < (ONE_DAY * 2)) {
            streak += 1;
        } else {
            streak = 1; // Reset streak if missed a day
        }

        // Calculate Reward
        const baseXP = Math.floor(Math.random() * 101) + 50; // 50-150 XP
        const streakBonus = Math.min(streak * 5, 50); // Max 50 bonus XP
        const totalXP = baseXP + streakBonus;

        user.xp += totalXP;
        user.lastDaily = now;
        user.dailyStreak = streak;
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('🌞 Daily Reward Claimed!')
            .setDescription(`You earned **${totalXP} XP** today!`)
            .addFields(
                { name: '💰 Base Reward', value: `${baseXP} XP`, inline: true },
                { name: '🔥 Streak Bonus', value: `${streakBonus} XP`, inline: true },
                { name: '📅 Current Streak', value: `${streak} days`, inline: true }
            )
            .setFooter({ text: 'Come back tomorrow for more!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
