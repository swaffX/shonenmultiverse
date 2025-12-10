const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const PLACE_ID = '130542097430425';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Show Shonen Multiverse game status'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // 1. Get Universe ID from Place ID
            const placeRes = await fetch(`https://games.roblox.com/v1/games/multiget-place-details?placeIds=${PLACE_ID}&secure=true`);

            if (placeRes.status === 401 || placeRes.status === 403) {
                return interaction.editReply({
                    content: '🔒 **Game is Private**\nI cannot fetch stats for private games. Please set the game to **Public** to see stats.',
                    embeds: []
                });
            }

            if (!placeRes.ok) throw new Error(`Failed to fetch place details (Status: ${placeRes.status})`);

            const placeData = await placeRes.json();
            const universeId = placeData[0]?.universeId;

            if (!universeId) throw new Error('Universe ID not found');

            // 2. Get Game Details
            const gameRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
            if (!gameRes.ok) throw new Error('Failed to fetch game details');

            const gameData = await gameRes.json();
            const game = gameData.data[0];

            if (!game) throw new Error('Game data not found');

            // 3. Get Thumbnail
            const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`);
            const thumbData = await thumbRes.json();
            const thumbnail = thumbData.data?.[0]?.imageUrl;

            const embed = new EmbedBuilder()
                .setColor('#00ADEF') // Roblox Blue
                .setTitle(`🎮 ${game.name}`)
                .setURL(`https://www.roblox.com/games/${PLACE_ID}`)
                .setDescription(game.description || 'No description available.')
                .setThumbnail(thumbnail)
                .addFields(
                    { name: '🟢 Playing', value: `**${game.playing.toLocaleString()}**`, inline: true },
                    { name: '👣 Visits', value: `**${game.visits.toLocaleString()}**`, inline: true },
                    { name: '👍 Likes', value: `**${(game.upVotes || 0).toLocaleString()}**`, inline: true },
                    { name: '⭐ Favorites', value: `**${(game.favoritedCount || 0).toLocaleString()}**`, inline: true },
                    { name: '📅 Created', value: `<t:${Math.floor(new Date(game.created).getTime() / 1000)}:R>`, inline: true },
                    { name: '🔄 Updated', value: `<t:${Math.floor(new Date(game.updated).getTime() / 1000)}:R>`, inline: true }
                )
                .setFooter({ text: '🔴 Live Status' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Status command error:', error);
            await interaction.editReply({ content: '❌ Failed to fetch game status. Roblox API might be down.' });
        }
    }
};
