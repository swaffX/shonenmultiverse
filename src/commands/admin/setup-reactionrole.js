const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ReactionRole = require('../../models/ReactionRole');
const config = require('../../config/config');
const { isAdmin } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactionrole')
        .setDescription('Manage reaction role system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new reaction role message')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Message title')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Message description')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add an emoji-role pair to existing message')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('Reaction role message ID')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to assign')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Role description')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove an emoji-role pair from message')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('Reaction role message ID')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji to remove')
                        .setRequired(true))),

    async execute(interaction, client) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need administrator permission to use this command.')],
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            await handleCreate(interaction);
        } else if (subcommand === 'add') {
            await handleAdd(interaction);
        } else if (subcommand === 'remove') {
            await handleRemove(interaction);
        }
    }
};

async function handleCreate(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description') || 'React below to get your roles!';

    try {
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`🎭 ${title}`)
            .setDescription(description)
            .setFooter({ text: 'Use /reactionrole add to add emoji-role pairs' })
            .setTimestamp();

        const message = await interaction.channel.send({ embeds: [embed] });

        await ReactionRole.create({
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
            messageId: message.id,
            title,
            description,
            roles: []
        });

        await interaction.reply({
            embeds: [successEmbed('Success', `Reaction role message created!\n\n**Message ID:** \`${message.id}\`\n\nUse: \`/reactionrole add message_id:${message.id} emoji:📢 role:@RoleName\``)],
            ephemeral: true
        });
    } catch (error) {
        console.error('Reaction role create error:', error);
        await interaction.reply({
            embeds: [errorEmbed('Error', 'Failed to create reaction role message.')],
            ephemeral: true
        });
    }
}

async function handleAdd(interaction) {
    const messageId = interaction.options.getString('message_id');
    const emoji = interaction.options.getString('emoji');
    const role = interaction.options.getRole('role');
    const roleDescription = interaction.options.getString('description') || '';

    try {
        const reactionRole = await ReactionRole.findByMessage(messageId);

        if (!reactionRole) {
            return interaction.reply({
                embeds: [errorEmbed('Error', 'No reaction role message found with that ID.')],
                ephemeral: true
            });
        }

        if (reactionRole.roles.some(r => r.emoji === emoji)) {
            return interaction.reply({
                embeds: [errorEmbed('Error', 'That emoji is already in use.')],
                ephemeral: true
            });
        }

        reactionRole.roles.push({
            emoji,
            roleId: role.id,
            description: roleDescription
        });
        await reactionRole.save();

        const channel = await interaction.guild.channels.fetch(reactionRole.channelId);
        const message = await channel.messages.fetch(messageId);

        const rolesText = reactionRole.roles.map(r => {
            const desc = r.description ? ` - ${r.description}` : '';
            return `${r.emoji} - <@&${r.roleId}>${desc}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`🎭 ${reactionRole.title}`)
            .setDescription(`${reactionRole.description}\n\n${rolesText}`)
            .setFooter({ text: 'Shonen Multiverse • Anime RPG' })
            .setTimestamp();

        await message.edit({ embeds: [embed] });
        await message.react(emoji);

        await interaction.reply({
            embeds: [successEmbed('Success', `Added ${emoji} for ${role} role!`)],
            ephemeral: true
        });
    } catch (error) {
        console.error('Reaction role add error:', error);
        await interaction.reply({
            embeds: [errorEmbed('Error', 'Failed to add emoji-role pair.')],
            ephemeral: true
        });
    }
}

async function handleRemove(interaction) {
    const messageId = interaction.options.getString('message_id');
    const emoji = interaction.options.getString('emoji');

    try {
        const reactionRole = await ReactionRole.findByMessage(messageId);

        if (!reactionRole) {
            return interaction.reply({
                embeds: [errorEmbed('Error', 'No reaction role message found with that ID.')],
                ephemeral: true
            });
        }

        const index = reactionRole.roles.findIndex(r => r.emoji === emoji);
        if (index === -1) {
            return interaction.reply({
                embeds: [errorEmbed('Error', 'That emoji was not found.')],
                ephemeral: true
            });
        }

        reactionRole.roles.splice(index, 1);
        await reactionRole.save();

        const channel = await interaction.guild.channels.fetch(reactionRole.channelId);
        const message = await channel.messages.fetch(messageId);

        const reactions = message.reactions.cache.get(emoji);
        if (reactions) {
            await reactions.remove();
        }

        const rolesText = reactionRole.roles.length > 0
            ? reactionRole.roles.map(r => `${r.emoji} - <@&${r.roleId}>${r.description ? ` - ${r.description}` : ''}`).join('\n')
            : 'No roles added yet.';

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`🎭 ${reactionRole.title}`)
            .setDescription(`${reactionRole.description}\n\n${rolesText}`)
            .setFooter({ text: 'Shonen Multiverse • Anime RPG' })
            .setTimestamp();

        await message.edit({ embeds: [embed] });

        await interaction.reply({
            embeds: [successEmbed('Success', `Removed ${emoji} from reaction roles!`)],
            ephemeral: true
        });
    } catch (error) {
        console.error('Reaction role remove error:', error);
        await interaction.reply({
            embeds: [errorEmbed('Error', 'Failed to remove emoji-role pair.')],
            ephemeral: true
        });
    }
}
