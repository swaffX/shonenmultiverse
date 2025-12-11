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
const { initInviteSystem } = require('./systems/inviteSystem');
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

    // Initialize invite tracking system
    initInviteSystem(client);

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

app.get('/', (req, res) => res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shonen Multiverse - Roblox Verification</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1c2c 0%, #2d1b4e 50%, #1a1c2c 100%);
            min-height: 100vh;
            color: #fff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            text-align: center;
            background: rgba(255,255,255,0.05);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .logo { font-size: 48px; margin-bottom: 10px; }
        h1 { font-size: 2.5rem; margin-bottom: 10px; color: #ff6b6b; }
        .subtitle { color: #aaa; font-size: 1.1rem; margin-bottom: 30px; }
        .features {
            text-align: left;
            background: rgba(0,0,0,0.3);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .feature { padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .feature:last-child { border-bottom: none; }
        .feature span { margin-right: 10px; }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #5865F2, #7289DA);
            color: #fff;
            padding: 15px 40px;
            border-radius: 10px;
            text-decoration: none;
            font-size: 1.2rem;
            font-weight: bold;
            transition: transform 0.2s, box-shadow 0.2s;
            margin-bottom: 20px;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(88, 101, 242, 0.3);
        }
        .steps {
            text-align: left;
            background: rgba(88, 101, 242, 0.1);
            padding: 20px;
            border-radius: 10px;
            margin-top: 20px;
        }
        .step { padding: 8px 0; display: flex; align-items: center; }
        .step-num {
            background: #5865F2;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-right: 10px;
            font-size: 12px;
        }
        .footer { margin-top: 30px; color: #666; font-size: 0.9rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🎮</div>
        <h1>Shonen Multiverse</h1>
        <p class="subtitle">Connect your Roblox account with Discord</p>
        
        <div class="features">
            <div class="feature"><span>✅</span> Verify your Roblox account ownership</div>
            <div class="feature"><span>🎭</span> Sync your Discord roles with Roblox rank</div>
            <div class="feature"><span>📊</span> Track your activity and earn rewards</div>
            <div class="feature"><span>🎮</span> Access exclusive in-game features</div>
        </div>
        
        <a href="https://discord.gg/YourInviteCode" class="btn">Join Discord Server</a>
        
        <div class="steps">
            <h3 style="margin-bottom: 15px;">📋 How to Verify:</h3>
            <div class="step"><span class="step-num">1</span> Join our Discord server</div>
            <div class="step"><span class="step-num">2</span> Use the /verify command</div>
            <div class="step"><span class="step-num">3</span> Click the verification link</div>
            <div class="step"><span class="step-num">4</span> Authorize with Roblox</div>
            <div class="step"><span class="step-num">5</span> Get your verified role!</div>
        </div>
        
        <div class="footer">
            <p>© 2025 Shonen Multiverse | <a href="/privacy" style="color:#5865F2">Privacy Policy</a> | <a href="/tos" style="color:#5865F2">Terms of Service</a></p>
        </div>
    </div>
</body>
</html>
`));

// Privacy Policy Endpoint
app.get('/privacy', (req, res) => {
    res.send(`
        <h1>Privacy Policy</h1>
        <p><strong>Effective Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p>Shonen Multiverse ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our services.</p>
        <h2>1. Information We Collect</h2>
        <p>We may collect the following information:</p>
        <ul>
            <li>Discord User ID and Username</li>
            <li>Roblox User ID and Username (via OAuth2)</li>
            <li>Server interaction data (commands usage, leveling data)</li>
        </ul>
        <h2>2. How We Use Your Information</h2>
        <p>We use the collected information to:</p>
        <ul>
            <li>Verify your Roblox account ownership.</li>
            <li>Sync your Discord roles with your Roblox rank.</li>
            <li>Track your activity statistics within the Discord server.</li>
        </ul>
        <h2>3. Data Storage</h2>
        <p>Your data is stored securely in our database. We do not sell or share your personal data with third parties.</p>
        <h2>4. Contact Us</h2>
        <p>If you have any questions, please contact the server administration via Discord.</p>
    `);
});

// Terms of Service Endpoint
app.get('/tos', (req, res) => {
    res.send(`
        <h1>Terms of Service</h1>
        <p><strong>Effective Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p>By using the Shonen Multiverse Bot, you agree to constitute a binding agreement between you and us.</p>
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using our bot, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not use the service.</p>
        <h2>2. Usage Rules</h2>
        <ul>
            <li>You must not use the bot for any illegal purposes.</li>
            <li>You must not attempt to exploit, hack, or disrupt the bot's services.</li>
            <li>We reserve the right to ban any user from using the bot at our discretion.</li>
        </ul>
        <h2>3. Disclaimer</h2>
        <p>The service is provided "AS IS" and "AS AVAILABLE" basis. We make no warranties regarding the uptime or availability of the bot.</p>
    `);
});

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
            <!DOCTYPE html>
            <html>
            <head>
                <title>Verification Successful</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body {
                        background-color: #1a1b1e;
                        color: #ffffff;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        overflow: hidden;
                    }
                    .container {
                        text-align: center;
                        background: #2b2d31;
                        padding: 40px;
                        border-radius: 20px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                        width: 90%;
                        max-width: 400px;
                        opacity: 0;
                        transform: translateY(20px);
                        animation: fadeInUp 0.8s ease forwards;
                    }
                    h1 {
                        color: #5865F2;
                        margin-bottom: 10px;
                        font-size: 24px;
                    }
                    p {
                        color: #b5bac1;
                        font-size: 16px;
                        margin-bottom: 30px;
                    }
                    strong {
                        color: #ffffff;
                    }
                    .btn {
                        display: inline-block;
                        background-color: #5865F2;
                        color: white;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: bold;
                        transition: all 0.2s ease;
                        font-size: 16px;
                    }
                    .btn:hover {
                        background-color: #4752c4;
                        transform: scale(1.05);
                    }
                    .success-icon {
                        width: 80px;
                        height: 80px;
                        background: #23a559;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 20px auto;
                        box-shadow: 0 0 20px rgba(35, 165, 89, 0.4);
                        animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s forwards;
                        transform: scale(0);
                    }
                    .checkmark {
                        width: 40px;
                        height: 20px;
                        border-bottom: 5px solid white;
                        border-right: 5px solid white;
                        transform: rotate(-45deg) translate(2px, -2px);
                        display: block;
                    }
                    .avatar {
                        width: 80px;
                        height: 80px;
                        border-radius: 50%;
                        margin-bottom: 20px;
                        border: 3px solid #5865F2;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                    }
                    @keyframes fadeInUp {
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes popIn {
                        to { transform: scale(1); }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success-icon">
                        <div class="checkmark"></div>
                    </div>
                    <h1>Verification Successful!</h1>
                    <p>You have been verified as<br><strong>${robloxUser.preferred_username || robloxUser.name}</strong></p>
                    
                    <a href="discord://" class="btn">Return to Discord</a>
                    
                    <script>
                        setTimeout(function() {
                            window.location.href = "discord://";
                        }, 2000); // 2 saniye bekleyip yönlendir
                    </script>
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

    // Start Ngrok for HTTPS
    try {
        const ngrok = require('ngrok');

        // Force kill any existing sessions to prevent "tunnel already exists" error
        await ngrok.kill().catch(() => { });

        const url = await ngrok.connect({
            addr: port,
            authtoken: process.env.NGROK_AUTH_TOKEN || '36dTZ3Gli9MDd1f2snEgYR02aXf_2pwLXSPkFxw5h8CZr7rfe' // User provided token
        });
        console.log(`🌍 Public HTTPS URL: ${url}`);

        // Update config redirect URI dynamically
        console.log(`⚠️ Updating Redirect URI to Ngrok URL: ${url}/auth/roblox/callback`);
        config.roblox.redirectUri = `${url}/auth/roblox/callback`;

        // Log for user visibility in console
        console.log('\n!!! IMPORTANT !!!');
        console.log(`Please copy this URL and paste it into Roblox Dashboard > OAuth 2.0 > Redirect URIs:`);
        console.log(`${url}/auth/roblox/callback`);
        console.log('!!! IMPORTANT !!!\n');

    } catch (err) {
        console.error('❌ Failed to start Ngrok:', err);
    }
});

// Start the bot with error handling
init().catch(error => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
});
