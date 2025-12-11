const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { createGiveaway, rerollGiveaway, endGiveaway } = require('../../systems/giveawaySystem');
const Giveaway = require('../../models/Giveaway');
const { isAdmin } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embedBuilder');
const ms = require('ms');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new giveaway')
                .addStringOption(option =>
                    option.setName('prize')
                        .setDescription('What are you giving away?')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('duration')
                        .setDescription('How long? (1m, 1h, 1d, 7d)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('winners')
                        .setDescription('Number of winners (default: 1)')
                        .setMinValue(1)
                        .setMaxValue(20)
                        .setRequired(false))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to host giveaway (default: current)')
                        .setRequired(false))
                .addRoleOption(option =>
                    option.setName('required_role')
                        .setDescription('Role required to enter')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('required_invites')
                        .setDescription('Minimum invites required to enter')
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End a giveaway early')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('Giveaway message ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reroll')
                .setDescription('Reroll to select new winner')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('Giveaway message ID')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('count')
                        .setDescription('Number of new winners to pick')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all active giveaways'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a giveaway')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('Giveaway message ID')
                        .setRequired(true))),

    async execute(interaction, client) {
        if (!isAdmin(interaction.member)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need administrator permission.')],
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'start': await handleStart(interaction, client); break;
            case 'end': await handleEnd(interaction, client); break;
            case 'reroll': await handleReroll(interaction, client); break;
            case 'list': await handleList(interaction, client); break;
            case 'delete': await handleDelete(interaction, client); break;
        }
    }
};

async function handleStart(interaction, client) {
    const prize = interaction.options.getString('prize');
    const durationStr = interaction.options.getString('duration');
    const winnersCount = interaction.options.getInteger('winners') || 1;
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const requiredRole = interaction.options.getRole('required_role');
    const requiredInvites = interaction.options.getInteger('required_invites') || 0;

    const duration = ms(durationStr);
    if (!duration || duration < 60000) {
        return interaction.reply({
            embeds: [errorEmbed('Invalid Duration', 'Minimum duration is 1 minute.\n\n**Examples:** `1m`, `30m`, `1h`, `1d`, `7d`')],
            ephemeral: true
        });
    }

    if (duration > 30 * 24 * 60 * 60 * 1000) {
        return interaction.reply({
            embeds: [errorEmbed('Invalid Duration', 'Maximum duration is 30 days.')],
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const giveaway = await createGiveaway(channel, interaction.user.id, prize, duration, winnersCount, requiredRole?.id, requiredInvites);

        const embed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('🎉 Giveaway Created!')
            .addFields(
                { name: '🎁 Prize', value: prize, inline: true },
                { name: '⏰ Duration', value: durationStr, inline: true },
                { name: '🏆 Winners', value: `${winnersCount}`, inline: true },
                { name: '📍 Channel', value: `${channel}`, inline: true }
            )
            .setFooter({ text: `Ends at` })
            .setTimestamp(giveaway.endsAt);

        if (requiredRole) {
            embed.addFields({ name: '🔒 Required Role', value: `${requiredRole}`, inline: true });
        }
        if (requiredInvites > 0) {
            embed.addFields({ name: '📨 Required Invites', value: `${requiredInvites}`, inline: true });
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Giveaway start error:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to create giveaway.')]
        });
    }
}

async function handleEnd(interaction, client) {
    const messageId = interaction.options.getString('message_id');

    try {
        const giveaway = await Giveaway.findOne({ messageId, guildId: interaction.guild.id });

        if (!giveaway) {
            return interaction.reply({
                embeds: [errorEmbed('Not Found', 'Giveaway not found with that ID.')],
                ephemeral: true
            });
        }

        if (giveaway.ended) {
            return interaction.reply({
                embeds: [errorEmbed('Already Ended', 'This giveaway has already ended.')],
                ephemeral: true
            });
        }

        await endGiveaway(giveaway._id, client);

        await interaction.reply({
            embeds: [successEmbed('Giveaway Ended', `**${giveaway.prize}** giveaway ended!\nWinners announced.`)],
            ephemeral: true
        });
    } catch (error) {
        console.error('Giveaway end error:', error);
        await interaction.reply({
            embeds: [errorEmbed('Error', 'Failed to end giveaway.')],
            ephemeral: true
        });
    }
}

async function handleReroll(interaction, client) {
    const messageId = interaction.options.getString('message_id');
    const count = interaction.options.getInteger('count') || 1;

    await interaction.deferReply({ ephemeral: true });

    try {
        const winners = [];
        for (let i = 0; i < count; i++) {
            const result = await rerollGiveaway(messageId, client);
            if (result.success) {
                winners.push(result.winnerId);
            } else if (i === 0) {
                return interaction.editReply({
                    embeds: [errorEmbed('Reroll Failed', result.message)]
                });
            }
        }

        if (winners.length > 0) {
            const mentions = winners.map(id => `<@${id}>`).join(', ');
            await interaction.editReply({
                embeds: [successEmbed('Rerolled!', `New winner(s): ${mentions}`)]
            });
        }
    } catch (error) {
        console.error('Giveaway reroll error:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to reroll.')]
        });
    }
}

async function handleList(interaction, client) {
    try {
        const giveaways = await Giveaway.find({
            guildId: interaction.guild.id,
            ended: false
        }).sort({ endsAt: 1 });

        if (giveaways.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(config.colors.info)
                .setTitle('📦 Active Giveaways')
                .setDescription('No active giveaways.\n\nUse `/giveaway start` to create one!')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const list = giveaways.map((g, i) => [
            `**${i + 1}. ${g.prize}**`,
            `> 🏆 \`${g.winnersCount}\` winners • 👥 \`${g.participants.length}\` entries`,
            `> ⏰ Ends <t:${Math.floor(g.endsAt.getTime() / 1000)}:R>`,
            `> 📝 \`${g.messageId}\``
        ].join('\n')).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(config.colors.giveaway)
            .setTitle('🎉 Active Giveaways')
            .setDescription(list)
            .setFooter({ text: `${giveaways.length} active` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Giveaway list error:', error);
        await interaction.reply({
            embeds: [errorEmbed('Error', 'Failed to list giveaways.')],
            ephemeral: true
        });
    }
}

async function handleDelete(interaction, client) {
    const messageId = interaction.options.getString('message_id');

    try {
        const giveaway = await Giveaway.findOne({ messageId, guildId: interaction.guild.id });

        if (!giveaway) {
            return interaction.reply({
                embeds: [errorEmbed('Not Found', 'Giveaway not found.')],
                ephemeral: true
            });
        }

        try {
            const channel = await client.channels.fetch(giveaway.channelId);
            const message = await channel.messages.fetch(messageId);
            await message.delete();
        } catch (err) { }

        await Giveaway.deleteOne({ _id: giveaway._id });

        await interaction.reply({
            embeds: [successEmbed('Deleted', `**${giveaway.prize}** giveaway deleted.`)],
            ephemeral: true
        });
    } catch (error) {
        console.error('Giveaway delete error:', error);
        await interaction.reply({
            embeds: [errorEmbed('Error', 'Failed to delete.')],
            ephemeral: true
        });
    }
}
