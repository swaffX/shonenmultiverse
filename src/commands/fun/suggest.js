const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Suggestion channel
const SUGGESTION_CHANNEL_ID = '1448093280616185996';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Submit a suggestion for the server')
        .addStringOption(option =>
            option.setName('suggestion')
                .setDescription('Your suggestion')
                .setRequired(true)
                .setMaxLength(1000)),

    async execute(interaction, client) {
        const suggestion = interaction.options.getString('suggestion');
        const channel = interaction.guild.channels.cache.get(SUGGESTION_CHANNEL_ID);

        if (!channel) {
            return interaction.reply({
                content: '❌ Suggestion channel not found!',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({
                name: `💡 New Suggestion`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setDescription(suggestion)
            .addFields(
                { name: '👤 Submitted by', value: `<@${interaction.user.id}>`, inline: true },
                { name: '📊 Status', value: '`⏳ Pending`', inline: true }
            )
            .setFooter({ text: `Suggestion ID: ${Date.now().toString(36).toUpperCase()}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('suggest_upvote')
                .setLabel('0')
                .setEmoji('👍')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('suggest_downvote')
                .setLabel('0')
                .setEmoji('👎')
                .setStyle(ButtonStyle.Danger)
        );

        const message = await channel.send({ embeds: [embed], components: [row] });

        await interaction.reply({
            content: `✅ Your suggestion has been submitted! Check it out: <#${SUGGESTION_CHANNEL_ID}>`,
            ephemeral: true
        });
    }
};
