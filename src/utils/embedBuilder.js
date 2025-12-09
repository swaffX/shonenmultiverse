const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

// Create a standard embed with bot branding
function createEmbed(options = {}) {
    const embed = new EmbedBuilder()
        .setColor(options.color || config.colors.primary)
        .setTimestamp();

    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);
    if (options.author) embed.setAuthor(options.author);
    if (options.fields) embed.addFields(options.fields);
    if (options.footer) {
        embed.setFooter({
            text: options.footer.text || 'Shonen Multiverse',
            iconURL: options.footer.iconURL
        });
    } else {
        embed.setFooter({ text: 'Shonen Multiverse • Anime RPG' });
    }

    return embed;
}

// Create success embed
function successEmbed(title, description) {
    return createEmbed({
        color: config.colors.success,
        title: `✅ ${title}`,
        description
    });
}

// Create error embed
function errorEmbed(title, description) {
    return createEmbed({
        color: config.colors.error,
        title: `❌ ${title}`,
        description
    });
}

// Create warning embed
function warningEmbed(title, description) {
    return createEmbed({
        color: config.colors.warning,
        title: `⚠️ ${title}`,
        description
    });
}

// Create info embed
function infoEmbed(title, description) {
    return createEmbed({
        color: config.colors.info,
        title: `ℹ️ ${title}`,
        description
    });
}

// Create rules embed (special formatting for rules)
function rulesEmbed(guildName, bannerUrl = null) {
    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`${guildName} - Server Rules`)
        .setFooter({ text: 'Shonen Multiverse • Anime RPG' })
        .setTimestamp();

    if (bannerUrl) {
        embed.setImage(bannerUrl);
    }

    return embed;
}

// Create welcome embed
function welcomeEmbed(member, message) {
    const formattedMessage = message
        .replace('{user}', member.toString())
        .replace('{username}', member.user.username)
        .replace('{server}', member.guild.name)
        .replace('{memberCount}', member.guild.memberCount.toString());

    return createEmbed({
        color: config.colors.primary,
        title: '🎉 Welcome!',
        description: formattedMessage,
        thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
        fields: [
            { name: '📊 Member Count', value: `${member.guild.memberCount}`, inline: true },
            { name: '🎮 Get Started', value: 'Check out the rules and info channels!', inline: true }
        ],
        footer: { text: `Welcome to ${member.guild.name}!` }
    });
}

// Create moderation embed
function moderationEmbed(action, moderator, target, reason, duration = null) {
    const fields = [
        { name: '👤 Target', value: `${target} (${target.id})`, inline: true },
        { name: '👮 Moderator', value: `${moderator}`, inline: true },
        { name: '📝 Reason', value: reason || 'No reason provided', inline: false }
    ];

    if (duration) {
        fields.push({ name: '⏰ Duration', value: duration, inline: true });
    }

    return createEmbed({
        color: config.colors.moderation,
        title: `🔨 ${action}`,
        fields
    });
}

// Create giveaway embed
function giveawayEmbed(prize, endsAt, winnersCount, participantCount = 0, hostId = null) {
    const fields = [
        { name: '🎁 Prize', value: prize, inline: false },
        { name: '🏆 Winners', value: `${winnersCount}`, inline: true },
        { name: '⏰ Ends', value: `<t:${Math.floor(endsAt.getTime() / 1000)}:R>`, inline: true },
        { name: '👥 Entries', value: `${participantCount}`, inline: true }
    ];

    if (hostId) {
        fields.push({ name: '🎤 Hosted by', value: `<@${hostId}>`, inline: true });
    }

    return createEmbed({
        color: config.colors.giveaway,
        title: '🎉 GIVEAWAY!',
        fields,
        footer: { text: 'Click the button below to enter!' }
    });
}

// Create poll embed
function pollEmbed(question, options, votes = null) {
    const description = options.map((opt, i) => {
        const emoji = getNumberEmoji(i + 1);
        const voteCount = votes ? votes[i] || 0 : 0;
        return `${emoji} ${opt}${votes ? ` - **${voteCount}** votes` : ''}`;
    }).join('\n');

    return createEmbed({
        color: config.colors.info,
        title: '📊 Poll',
        description: `**${question}**\n\n${description}`
    });
}

// Create level card embed
function levelEmbed(user, stats) {
    const progressBarLength = 20;
    const filledLength = Math.round((stats.progress / 100) * progressBarLength);
    const emptyLength = progressBarLength - filledLength;
    const progressBar = '▓'.repeat(filledLength) + '░'.repeat(emptyLength);

    return createEmbed({
        color: config.colors.level,
        title: `📊 ${user.username}'s Level Stats`,
        thumbnail: user.displayAvatarURL({ dynamic: true, size: 256 }),
        fields: [
            { name: '🏆 Level', value: `**${stats.level}**`, inline: true },
            { name: '✨ XP', value: `**${stats.xp.toLocaleString()}** / ${stats.nextLevelXP.toLocaleString()}`, inline: true },
            { name: '💬 Messages', value: `**${stats.totalMessages.toLocaleString()}**`, inline: true },
            { name: '📈 Progress', value: `\`${progressBar}\` ${Math.round(stats.progress)}%`, inline: false }
        ]
    });
}

// Get number emoji
function getNumberEmoji(num) {
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return emojis[num - 1] || '•';
}

// Create leaderboard embed
function leaderboardEmbed(title, entries, userRank = null) {
    const medals = ['🥇', '🥈', '🥉'];

    const description = entries.map((entry, index) => {
        const medal = medals[index] || `**${index + 1}.**`;
        return `${medal} ${entry.username}\n> Level **${entry.level}** • XP **${entry.xp.toLocaleString()}** • 💬 ${entry.messages.toLocaleString()}`;
    }).join('\n\n');

    const embed = createEmbed({
        color: config.colors.level,
        title: `🏆 ${title}`,
        description: description || 'No entries yet!'
    });

    if (userRank) {
        embed.addFields({
            name: '📍 Your Rank',
            value: `#${userRank.rank} • Level ${userRank.level}`,
            inline: true
        });
    }

    return embed;
}

module.exports = {
    createEmbed,
    successEmbed,
    errorEmbed,
    warningEmbed,
    infoEmbed,
    rulesEmbed,
    welcomeEmbed,
    moderationEmbed,
    giveawayEmbed,
    pollEmbed,
    levelEmbed,
    leaderboardEmbed,
    getNumberEmoji
};
