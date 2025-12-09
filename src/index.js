require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, ActivityType } = require('discord.js');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Import handlers
const loadCommands = require('./handlers/commandHandler');
const loadEvents = require('./handlers/eventHandler');
const { initAntiRaid } = require('./handlers/antiRaidHandler');
const { initGiveaways } = require('./systems/giveawaySystem');
const { initServerStats, loadStatsChannels } = require('./systems/serverStatsSystem');
const { initBoosterSystem } = require('./systems/boosterSystem');
const config = require('./config/config');
const Guild = require('./models/Guild');

// Create Discord client with all necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember
    ]
});

// Collections for commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();
client.giveaways = new Collection();

// Load configuration
client.config = config;

// Connect to MongoDB
async function connectDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connection successful!');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// Initialize the bot
async function init() {
    console.log('🚀 Starting Shonen Multiverse Bot...');

    // Connect to database
    await connectDatabase();

    // Load commands and events
    await loadCommands(client);
    await loadEvents(client);

    // Initialize anti-raid system
    initAntiRaid(client);

    // Login to Discord
    await client.login(process.env.BOT_TOKEN);
}

// Ready event
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
    console.log(`📊 Active in ${client.guilds.cache.size} server(s)`);

    // Set bot status
    client.user.setPresence({
        activities: [{
            name: 'Shonen Multiverse',
            type: ActivityType.Playing
        }],
        status: 'online'
    });

    // Initialize giveaway timers
    initGiveaways(client);

    // Initialize server stats system
    initServerStats(client, 60000); // 1 dakikada bir güncelle

    // Initialize booster system
    initBoosterSystem(client);

    // Load saved stats channels from database
    (async () => {
        try {
            const guilds = await Guild.find({ 'statsChannels.categoryId': { $ne: null } });
            for (const guildData of guilds) {
                if (guildData.statsChannels && guildData.statsChannels.categoryId) {
                    loadStatsChannels(guildData.guildId, guildData.statsChannels);
                    console.log(`📊 Stats channels loaded for guild: ${guildData.guildId}`);
                }
            }
        } catch (error) {
            console.error('Error loading stats channels:', error);
        }
    })();

    // Rotate status every 30 seconds
    let statusIndex = 0;
    setInterval(() => {
        const statuses = config.statusMessages;
        if (statuses && statuses.length > 0) {
            const status = statuses[statusIndex % statuses.length];
            client.user.setActivity(status.name, {
                type: ActivityType[status.type] || ActivityType.Playing
            });
            statusIndex++;
        }
    }, 30000);
});

// Error handling
client.on('error', console.error);
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Start the bot
init();
