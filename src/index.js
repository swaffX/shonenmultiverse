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
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #ff6b6b;
            --secondary: #5865F2;
            --accent: #7c3aed;
            --dark: #0f0f1a;
            --glass: rgba(255,255,255,0.05);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Poppins', sans-serif;
            background: var(--dark);
            min-height: 100vh;
            color: #fff;
            overflow-x: hidden;
            position: relative;
        }
        .bg-gradient {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: linear-gradient(45deg, #0f0f1a, #1a1a2e, #16213e, #0f3460);
            background-size: 400% 400%;
            animation: gradientShift 15s ease infinite;
            z-index: -3;
        }
        @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }
        .orb {
            position: fixed;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.4;
            z-index: -2;
            animation: float 20s infinite ease-in-out;
        }
        .orb-1 { width: 400px; height: 400px; background: var(--primary); top: -100px; left: -100px; }
        .orb-2 { width: 300px; height: 300px; background: var(--secondary); bottom: -50px; right: -50px; animation-delay: -5s; }
        .orb-3 { width: 200px; height: 200px; background: var(--accent); top: 50%; left: 50%; animation-delay: -10s; }
        @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(50px, -50px) scale(1.1); }
            50% { transform: translate(-30px, 30px) scale(0.9); }
            75% { transform: translate(30px, 50px) scale(1.05); }
        }
        .particles {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            z-index: -1;
            overflow: hidden;
        }
        .particle {
            position: absolute;
            width: 4px; height: 4px;
            background: rgba(255,255,255,0.3);
            border-radius: 50%;
            animation: rise 10s infinite;
        }
        @keyframes rise {
            0% { transform: translateY(100vh) scale(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) scale(1); opacity: 0; }
        }
        .wrapper {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
        }
        .container {
            max-width: 550px;
            width: 100%;
            background: var(--glass);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 24px;
            padding: 50px 40px;
            text-align: center;
            animation: slideUp 0.8s ease-out;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .logo {
            font-size: 64px;
            margin-bottom: 15px;
            animation: pulse 2s ease-in-out infinite;
            display: inline-block;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        h1 {
            font-size: 2.8rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--primary), #ffd93d, var(--primary));
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: shimmer 3s linear infinite;
            margin-bottom: 8px;
        }
        @keyframes shimmer {
            to { background-position: 200% center; }
        }
        .subtitle {
            color: #888;
            font-size: 1rem;
            font-weight: 300;
            margin-bottom: 35px;
            animation: fadeIn 1s ease-out 0.3s both;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .features {
            background: rgba(0,0,0,0.3);
            border-radius: 16px;
            padding: 25px;
            margin-bottom: 30px;
            animation: fadeIn 1s ease-out 0.5s both;
        }
        .feature {
            display: flex;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            transition: all 0.3s ease;
        }
        .feature:last-child { border-bottom: none; }
        .feature:hover { transform: translateX(10px); }
        .feature span {
            font-size: 20px;
            margin-right: 15px;
            width: 30px;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: linear-gradient(135deg, var(--secondary), var(--accent));
            color: #fff;
            padding: 18px 45px;
            border-radius: 50px;
            text-decoration: none;
            font-size: 1.1rem;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 10px 30px rgba(88, 101, 242, 0.3);
            animation: fadeIn 1s ease-out 0.7s both;
            position: relative;
            overflow: hidden;
        }
        .btn::before {
            content: '';
            position: absolute;
            top: 0; left: -100%;
            width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: 0.5s;
        }
        .btn:hover::before { left: 100%; }
        .btn:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 20px 40px rgba(88, 101, 242, 0.4);
        }
        .steps {
            background: linear-gradient(135deg, rgba(88, 101, 242, 0.1), rgba(124, 58, 237, 0.1));
            border-radius: 16px;
            padding: 25px;
            margin-top: 25px;
            text-align: left;
            animation: fadeIn 1s ease-out 0.9s both;
            border: 1px solid rgba(88, 101, 242, 0.2);
        }
        .steps h3 { margin-bottom: 20px; font-weight: 600; }
        .step {
            display: flex;
            align-items: center;
            padding: 10px 0;
            opacity: 0;
            animation: slideRight 0.5s ease-out forwards;
        }
        .step:nth-child(2) { animation-delay: 1.1s; }
        .step:nth-child(3) { animation-delay: 1.2s; }
        .step:nth-child(4) { animation-delay: 1.3s; }
        .step:nth-child(5) { animation-delay: 1.4s; }
        .step:nth-child(6) { animation-delay: 1.5s; }
        @keyframes slideRight {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .step-num {
            background: linear-gradient(135deg, var(--secondary), var(--accent));
            width: 28px; height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            font-size: 13px;
            font-weight: 600;
            flex-shrink: 0;
        }
        .footer {
            margin-top: 35px;
            color: #555;
            font-size: 0.85rem;
            animation: fadeIn 1s ease-out 1.1s both;
        }
        .footer a {
            color: var(--secondary);
            text-decoration: none;
            transition: color 0.3s;
        }
        .footer a:hover { color: var(--primary); }
        @media (max-width: 600px) {
            .container { padding: 35px 25px; }
            h1 { font-size: 2rem; }
            .logo { font-size: 48px; }
        }
    </style>
</head>
<body>
    <div class="bg-gradient"></div>
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
    <div class="particles" id="particles"></div>
    <div class="wrapper">
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
            <a href="https://discord.gg/2xvmzeDy3Y" class="btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                Join Discord Server
            </a>
            <div class="steps">
                <h3>📋 How to Verify:</h3>
                <div class="step"><span class="step-num">1</span> Join our Discord server</div>
                <div class="step"><span class="step-num">2</span> Use the /verify command</div>
                <div class="step"><span class="step-num">3</span> Click the verification link</div>
                <div class="step"><span class="step-num">4</span> Authorize with Roblox</div>
                <div class="step"><span class="step-num">5</span> Get your verified role!</div>
            </div>
            <div class="footer">
                <p>© 2025 Shonen Multiverse | <a href="/privacy">Privacy Policy</a> | <a href="/tos">Terms of Service</a></p>
            </div>
        </div>
    </div>
    <script>
        const particlesContainer = document.getElementById('particles');
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 10 + 's';
            particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
            particlesContainer.appendChild(particle);
        }
    </script>
</body>
</html>
`));

// Privacy Policy Endpoint
app.get('/privacy', (req, res) => {
    res.send(`
    < h1 > Privacy Policy</h1 >
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
    < h1 > Terms of Service</h1 >
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
            headers: { Authorization: `Bearer ${access_token} ` }
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
    < !DOCTYPE html >
        <html>
            <head>
                <title>Verification Successful</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body {
                            background - color: #1a1b1e;
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
                            text - align: center;
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
                            background - color: #4752c4;
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
                            to {opacity: 1; transform: translateY(0); }
                    }
                        @keyframes popIn {
                            to {transform: scale(1); }
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
    console.log(`🌍 Web server running on port ${port} `);

    // Start Ngrok for HTTPS
    try {
        const ngrok = require('ngrok');

        // Force kill any existing sessions to prevent "tunnel already exists" error
        await ngrok.kill().catch(() => { });

        const url = await ngrok.connect({
            addr: port,
            authtoken: process.env.NGROK_AUTH_TOKEN || '36dTZ3Gli9MDd1f2snEgYR02aXf_2pwLXSPkFxw5h8CZr7rfe' // User provided token
        });
        console.log(`🌍 Public HTTPS URL: ${url} `);

        // Update config redirect URI dynamically
        console.log(`⚠️ Updating Redirect URI to Ngrok URL: ${url} /auth/roblox / callback`);
        config.roblox.redirectUri = `${url} /auth/roblox / callback`;

        // Log for user visibility in console
        console.log('\n!!! IMPORTANT !!!');
        console.log(`Please copy this URL and paste it into Roblox Dashboard > OAuth 2.0 > Redirect URIs: `);
        console.log(`${url} /auth/roblox / callback`);
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
