```javascript
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserRank } = require('../../systems/levelSystem');
const { createRankCard } = require('../../systems/rankCardSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Shows your current level and rank.')
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to check')
            .setRequired(false)),
            
    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('target') || interaction.user;
        
        if (targetUser.bot) {
            return interaction.editReply('🤖 Bots do not gain XP!');
        }

        const rankData = await getUserRank(targetUser.id, interaction.guild.id);
                { name: '🏆 Server Rank', value: `#${ rank } `, inline: true },
                { name: '📊 Level', value: `${ user.level } `, inline: true },
                { name: '✨ XP', value: `${ user.xp.toLocaleString() } `, inline: true },
                { name: '📈 Progress to Next Level', value: `${ progressBar } ${ percentage }%\n\`${progressXP}/${neededXP} XP\``, inline: false },
{ name: '💬 Messages', value: `${user.totalMessages.toLocaleString()}`, inline: true },
{ name: '🎤 Voice Time', value: formatDuration(user.totalVoiceTime), inline: true }
            )
            .setTimestamp();

await interaction.editReply({ embeds: [embed] });
    }
};
