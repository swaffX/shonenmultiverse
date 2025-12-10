require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, ActivityType, Events } = require('discord.js');
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
const { initStatsEmbed } = require('./systems/statsEmbedSystem');
const { initVoiceTracking } = require('./systems/levelSystem');
const { initCustomVoiceSystem } = require('./systems/customVoiceSystem');
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
client.once(Events.ClientReady, () => {
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

    // Initialize stats embed system
    initStatsEmbed(client);

    // Initialize voice tracking
    initVoiceTracking(client);

    // Initialize custom voice channel system
    initCustomVoiceSystem(client);

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

// Discord client error handling
client.on('error', (error) => {
    console.error('❌ Discord client error:', error);
});

client.on('disconnect', () => {
    console.log('⚠️ Bot disconnected from Discord');
});

client.on('reconnecting', () => {
    console.log('🔄 Bot reconnecting to Discord...');
});

// Global error handling with restart capability
process.on('unhandledRejection', async (error) => {
    console.error('❌ Unhandled promise rejection:', error);

    // Check if it's a connection timeout error
    if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.code === 'ECONNRESET') {
        console.log('🔄 Connection timeout detected, attempting to reconnect in 10 seconds...');

        // Wait and try to destroy/recreate connection
        setTimeout(async () => {
            try {
                if (client.isReady()) {
                    console.log('✅ Client is still ready, continuing...');
                } else {
                    console.log('🔄 Attempting to login again...');
                    await client.login(process.env.BOT_TOKEN);
                }
            } catch (retryError) {
                console.error('❌ Reconnection attempt failed:', retryError);
                console.log('⚠️ PM2 will restart the bot automatically.');
                process.exit(1);
            }
        }, 10000);
    }
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    // Let PM2 handle restart
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('👋 Bot shutting down gracefully...');
    client.destroy();
    mongoose.connection.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('👋 Bot shutting down gracefully...');
    client.destroy();
    mongoose.connection.close();
    process.exit(0);
});

// Express Server for potential OAuth/Web Dashboard
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => res.send('Shonen Multiverse Bot is running!'));

const axios = require('axios');
const User = require('./models/User');

// OAuth Callback
app.get('/auth/roblox/callback', async (req, res) => {
    const { code, state } = req.query;

    if (!code || !state) {
        return res.status(400).send('Missing code or state');
    }

    try {
        // Exchange code for token
        const tokenResponse = await axios.post('https://apis.roblox.com/oauth/v1/token',
            new URLSearchParams({
                client_id: config.roblox.clientId,
                client_secret: config.roblox.clientSecret,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: config.roblox.redirectUri
            }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
        );

        const { access_token } = tokenResponse.data;

        // Get User Info
        const userInfoResponse = await axios.get('https://apis.roblox.com/oauth/v1/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const robloxUser = userInfoResponse.data;
        // robloxUser = { sub: '12345', name: 'RobloxUser', nickname: 'RobloxUser', ... }

        const discordUserId = state; // We used state to pass Discord User ID
        const guildId = config.server.guildId;

        // Update DB
        let user = await User.findOne({ oderId: discordUserId, guildId: guildId });
        if (!user) {
            user = new User({ oderId: discordUserId, guildId: guildId });
        }

        user.robloxId = robloxUser.sub;
        user.robloxUsername = robloxUser.preferred_username || robloxUser.name;
        user.isVerified = true;
        await user.save();

        // Update Discord Member
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
            try {
                const member = await guild.members.fetch(discordUserId);
                if (member) {
                    // Update Nickname
                    await member.setNickname(robloxUser.preferred_username || robloxUser.name).catch(e => console.error('Failed to set nickname:', e));

                    // Add Verified Role
                    const verifiedRoleId = '1439009819519488112'; // Verified Role ID
                    const unverifiedRoleId = '1439010347716579519'; // Unverified Role ID

                    if (verifiedRoleId) {
                        await member.roles.add(verifiedRoleId).catch(e => console.error('Failed to add verified role:', e));
                    }

                    // Remove Unverified Role
                    if (unverifiedRoleId) {
                        await member.roles.remove(unverifiedRoleId).catch(e => console.error('Failed to remove unverified role:', e));
                    }
                }
            } catch (err) {
                console.error('Failed to update discord member:', err);
            }
        }

        res.send(`
            <html>
                <body style="background-color: #2b2d31; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
                    <div style="text-align: center;">
                        <h1>✅ Verification Successful!</h1>
                        <p>You have been verified as <strong>${robloxUser.preferred_username || robloxUser.name}</strong>.</p>
                        <p>You can close this window now.</p>
                    </div>
                </body>
            </html>
        `);

    } catch (error) {
        console.error('OAuth Callback Error:', error.response?.data || error.message);
        res.status(500).send('Verification failed. Please try again.');
    }
});

app.listen(port, '0.0.0.0', async () => {
    console.log(`🌍 Web server running on port ${port}`);

    // Start Cloudflare Tunnel for HTTPS (No Warning Page)
    try {
        const { startTunnel } = require('untun');
        const tunnel = await startTunnel({ port: port });
        const tunnelUrl = await tunnel.getURL();
        console.log(`🌍 Public HTTPS URL: ${tunnelUrl}`);

        // Update config redirect URI dynamically if not set
        if (!config.roblox.redirectUri || config.roblox.redirectUri.includes('localhost') || config.roblox.redirectUri.includes('194.105') || config.roblox.redirectUri.includes('loca.lt')) {
            console.log(`⚠️ Updating Redirect URI to Tunnel URL: ${tunnelUrl}/auth/roblox/callback`);
            config.roblox.redirectUri = `${tunnelUrl}/auth/roblox/callback`;
        }
    } catch (err) {
        console.error('❌ Failed to start Cloudflare Tunnel:', err);
    }
});

// Start the bot with error handling
init().catch(error => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
});
