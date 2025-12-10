const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');
const { setGroupRank, getGroupRoles, getUserGroupRank } = require('../../systems/robloxGroupSystem');
const config = require('../../config/config');

// Group ID from config (assuming it's in config.roblox.groupId, if not we use a constant or fetch from env)
// For now, let's assume it needs to be added to config or Env. using a placeholder.
const GROUP_ID = process.env.ROBLOX_GROUP_ID || '34661858'; // Defaulting to the ID from context if known, else user sets it.

module.exports = {
    data: new SlashCommandBuilder()
        .setName('group')
        .setDescription('Manage Roblox Group Ranks')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('promote')
                .setDescription('Promote a user in the Roblox Group')
                .addUserOption(option => option.setName('user').setDescription('The Discord user').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('demote')
                .setDescription('Demote a user in the Roblox Group')
                .addUserOption(option => option.setName('user').setDescription('The Discord user').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setrank')
                .setDescription('Set a specific rank for a user')
                .addUserOption(option => option.setName('user').setDescription('The Discord user').setRequired(true))
                .addIntegerOption(option => option.setName('rank_id').setDescription('The Roblox Rank ID (1-255)').setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('user');

        // Find Roblox ID linked to this Discord User
        const userData = await User.findOne({ discordId: targetUser.id });

        if (!userData || !userData.robloxId) {
            return interaction.editReply(`❌ <@${targetUser.id}> verifies that they have linked their Roblox account using /verify first.`);
        }

        const robloxId = userData.robloxId;
        const roles = await getGroupRoles(GROUP_ID);
        const currentRole = await getUserGroupRank(robloxId, GROUP_ID);

        if (!currentRole) {
            return interaction.editReply(`❌ User is not in the Roblox Group.`);
        }

        // Sort roles by rank
        const sortedRoles = roles.sort((a, b) => a.rank - b.rank);
        const currentRoleIndex = sortedRoles.findIndex(r => r.rank === currentRole.rank);

        let newRole = null;

        if (subcommand === 'promote') {
            if (currentRoleIndex >= sortedRoles.length - 1) {
                return interaction.editReply('❌ User is already at the highest rank.');
            }
            newRole = sortedRoles[currentRoleIndex + 1];
        } else if (subcommand === 'demote') {
            if (currentRoleIndex <= 0) {
                return interaction.editReply('❌ User is already at the lowest rank.');
            }
            newRole = sortedRoles[currentRoleIndex - 1];
        } else if (subcommand === 'setrank') {
            const targetRankId = interaction.options.getInteger('rank_id');
            newRole = roles.find(r => r.rank === targetRankId); // Usually rank ID is 1-255, checking 'rank' property

            // If user meant Role ID (unique long ID) vs Rank (1-255). 
            // Usually commands use Rank (1-255).
            if (!newRole) {
                // Try finding by Role ID just in case
                newRole = roles.find(r => r.id === targetRankId);
            }

            if (!newRole) {
                return interaction.editReply(`❌ Invalid Rank ID. Available Ranks: ${roles.map(r => r.rank).join(', ')}`);
            }
        }

        try {
            await setGroupRank(robloxId, GROUP_ID, newRole.id); // setGroupRank expects Role ID (the long one)

            const embed = new EmbedBuilder()
                .setColor('#00D166')
                .setTitle(`✅ Group Rank Updated`)
                .setDescription(`Successfully changed rank for **${targetUser.username}**`)
                .addFields(
                    { name: 'Old Rank', value: `${currentRole.name} (${currentRole.rank})`, inline: true },
                    { name: 'New Rank', value: `${newRole.name} (${newRole.rank})`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply(`❌ Error changing rank: \`${error.message}\``);
        }
    },
};
