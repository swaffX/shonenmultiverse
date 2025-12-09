const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const { isAdmin } = require('../../utils/permissions');
const { errorEmbed } = require('../../utils/embedBuilder');

// Store active polls
const activePolls = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create an interactive poll')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Poll question')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('options')
                .setDescription('Options separated by | (Yes|No|Maybe)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration (1h, 1d) - default: 24h')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('anonymous')
                .setDescription('Hide voters')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('multiple')
                .setDescription('Allow multiple votes')
                .setRequired(false)),

    async execute(interaction, client) {
        const question = interaction.options.getString('question');
        const optionsStr = interaction.options.getString('options');
        const durationStr = interaction.options.getString('duration') || '24h';
        const anonymous = interaction.options.getBoolean('anonymous') || false;
        const multiple = interaction.options.getBoolean('multiple') || false;

        const options = optionsStr.split('|').map(o => o.trim()).filter(o => o.length > 0);

        if (options.length < 2 || options.length > 10) {
            return interaction.reply({
                embeds: [errorEmbed('Error', 'Options must be between 2-10.')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const duration = require('ms')(durationStr) || 24 * 60 * 60 * 1000;
            const endsAt = new Date(Date.now() + duration);

            const votes = {};
            const voters = {};
            options.forEach((_, i) => { votes[i] = 0; voters[i] = []; });

            const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

            const embed = createPollEmbed(question, options, votes, 0, endsAt, interaction.user, anonymous, multiple, numberEmojis);
            const rows = createPollButtons(options, numberEmojis, false);

            const message = await interaction.editReply({ embeds: [embed], components: rows });

            const pollData = { question, options, votes, voters, creatorId: interaction.user.id, ended: false, anonymous, multiple, endsAt, numberEmojis };
            activePolls.set(message.id, pollData);

            const collector = message.createMessageComponentCollector({ time: duration });

            collector.on('collect', async (i) => {
                const poll = activePolls.get(message.id);
                if (!poll || poll.ended) return;

                if (i.customId === 'poll_end') {
                    if (i.user.id !== poll.creatorId && !isAdmin(i.member)) {
                        return i.reply({ content: '❌ Only creator/admins can end.', ephemeral: true });
                    }
                    await endPoll(message, poll, numberEmojis);
                    collector.stop();
                    return i.reply({ content: '✅ Poll ended!', ephemeral: true });
                }

                if (i.customId.startsWith('poll_vote_')) {
                    const idx = parseInt(i.customId.replace('poll_vote_', ''));

                    if (poll.voters[idx].includes(i.user.id)) {
                        poll.votes[idx]--;
                        poll.voters[idx] = poll.voters[idx].filter(id => id !== i.user.id);
                        await updatePollMessage(message, poll, numberEmojis);
                        return i.reply({ content: `🗳️ Vote removed: **${options[idx]}**`, ephemeral: true });
                    }

                    if (!poll.multiple) {
                        Object.keys(poll.voters).forEach(k => {
                            const pos = poll.voters[k].indexOf(i.user.id);
                            if (pos !== -1) { poll.votes[k]--; poll.voters[k].splice(pos, 1); }
                        });
                    }

                    poll.votes[idx]++;
                    poll.voters[idx].push(i.user.id);
                    await updatePollMessage(message, poll, numberEmojis);
                    return i.reply({ content: `✅ Voted: **${options[idx]}**`, ephemeral: true });
                }
            });

            collector.on('end', async () => {
                const poll = activePolls.get(message.id);
                if (poll && !poll.ended) await endPoll(message, poll, numberEmojis);
            });

        } catch (error) {
            console.error('Poll error:', error);
            await interaction.editReply({ embeds: [errorEmbed('Error', 'Failed to create poll.')] });
        }
    }
};

function createPollEmbed(question, options, votes, total, endsAt, creator, anon, multi, emojis) {
    const desc = options.map((opt, i) => {
        const count = votes[i] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return `${emojis[i]} **${opt}**\n${'█'.repeat(Math.round(pct / 10))}${'░'.repeat(10 - Math.round(pct / 10))} \`${count}\` (${pct}%)`;
    }).join('\n\n');

    return new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle(`📊 ${question}`)
        .setDescription(desc)
        .addFields(
            { name: '👥 Votes', value: `\`${total}\``, inline: true },
            { name: '⏰ Ends', value: `<t:${Math.floor(endsAt.getTime() / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: `By ${creator.username}${anon ? ' • Anonymous' : ''}${multi ? ' • Multi-vote' : ''}` })
        .setTimestamp();
}

function createPollButtons(options, emojis, ended) {
    const rows = [];
    let row = new ActionRowBuilder();

    options.forEach((opt, i) => {
        if (row.components.length === 5) { rows.push(row); row = new ActionRowBuilder(); }
        row.addComponents(new ButtonBuilder()
            .setCustomId(`poll_vote_${i}`)
            .setLabel(opt.substring(0, 20))
            .setEmoji(emojis[i])
            .setStyle(ButtonStyle.Primary)
            .setDisabled(ended));
    });

    if (row.components.length > 0) rows.push(row);
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('poll_end').setLabel('End Poll').setEmoji('🛑').setStyle(ButtonStyle.Danger).setDisabled(ended)
    ));

    return rows;
}

async function updatePollMessage(message, poll, emojis) {
    const total = Object.values(poll.votes).reduce((a, b) => a + b, 0);
    const embed = createPollEmbed(poll.question, poll.options, poll.votes, total, poll.endsAt, { username: 'Creator' }, poll.anonymous, poll.multiple, emojis);
    await message.edit({ embeds: [embed], components: createPollButtons(poll.options, emojis, false) });
}

async function endPoll(message, poll, emojis) {
    poll.ended = true;
    const total = Object.values(poll.votes).reduce((a, b) => a + b, 0);
    const max = Math.max(...Object.values(poll.votes));
    const winners = poll.options.filter((_, i) => poll.votes[i] === max && max > 0);

    const desc = poll.options.map((opt, i) => {
        const count = poll.votes[i] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const win = poll.votes[i] === max && max > 0 ? ' 🏆' : '';
        return `${emojis[i]} **${opt}**${win}\n${'█'.repeat(Math.round(pct / 10))}${'░'.repeat(10 - Math.round(pct / 10))} \`${count}\` (${pct}%)`;
    }).join('\n\n');

    const embed = new EmbedBuilder()
        .setColor('#808080')
        .setTitle(`📊 Poll Ended`)
        .setDescription(`**${poll.question}**\n\n${desc}`)
        .addFields(
            { name: '👥 Total', value: `\`${total}\``, inline: true },
            { name: '🏆 Winner', value: winners.join(', ') || 'None', inline: true }
        )
        .setFooter({ text: 'Poll ended' })
        .setTimestamp();

    await message.edit({
        embeds: [embed], components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('poll_ended').setLabel('Ended').setStyle(ButtonStyle.Secondary).setDisabled(true)
        )]
    });
    activePolls.delete(message.id);
}
