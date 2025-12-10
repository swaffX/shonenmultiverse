const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../../models/User');
const Guild = require('../../models/Guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Connect your Roblox account')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Your Roblox username')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const robloxUsername = interaction.options.getString('username');
        const discordUser = interaction.user;

        try {
            // 1. Get Roblox ID from username
            const idRes = await fetch('https://users.roblox.com/v1/usernames/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernames: [robloxUsername], excludeBannedUsers: true })
            });

            if (!idRes.ok) throw new Error('Roblox API Error');
            const idData = await idRes.json();

            if (!idData.data || idData.data.length === 0) {
                return interaction.editReply({ content: `❌ User **${robloxUsername}** not found on Roblox.` });
            }

            const robloxUser = idData.data[0];
            const robloxId = robloxUser.id;

            // 2. Check if already verified in DB
            let user = await User.findOne({ oderId: discordUser.id, guildId: interaction.guild.id });
            if (user && user.isVerified && user.robloxId === robloxId.toString()) {
                return interaction.editReply({ content: `✅ You are already verified as **${robloxUser.name}**!` });
            }

            // 3. Generate Verification Code
            const verifyCode = `SM-${Math.floor(Math.random() * 10000)}-${discordUser.username.substring(0, 3).toUpperCase()}`;

            const embed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle('🔗 Roblox Verification')
                .setDescription(`To verify as **${robloxUser.name}**, please follow these steps:`)
                .addFields(
                    { name: 'Step 1', value: `Go to your Roblox profile.\n[Click Here](https://www.roblox.com/users/${robloxId}/profile)` },
                    { name: 'Step 2', value: `Put this code in your **About/Blurb** section:\n\`${verifyCode}\`` },
                    { name: 'Step 3', value: 'Click the **Done** button below.' }
                )
                .setFooter({ text: 'You have 5 minutes to verify.' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`verify_check_${robloxId}_${verifyCode}`)
                        .setLabel('Done')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setLabel('Profile Link')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://www.roblox.com/users/${robloxId}/profile`)
                );

            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Verify error:', error);
            await interaction.editReply({ content: '❌ An error occurred connecting to Roblox API.' });
        }
    }
};
