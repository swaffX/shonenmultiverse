const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-verification')
        .setDescription('Send the verification panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channelId = '1439267075456761906';
        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel) {
            return interaction.editReply('Target channel not found!');
        }

        const embed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setAuthor({
                name: 'Bloxlink',
                iconURL: 'https://cdn.discordapp.com/avatars/426537812993638400/f8372df034e320bf23d8c1143891823f.png'
            })
            .setDescription(`Welcome to **${interaction.guild.name}**! Click the button below to Verify with Bloxlink and gain access to the rest of the server.`)
            .setImage('https://media.discordapp.net/attachments/1063901768487968840/1142517863586861188/image.png');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Verify with Bloxlink')
                    .setStyle(ButtonStyle.Success)
                    .setURL('https://blox.link/verify')
                // Note: User wants "2. screenshot authorization". Since we can't host real OAuth easily, 
                // linking to actual Bloxlink is the safest "real" look if they use it.
                // If they want internal verify, we use a Custom ID button.
                // Request says "2. ekran görüntüsündeki yetkilendirmesi". That is OAuth.
                // Assuming they might want OUR bot to do it.
                // Let's use a Custom ID and simulate the OAuth window via Ephemeral or Link to our server.
                // For now, I will use a Custom ID and then explain the limitations.
            );

        // REVISING STRATEGY BASED ON USER REQUEST "doğrulamayı açıklamaya kod yazmayı onu doğrulamayı değilde..."
        // They want the OAuth flow. I'll make the button link to a placeholder URL that I will set up or to Bloxlink if that's what they mean.
        // Actually, looking at the screenshot, it IS Bloxlink.
        // If they want "Our Server's Version" of Bloxlink, I need to host a web server.

        // Let's use a Custom Button first, which sends an Ephemeral Message with the "Connect" link.

        const internalRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('start_verification')
                    .setLabel('Verify with Roblox')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setLabel('Need help?')
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId('verify_help')
            );


        await channel.send({ embeds: [embed], components: [internalRow] });

        await interaction.editReply('Verification panel sent!');
    }
};
