const { Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Giveaway = require('../models/Giveaway');
const config = require('../config/config');

const giveawayTimers = new Collection();

// Initialize giveaways
async function initGiveaways(client) {
    try {
        const active = await Giveaway.getActive();
        console.log(`📦 ${active.length} active giveaway(s) loaded.`);
        for (const g of active) scheduleGiveawayEnd(g, client);
    } catch (error) {
        console.error('Giveaway init error:', error);
    }
}

function scheduleGiveawayEnd(giveaway, client) {
    const timeLeft = giveaway.endsAt - Date.now();
    if (timeLeft <= 0) {
        endGiveaway(giveaway._id, client);
    } else {
        const timer = setTimeout(() => endGiveaway(giveaway._id, client), timeLeft);
        giveawayTimers.set(giveaway.messageId, timer);
    }
}

// Clean, compact giveaway embed
function createGiveawayEmbed(prize, endsAt, winnersCount, participantCount, hostId) {
    const endTimestamp = Math.floor(endsAt.getTime() / 1000);

    return new EmbedBuilder()
        .setColor('#FF1493')
        .setTitle(`🎁 ${prize}`)
        .setDescription(`Click **Enter** to participate!\n\nEnds: <t:${endTimestamp}:R>`)
        .addFields(
            { name: '🏆 Winners', value: `${winnersCount}`, inline: true },
            { name: '👥 Entries', value: `${participantCount}`, inline: true },
            { name: '🎤 Host', value: `<@${hostId}>`, inline: true }
        )
        .setFooter({ text: '🍀 Good luck!' })
        .setTimestamp(endsAt);
}

// Create giveaway
async function createGiveaway(channel, hostId, prize, duration, winnersCount = 1, requiredRoleId = null) {
    try {
        const endsAt = new Date(Date.now() + duration);
        const embed = createGiveawayEmbed(prize, endsAt, winnersCount, 0, hostId);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('giveaway_join')
                .setLabel('Enter')
                .setEmoji('🎉')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('giveaway_leave')
                .setLabel('Leave')
                .setStyle(ButtonStyle.Secondary)
        );

        const message = await channel.send({ embeds: [embed], components: [row] });

        const giveaway = await Giveaway.create({
            guildId: channel.guild.id,
            channelId: channel.id,
            messageId: message.id,
            hostId,
            prize,
            winnersCount,
            endsAt,
            participants: [],
            requiredRoleId
        });

        scheduleGiveawayEnd(giveaway, channel.client);
        return giveaway;
    } catch (error) {
        console.error('Giveaway creation error:', error);
        throw error;
    }
}

// Join giveaway
async function joinGiveaway(messageId, userId) {
    try {
        const giveaway = await Giveaway.findOne({ messageId });
        if (!giveaway || giveaway.ended) return { success: false, message: 'Giveaway ended.' };
        if (giveaway.participants.includes(userId)) return { success: false, message: 'Already entered!' };

        giveaway.participants.push(userId);
        await giveaway.save();
        return { success: true, count: giveaway.participants.length };
    } catch (error) {
        return { success: false, message: 'Error occurred.' };
    }
}

// Leave giveaway
async function leaveGiveaway(messageId, userId) {
    try {
        const giveaway = await Giveaway.findOne({ messageId });
        if (!giveaway || giveaway.ended) return { success: false, message: 'Giveaway ended.' };

        const idx = giveaway.participants.indexOf(userId);
        if (idx === -1) return { success: false, message: 'Not entered!' };

        giveaway.participants.splice(idx, 1);
        await giveaway.save();
        return { success: true, count: giveaway.participants.length };
    } catch (error) {
        return { success: false, message: 'Error occurred.' };
    }
}

// End giveaway
async function endGiveaway(giveawayId, client) {
    try {
        const giveaway = await Giveaway.findById(giveawayId);
        if (!giveaway || giveaway.ended) return;

        giveaway.ended = true;

        // Select winners
        const winners = [];
        const participants = [...giveaway.participants];
        for (let i = 0; i < giveaway.winnersCount && participants.length > 0; i++) {
            const idx = Math.floor(Math.random() * participants.length);
            winners.push(participants.splice(idx, 1)[0]);
        }
        giveaway.winners = winners;
        await giveaway.save();

        try {
            const channel = await client.channels.fetch(giveaway.channelId);
            const message = await channel.messages.fetch(giveaway.messageId);

            // Ended embed
            const endedEmbed = new EmbedBuilder()
                .setColor('#2F3136')
                .setTitle(`🎁 ${giveaway.prize}`)
                .setDescription(winners.length > 0
                    ? `**Winner${winners.length > 1 ? 's' : ''}:** ${winners.map(id => `<@${id}>`).join(', ')}`
                    : '**No valid entries**')
                .addFields(
                    { name: '👥 Entries', value: `${giveaway.participants.length}`, inline: true },
                    { name: '🎤 Host', value: `<@${giveaway.hostId}>`, inline: true }
                )
                .setFooter({ text: 'Giveaway ended' })
                .setTimestamp();

            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('giveaway_ended')
                    .setLabel('Ended')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('giveaway_reroll_btn')
                    .setLabel('Reroll')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Primary)
            );

            await message.edit({ embeds: [endedEmbed], components: [disabledRow] });

            // Winner announcement
            if (winners.length > 0) {
                const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

                const winEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🎊 Congratulations!')
                    .setDescription([
                        `${winnerMentions}`,
                        '',
                        `You won **${giveaway.prize}**!`,
                        '',
                        `*Contact <@${giveaway.hostId}> to claim your prize.*`
                    ].join('\n'))
                    .setFooter({ text: 'Shonen Multiverse' })
                    .setTimestamp();

                await channel.send({ content: `🎉 ${winnerMentions}`, embeds: [winEmbed] });
            }
        } catch (err) {
            console.error('Giveaway update error:', err);
        }

        giveawayTimers.delete(giveaway.messageId);
    } catch (error) {
        console.error('Giveaway end error:', error);
    }
}

// Reroll
async function rerollGiveaway(messageId, client) {
    try {
        const giveaway = await Giveaway.findOne({ messageId });
        if (!giveaway) return { success: false, message: 'Not found.' };
        if (!giveaway.ended) return { success: false, message: 'Not ended.' };

        const eligible = giveaway.participants.filter(p => !giveaway.winners.includes(p));
        if (eligible.length === 0) return { success: false, message: 'No eligible participants.' };

        const newWinner = eligible[Math.floor(Math.random() * eligible.length)];
        giveaway.winners.push(newWinner);
        await giveaway.save();

        const channel = await client.channels.fetch(giveaway.channelId);

        const rerollEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🔄 Reroll')
            .setDescription(`New winner: <@${newWinner}>\n\n**Prize:** ${giveaway.prize}`)
            .setFooter({ text: 'Shonen Multiverse' })
            .setTimestamp();

        await channel.send({ content: `🎉 <@${newWinner}>`, embeds: [rerollEmbed] });
        return { success: true, winnerId: newWinner };
    } catch (error) {
        return { success: false, message: 'Error.' };
    }
}

// Update embed
async function updateGiveawayEmbed(messageId, client) {
    try {
        const giveaway = await Giveaway.findOne({ messageId });
        if (!giveaway || giveaway.ended) return;

        const channel = await client.channels.fetch(giveaway.channelId);
        const message = await channel.messages.fetch(giveaway.messageId);

        const embed = createGiveawayEmbed(
            giveaway.prize, giveaway.endsAt, giveaway.winnersCount,
            giveaway.participants.length, giveaway.hostId
        );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('giveaway_join')
                .setLabel('Enter')
                .setEmoji('🎉')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('giveaway_leave')
                .setLabel('Leave')
                .setStyle(ButtonStyle.Secondary)
        );

        await message.edit({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error('Giveaway embed update error:', error);
    }
}

module.exports = { initGiveaways, createGiveaway, joinGiveaway, leaveGiveaway, endGiveaway, rerollGiveaway, updateGiveawayEmbed };
