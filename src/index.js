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
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0" rel="stylesheet">
    <style>
        :root {
            --primary: #ff6b6b;
            --primary-glow: rgba(255, 107, 107, 0.3);
            --secondary: #5865F2;
            --secondary-glow: rgba(88, 101, 242, 0.3);
            --accent: #7c3aed;
            --accent-glow: rgba(124, 58, 237, 0.3);
            --gold: #ffd93d;
            --dark: #0a0a0f;
            --dark-lighter: #12121a;
            --glass: rgba(255,255,255,0.03);
            --glass-border: rgba(255,255,255,0.08);
            --text-primary: #ffffff;
            --text-secondary: rgba(255,255,255,0.6);
            --text-muted: rgba(255,255,255,0.4);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--dark);
            min-height: 100vh;
            color: var(--text-primary);
            overflow-x: hidden;
            position: relative;
        }
        
        /* Background Effects */
        .bg-gradient {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: 
                radial-gradient(ellipse 80% 50% at 50% -20%, rgba(88, 101, 242, 0.15), transparent),
                radial-gradient(ellipse 60% 40% at 100% 100%, rgba(124, 58, 237, 0.1), transparent),
                radial-gradient(ellipse 50% 30% at 0% 100%, rgba(255, 107, 107, 0.08), transparent),
                var(--dark);
            z-index: -3;
        }
        
        .grid-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background-image: 
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
            background-size: 60px 60px;
            z-index: -2;
            opacity: 0.5;
        }
        
        .orb {
            position: fixed;
            border-radius: 50%;
            filter: blur(100px);
            opacity: 0.4;
            z-index: -2;
            animation: orbFloat 25s infinite ease-in-out;
        }
        .orb-1 { 
            width: 500px; height: 500px; 
            background: linear-gradient(135deg, var(--primary), var(--accent)); 
            top: -200px; left: -150px; 
        }
        .orb-2 { 
            width: 400px; height: 400px; 
            background: linear-gradient(135deg, var(--secondary), var(--accent)); 
            bottom: -100px; right: -100px; 
            animation-delay: -8s; 
        }
        .orb-3 { 
            width: 300px; height: 300px; 
            background: linear-gradient(135deg, var(--accent), var(--primary)); 
            top: 50%; right: 20%; 
            animation-delay: -15s; 
        }
        
        @keyframes orbFloat {
            0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
            25% { transform: translate(30px, -40px) rotate(90deg) scale(1.1); }
            50% { transform: translate(-20px, 20px) rotate(180deg) scale(0.95); }
            75% { transform: translate(40px, 30px) rotate(270deg) scale(1.05); }
        }
        
        .particles {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            z-index: -1;
            overflow: hidden;
            pointer-events: none;
        }
        .particle {
            position: absolute;
            width: 3px; height: 3px;
            background: rgba(255,255,255,0.4);
            border-radius: 50%;
            animation: particleRise 15s infinite linear;
            box-shadow: 0 0 6px rgba(255,255,255,0.3);
        }
        @keyframes particleRise {
            0% { transform: translateY(100vh) translateX(0) scale(0); opacity: 0; }
            5% { opacity: 1; }
            50% { transform: translateY(50vh) translateX(20px) scale(1); }
            95% { opacity: 1; }
            100% { transform: translateY(-10vh) translateX(-10px) scale(0.5); opacity: 0; }
        }
        
        /* Main Layout */
        .page-wrapper {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            position: relative;
        }
        
        .layout-container {
            display: flex;
            align-items: stretch;
            gap: 0;
            max-width: 1100px;
            width: 100%;
            position: relative;
        }
        
        /* Left Floating Panel - Steps */
        .steps-panel {
            width: 280px;
            flex-shrink: 0;
            background: var(--glass);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 30px 25px;
            position: relative;
            z-index: 2;
            opacity: 0;
            animation: panelReveal 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
            box-shadow: 
                0 20px 40px rgba(0,0,0,0.3),
                0 0 60px rgba(88, 101, 242, 0.05),
                inset 0 1px 0 rgba(255,255,255,0.05);
            align-self: center;
            margin-right: -20px;
        }
        
        @keyframes panelReveal {
            0% { 
                opacity: 0; 
                transform: translateX(-60px) scale(0.9);
            }
            100% { 
                opacity: 1; 
                transform: translateX(0) scale(1);
            }
        }
        
        .steps-panel::before {
            content: '';
            position: absolute;
            top: -1px; left: 20px; right: 20px;
            height: 4px;
            background: linear-gradient(90deg, var(--secondary), var(--accent));
            border-radius: 4px;
        }
        
        .steps-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--glass-border);
        }
        
        .steps-header-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, var(--secondary), var(--accent));
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }
        
        .steps-header h3 {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .steps-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .step-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            background: rgba(255,255,255,0.02);
            border-radius: 12px;
            border: 1px solid transparent;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            opacity: 0;
            animation: stepFadeIn 0.5s ease-out forwards;
            cursor: default;
        }
        
        .step-item:nth-child(1) { animation-delay: 0.6s; }
        .step-item:nth-child(2) { animation-delay: 0.7s; }
        .step-item:nth-child(3) { animation-delay: 0.8s; }
        .step-item:nth-child(4) { animation-delay: 0.9s; }
        .step-item:nth-child(5) { animation-delay: 1.0s; }
        
        @keyframes stepFadeIn {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        .step-item:hover {
            background: rgba(88, 101, 242, 0.1);
            border-color: rgba(88, 101, 242, 0.2);
            transform: translateX(5px);
        }
        
        .step-number {
            width: 26px;
            height: 26px;
            background: linear-gradient(135deg, var(--secondary), var(--accent));
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
            flex-shrink: 0;
            box-shadow: 0 4px 12px var(--secondary-glow);
        }
        
        .step-text {
            font-size: 0.85rem;
            color: var(--text-secondary);
            font-weight: 400;
            line-height: 1.3;
        }
        
        /* Connection Line */
        .connection-line {
            width: 40px;
            height: 2px;
            background: linear-gradient(90deg, var(--secondary), transparent);
            align-self: center;
            position: relative;
            z-index: 1;
            opacity: 0;
            animation: lineFadeIn 0.6s ease-out 0.7s forwards;
        }
        
        .connection-line::before {
            content: '';
            position: absolute;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 8px;
            height: 8px;
            background: var(--secondary);
            border-radius: 50%;
            box-shadow: 0 0 15px var(--secondary-glow);
        }
        
        @keyframes lineFadeIn {
            from { opacity: 0; width: 0; }
            to { opacity: 1; width: 40px; }
        }
        
        /* Main Center Panel */
        .main-panel {
            flex: 1;
            max-width: 520px;
            background: var(--glass);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid var(--glass-border);
            border-radius: 28px;
            padding: 50px 45px;
            text-align: center;
            position: relative;
            z-index: 3;
            opacity: 0;
            animation: mainPanelReveal 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
            box-shadow: 
                0 30px 60px rgba(0,0,0,0.4),
                0 0 80px rgba(88, 101, 242, 0.08),
                inset 0 1px 0 rgba(255,255,255,0.08);
        }
        
        @keyframes mainPanelReveal {
            0% { 
                opacity: 0; 
                transform: translateY(50px) scale(0.92);
            }
            60% {
                opacity: 1;
            }
            100% { 
                opacity: 1; 
                transform: translateY(0) scale(1);
            }
        }
        
        .main-panel::before {
            content: '';
            position: absolute;
            top: -1px; left: 50%;
            transform: translateX(-50%);
            width: 60%;
            height: 3px;
            background: linear-gradient(90deg, transparent, var(--primary), var(--gold), var(--primary), transparent);
            border-radius: 0 0 10px 10px;
        }
        
        .logo-container {
            margin-bottom: 20px;
        }
        
        .logo {
            font-size: 72px;
            display: inline-block;
            animation: logoPulse 3s ease-in-out infinite;
            filter: drop-shadow(0 10px 30px rgba(255, 107, 107, 0.3));
        }
        
        @keyframes logoPulse {
            0%, 100% { transform: scale(1) rotate(0deg); }
            25% { transform: scale(1.05) rotate(-2deg); }
            75% { transform: scale(1.05) rotate(2deg); }
        }
        
        .title {
            font-size: 2.5rem;
            font-weight: 800;
            background: linear-gradient(135deg, var(--primary) 0%, var(--gold) 50%, var(--primary) 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: titleShimmer 4s linear infinite;
            margin-bottom: 10px;
            letter-spacing: -0.02em;
        }
        
        @keyframes titleShimmer {
            to { background-position: 200% center; }
        }
        
        .subtitle {
            color: var(--text-secondary);
            font-size: 1rem;
            font-weight: 400;
            margin-bottom: 35px;
            opacity: 0;
            animation: fadeIn 0.8s ease-out 0.3s forwards;
        }
        
        @keyframes fadeIn {
            to { opacity: 1; }
        }
        
        /* Features Section */
        .features {
            background: rgba(0,0,0,0.2);
            border: 1px solid var(--glass-border);
            border-radius: 18px;
            padding: 24px;
            margin-bottom: 30px;
            opacity: 0;
            animation: fadeIn 0.8s ease-out 0.5s forwards;
        }
        
        .feature {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 14px 0;
            border-bottom: 1px solid rgba(255,255,255,0.04);
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .feature:last-child { border-bottom: none; }
        
        .feature:hover {
            transform: translateX(8px);
        }
        
        .feature:hover .feature-icon {
            transform: scale(1.15);
            box-shadow: 0 6px 20px var(--secondary-glow);
        }
        
        .feature-icon {
            width: 42px;
            height: 42px;
            background: linear-gradient(135deg, rgba(88, 101, 242, 0.15), rgba(124, 58, 237, 0.15));
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: all 0.3s ease;
            border: 1px solid rgba(88, 101, 242, 0.15);
        }
        
        .feature-icon svg {
            width: 22px;
            height: 22px;
            fill: none;
            stroke: rgba(255, 255, 255, 0.85);
            stroke-width: 1.8;
            stroke-linecap: round;
            stroke-linejoin: round;
        }
        
        .feature-icon.verified svg {
            stroke: #22c55e;
        }
        
        .feature-icon.sync svg {
            stroke: #a78bfa;
        }
        
        .feature-icon.analytics svg {
            stroke: #60a5fa;
        }
        
        .feature-icon.gaming svg {
            stroke: #f472b6;
        }
        
        .feature-text {
            font-size: 0.95rem;
            color: var(--text-secondary);
            text-align: left;
        }
        
        /* Discord Button */
        .discord-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            background: linear-gradient(135deg, var(--secondary), var(--accent));
            color: #fff;
            padding: 18px 50px;
            border-radius: 16px;
            text-decoration: none;
            font-size: 1.05rem;
            font-weight: 600;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 
                0 10px 30px var(--secondary-glow),
                0 0 0 0 var(--secondary);
            position: relative;
            overflow: hidden;
            opacity: 0;
            animation: fadeIn 0.8s ease-out 0.7s forwards;
        }
        
        .discord-btn::before {
            content: '';
            position: absolute;
            top: 0; left: -100%;
            width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
            transition: 0.6s;
        }
        
        .discord-btn:hover {
            transform: translateY(-4px) scale(1.02);
            box-shadow: 
                0 20px 50px var(--secondary-glow),
                0 0 0 4px rgba(88, 101, 242, 0.2);
        }
        
        .discord-btn:hover::before { left: 100%; }
        
        .discord-btn:active {
            transform: translateY(-2px) scale(1);
        }
        
        .discord-btn svg {
            width: 22px;
            height: 22px;
        }
        
        /* Footer */
        .footer {
            margin-top: 35px;
            padding-top: 20px;
            border-top: 1px solid var(--glass-border);
            opacity: 0;
            animation: fadeIn 0.8s ease-out 0.9s forwards;
        }
        
        .footer p {
            color: var(--text-muted);
            font-size: 0.8rem;
        }
        
        .footer a {
            color: var(--secondary);
            text-decoration: none;
            transition: all 0.3s ease;
            position: relative;
        }
        
        .footer a::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            width: 0;
            height: 1px;
            background: var(--secondary);
            transition: width 0.3s ease;
        }
        
        .footer a:hover::after { width: 100%; }
        .footer a:hover { color: var(--primary); }
        
        /* Responsive Design */
        @media (max-width: 900px) {
            .layout-container {
                flex-direction: column;
                align-items: center;
                gap: 20px;
            }
            
            .steps-panel {
                width: 100%;
                max-width: 400px;
                margin-right: 0;
                order: 2;
            }
            
            .connection-line {
                display: none;
            }
            
            .main-panel {
                order: 1;
                max-width: 100%;
            }
        }
        
        @media (max-width: 500px) {
            .page-wrapper {
                padding: 20px 15px;
            }
            
            .main-panel {
                padding: 35px 25px;
                border-radius: 22px;
            }
            
            .title { font-size: 1.8rem; }
            .logo { font-size: 56px; }
            
            .steps-panel {
                padding: 25px 20px;
            }
            
            .discord-btn {
                width: 100%;
                padding: 16px 30px;
            }
        }
    </style>
</head>
<body>
    <div class="bg-gradient"></div>
    <div class="grid-overlay"></div>
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
    <div class="particles" id="particles"></div>
    
    <div class="page-wrapper">
        <div class="layout-container">
            <!-- Left Floating Panel - Steps -->
            <div class="steps-panel">
                <div class="steps-header">
                    <div class="steps-header-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 11l3 3L22 4"/>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                    </div>
                    <h3>How to Verify</h3>
                </div>
                <div class="steps-list">
                    <div class="step-item">
                        <span class="step-number">1</span>
                        <span class="step-text">Join our Discord server</span>
                    </div>
                    <div class="step-item">
                        <span class="step-number">2</span>
                        <span class="step-text">Use the /verify command</span>
                    </div>
                    <div class="step-item">
                        <span class="step-number">3</span>
                        <span class="step-text">Click the verification link</span>
                    </div>
                    <div class="step-item">
                        <span class="step-number">4</span>
                        <span class="step-text">Authorize with Roblox</span>
                    </div>
                    <div class="step-item">
                        <span class="step-number">5</span>
                        <span class="step-text">Get your verified role!</span>
                    </div>
                </div>
            </div>
            
            <!-- Connection Line -->
            <div class="connection-line"></div>
            
            <!-- Main Center Panel -->
            <div class="main-panel">
                <div class="logo-container">
                    <div class="logo">
                        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="6" width="20" height="12" rx="3" stroke="url(#logoGrad)" stroke-width="1.5"/>
                            <circle cx="7" cy="12" r="1.5" fill="#a78bfa"/>
                            <circle cx="17" cy="10" r="1" fill="#60a5fa"/>
                            <circle cx="17" cy="14" r="1" fill="#f472b6"/>
                            <circle cx="15" cy="12" r="1" fill="#22c55e"/>
                            <circle cx="19" cy="12" r="1" fill="#fbbf24"/>
                            <path d="M9 9L9 15" stroke="url(#logoGrad)" stroke-width="1.5" stroke-linecap="round"/>
                            <path d="M11 9L11 15" stroke="url(#logoGrad)" stroke-width="1.5" stroke-linecap="round"/>
                            <defs>
                                <linearGradient id="logoGrad" x1="2" y1="6" x2="22" y2="18" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#a78bfa"/>
                                    <stop offset="1" stop-color="#f472b6"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>
                <h1 class="title">Shonen Multiverse</h1>
                <p class="subtitle">Connect your Roblox account with Discord</p>
                
                <div class="features">
                    <div class="feature">
                        <div class="feature-icon verified">
                            <svg viewBox="0 0 24 24">
                                <path d="M9 12l2 2 4-4"/>
                                <circle cx="12" cy="12" r="9"/>
                            </svg>
                        </div>
                        <span class="feature-text">Verify your Roblox account ownership</span>
                    </div>
                    <div class="feature">
                        <div class="feature-icon sync">
                            <svg viewBox="0 0 24 24">
                                <path d="M4 12a8 8 0 0 1 14.5-4.5"/>
                                <path d="M20 12a8 8 0 0 1-14.5 4.5"/>
                                <polyline points="4 6 4 12 10 12"/>
                                <polyline points="20 18 20 12 14 12"/>
                            </svg>
                        </div>
                        <span class="feature-text">Sync your Discord roles with Roblox rank</span>
                    </div>
                    <div class="feature">
                        <div class="feature-icon analytics">
                            <svg viewBox="0 0 24 24">
                                <path d="M3 3v18h18"/>
                                <path d="M18 9l-5 5-4-4-3 3"/>
                            </svg>
                        </div>
                        <span class="feature-text">Track your activity and earn rewards</span>
                    </div>
                    <div class="feature">
                        <div class="feature-icon gaming">
                            <svg viewBox="0 0 24 24">
                                <rect x="2" y="6" width="20" height="12" rx="2"/>
                                <path d="M6 12h4"/>
                                <path d="M8 10v4"/>
                                <circle cx="17" cy="10" r="1" fill="currentColor" stroke="none"/>
                                <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none"/>
                            </svg>
                        </div>
                        <span class="feature-text">Access exclusive in-game features</span>
                    </div>
                </div>
                
                <a href="https://discord.gg/2xvmzeDy3Y" class="discord-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Join Discord Server
                </a>
                
                <div class="footer">
                    <p>© 2025 Shonen Multiverse | <a href="/privacy">Privacy Policy</a> | <a href="/tos">Terms of Service</a></p>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Create particles
        const particlesContainer = document.getElementById('particles');
        for (let i = 0; i < 40; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 15 + 's';
            particle.style.animationDuration = (Math.random() * 10 + 12) + 's';
            particle.style.opacity = Math.random() * 0.5 + 0.3;
            particlesContainer.appendChild(particle);
        }
        
        // Add hover effect to steps
        document.querySelectorAll('.step-item').forEach((step, index) => {
            step.addEventListener('mouseenter', () => {
                step.style.background = 'rgba(88, 101, 242, 0.15)';
            });
            step.addEventListener('mouseleave', () => {
                step.style.background = 'rgba(255,255,255,0.02)';
            });
        });
    </script>
</body>
</html>
`));

// Privacy Policy Endpoint
app.get('/privacy', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - Shonen Multiverse</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #ff6b6b;
            --secondary: #5865F2;
            --accent: #7c3aed;
            --dark: #0a0a0f;
            --glass: rgba(255,255,255,0.03);
            --glass-border: rgba(255,255,255,0.08);
            --text-primary: #ffffff;
            --text-secondary: rgba(255,255,255,0.7);
            --text-muted: rgba(255,255,255,0.5);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: var(--dark);
            min-height: 100vh;
            color: var(--text-primary);
            line-height: 1.7;
        }
        .bg-gradient {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: 
                radial-gradient(ellipse 80% 50% at 50% -20%, rgba(88, 101, 242, 0.12), transparent),
                radial-gradient(ellipse 60% 40% at 100% 100%, rgba(124, 58, 237, 0.08), transparent),
                var(--dark);
            z-index: -1;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 60px 30px;
        }
        .back-btn {
            position: fixed;
            top: 25px;
            left: 25px;
            width: 50px;
            height: 50px;
            background: var(--glass);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-primary);
            text-decoration: none;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 100;
            opacity: 0;
            animation: fadeIn 0.5s ease 0.1s forwards;
        }
        .back-btn:hover {
            background: var(--secondary);
            transform: scale(1.1);
            box-shadow: 0 0 30px rgba(88, 101, 242, 0.4);
        }
        .back-btn svg { width: 24px; height: 24px; }
        @keyframes fadeIn { to { opacity: 1; } }
        
        .header {
            text-align: center;
            margin-bottom: 50px;
            opacity: 0;
            animation: slideUp 0.6s ease 0.2s forwards;
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .header-icon {
            width: 70px;
            height: 70px;
            background: linear-gradient(135deg, var(--secondary), var(--accent));
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }
        .header-icon svg { width: 36px; height: 36px; stroke: white; fill: none; stroke-width: 1.5; }
        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
            background: linear-gradient(135deg, var(--text-primary), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .effective-date {
            color: var(--text-muted);
            font-size: 0.9rem;
        }
        
        .content-card {
            background: var(--glass);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 24px;
            padding: 40px;
            margin-bottom: 25px;
            opacity: 0;
            animation: slideUp 0.6s ease forwards;
        }
        .content-card:nth-child(3) { animation-delay: 0.3s; }
        .content-card:nth-child(4) { animation-delay: 0.4s; }
        .content-card:nth-child(5) { animation-delay: 0.5s; }
        .content-card:nth-child(6) { animation-delay: 0.6s; }
        .content-card:nth-child(7) { animation-delay: 0.7s; }
        .content-card:nth-child(8) { animation-delay: 0.8s; }
        .content-card:nth-child(9) { animation-delay: 0.9s; }
        .content-card:nth-child(10) { animation-delay: 1.0s; }
        
        /* Disable animations for carousel content-cards */
        .slides-container .content-card {
            opacity: 0 !important;
            animation: none !important;
            display: none !important;
            margin-bottom: 0 !important;
        }
        .slides-container .content-card.active {
            opacity: 1 !important;
            display: block !important;
            animation: carouselSlideIn 0.4s ease !important;
        }
        @keyframes carouselSlideIn {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        .section-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
        }
        .section-icon {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, rgba(88, 101, 242, 0.2), rgba(124, 58, 237, 0.2));
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .section-icon svg { width: 22px; height: 22px; stroke: var(--secondary); fill: none; stroke-width: 1.8; }
        h2 {
            font-size: 1.3rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        p {
            color: var(--text-secondary);
            margin-bottom: 15px;
        }
        ul {
            color: var(--text-secondary);
            margin-left: 20px;
            margin-bottom: 15px;
        }
        li { margin-bottom: 8px; }
        li::marker { color: var(--secondary); }
        
        .highlight-box {
            background: rgba(88, 101, 242, 0.08);
            border: 1px solid rgba(88, 101, 242, 0.15);
            border-radius: 8px;
            padding: 12px 14px;
            margin-top: 12px;
        }
        .highlight-box p { margin: 0; font-size: 0.85rem; line-height: 1.5; }
        
        .footer {
            text-align: center;
            padding: 40px 0;
            color: var(--text-muted);
            font-size: 0.85rem;
            opacity: 0;
            animation: fadeIn 0.5s ease 1.2s forwards;
        }
        .footer a { color: var(--secondary); text-decoration: none; }
        .footer a:hover { color: var(--primary); }
        
        /* Carousel Styles */
        .carousel-wrapper {
            display: flex;
            align-items: center;
            gap: 25px;
            width: 100%;
            position: relative;
            min-height: 380px;
        }
        .nav-arrow {
            width: 48px;
            height: 48px;
            background: var(--glass);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            flex-shrink: 0;
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            z-index: 10;
        }
        .nav-arrow#prevBtn { left: 0; }
        .nav-arrow#nextBtn { right: 0; }
        .nav-arrow:hover:not(.disabled) {
            background: linear-gradient(135deg, var(--secondary), var(--accent));
            transform: translateY(-50%) scale(1.1);
        }
        .nav-arrow.disabled { opacity: 0.3; cursor: not-allowed; }
        .nav-arrow svg { width: 22px; height: 22px; stroke: white; fill: none; stroke-width: 2; }
        .slides-container {
            flex: 1;
            margin: 0 70px;
        }
        .slides-container .content-card {
            margin-bottom: 0 !important;
        }
        .progress-dots {
            display: flex;
            gap: 8px;
            justify-content: center;
            margin-top: 20px;
        }
        .dot {
            width: 10px; height: 10px;
            border-radius: 50%;
            background: var(--glass-border);
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .dot.active {
            background: var(--secondary);
            transform: scale(1.2);
        }
    </style>
</head>
<body>
    <div class="bg-gradient"></div>
    <div class="container">
    <a href="/" class="back-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
    </a>
        
        <div class="header">
            <div class="header-icon">
                <svg viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
            </div>
            <h1>Privacy Policy</h1>
            <p class="effective-date">Effective Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <!-- Carousel -->
        <div class="carousel-wrapper">
            <div class="nav-arrow" id="prevBtn" onclick="changeSlide(-1)">
                <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </div>
            <div class="slides-container">
        
        <div class="content-card slide active">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h2>Introduction</h2>
            </div>
            <p>Shonen Multiverse ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Discord bot and related services.</p>
            <p>By using our services, you consent to the data practices described in this policy. If you do not agree with the terms of this privacy policy, please do not access or use our services.</p>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                </div>
                <h2>1. Information We Collect</h2>
            </div>
            <p>We collect information that you provide directly or that is automatically collected through your use of our services:</p>
            <ul>
                <li><strong>Discord Account Information:</strong> User ID, username, avatar, and server membership data</li>
                <li><strong>Roblox Account Information:</strong> User ID, username, and display name (obtained via Roblox OAuth 2.0 with your explicit consent)</li>
                <li><strong>Activity Data:</strong> Message counts, voice channel time, XP/level progress, and command usage statistics</li>
                <li><strong>Moderation Records:</strong> Warnings, mutes, bans, and related moderator actions</li>
            </ul>
            <div class="highlight-box">
                <p>⚠️ <strong>Important:</strong> We only access Roblox data that you explicitly authorize through the OAuth 2.0 consent flow. We never access your Roblox password or private account settings.</p>
            </div>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <h2>2. How We Use Your Information</h2>
            </div>
            <p>We use the collected information for the following purposes:</p>
            <ul>
                <li><strong>Account Verification:</strong> To verify ownership of your Roblox account and link it with your Discord account</li>
                <li><strong>Role Synchronization:</strong> To automatically assign Discord roles based on your Roblox group rank</li>
                <li><strong>Activity Tracking:</strong> To maintain leveling systems, leaderboards, and achievement progress</li>
                <li><strong>Moderation:</strong> To enforce server rules and maintain a safe community environment</li>
                <li><strong>Service Improvement:</strong> To analyze usage patterns and improve our services</li>
            </ul>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <h2>3. Data Storage & Security</h2>
            </div>
            <p>Your data is stored securely in our MongoDB database with the following security measures:</p>
            <ul>
                <li>Encrypted database connections using TLS/SSL</li>
                <li>Access restricted to authorized personnel only</li>
                <li>Regular security audits and updates</li>
                <li>Data stored on secure, reputable cloud infrastructure</li>
            </ul>
            <p>OAuth tokens from Roblox are used only for the initial verification process and are not permanently stored.</p>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <h2>4. Data Sharing & Third Parties</h2>
            </div>
            <p>We do not sell, trade, or rent your personal information to third parties. Your data may be shared only in the following circumstances:</p>
            <ul>
                <li><strong>Service Providers:</strong> With trusted third-party services necessary for bot operation (Discord API, Roblox API, database hosting)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to respond to valid legal processes</li>
                <li><strong>Safety:</strong> To protect the rights, safety, or property of our users or the public</li>
            </ul>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>
                </div>
                <h2>5. Children's Privacy</h2>
            </div>
            <p>Our services are intended for users who meet the minimum age requirements set by Discord (13 years or older, or the minimum age in your country) and Roblox.</p>
            <p>We do not knowingly collect personally identifiable information from children under the age of 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.</p>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </div>
                <h2>6. Data Retention & Deletion</h2>
            </div>
            <p>We retain your data for as long as necessary to provide our services and fulfill the purposes outlined in this policy.</p>
            <ul>
                <li><strong>Account Data:</strong> Retained until you request deletion or leave all servers using our bot</li>
                <li><strong>Activity Data:</strong> May be retained for statistical purposes in anonymized form</li>
                <li><strong>Moderation Records:</strong> Retained as needed for server safety</li>
            </ul>
            <div class="highlight-box">
                <p>🗑️ <strong>Request Deletion:</strong> You can request deletion of your data by contacting server administrators or using the /unverify command to unlink your Roblox account.</p>
            </div>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <h2>7. Contact Us</h2>
            </div>
            <p>If you have any questions about this Privacy Policy, your data, or wish to exercise your rights, please contact us through:</p>
            <ul>
                <li><strong>Discord Server:</strong> <a href="https://discord.gg/2xvmzeDy3Y" style="color: var(--secondary);">discord.gg/2xvmzeDy3Y</a></li>
                <li><strong>Support Tickets:</strong> Open a ticket in our Discord server</li>
            </ul>
        </div>
        
            </div><!-- slides-container end -->
            <div class="nav-arrow" id="nextBtn" onclick="changeSlide(1)">
                <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
            </div>
        </div><!-- carousel-wrapper end -->
        
        <div class="progress-dots" id="progressDots"></div>
        
        <div class="footer">
            <p>© 2025 Shonen Multiverse | <a href="/tos">Terms of Service</a> | <a href="/">Home</a></p>
        </div>
    </div>
    
    <script>
        // Carousel functionality
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slides-container .content-card');
        const totalSlides = slides.length;
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const dotsContainer = document.getElementById('progressDots');
        
        // IMMEDIATELY hide all slides except the first one
        slides.forEach((slide, i) => {
            slide.style.display = i === 0 ? 'block' : 'none';
            slide.style.opacity = i === 0 ? '1' : '0';
            slide.style.animation = 'none';
            slide.classList.add('slide');
            if (i === 0) slide.classList.add('active');
        });
        
        // Create progress dots
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot' + (i === 0 ? ' active' : '');
            dot.onclick = () => goToSlide(i);
            dotsContainer.appendChild(dot);
        }
        
        function updateSlides() {
            slides.forEach((slide, i) => {
                slide.classList.remove('active', 'prev');
                if (i === currentSlide) {
                    slide.classList.add('active');
                    slide.style.display = 'block';
                    slide.style.opacity = '1';
                } else {
                    slide.style.display = 'none';
                    slide.style.opacity = '0';
                    if (i < currentSlide) {
                        slide.classList.add('prev');
                    }
                }
            });
            
            // Update dots
            document.querySelectorAll('.dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === currentSlide);
            });
            
            // Update arrows
            prevBtn.classList.toggle('disabled', currentSlide === 0);
            nextBtn.classList.toggle('disabled', currentSlide === totalSlides - 1);
        }
        
        function changeSlide(direction) {
            const newSlide = currentSlide + direction;
            if (newSlide >= 0 && newSlide < totalSlides) {
                currentSlide = newSlide;
                updateSlides();
            }
        }
        
        function goToSlide(index) {
            currentSlide = index;
            updateSlides();
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') changeSlide(-1);
            if (e.key === 'ArrowRight') changeSlide(1);
        });
        
        // Initialize
        updateSlides();
    </script>
</body>
</html>
`);
});

// Terms of Service Endpoint
app.get('/tos', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - Shonen Multiverse</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #ff6b6b;
            --secondary: #5865F2;
            --accent: #7c3aed;
            --dark: #0a0a0f;
            --glass: rgba(255,255,255,0.03);
            --glass-border: rgba(255,255,255,0.08);
            --text-primary: #ffffff;
            --text-secondary: rgba(255,255,255,0.7);
            --text-muted: rgba(255,255,255,0.5);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: var(--dark);
            min-height: 100vh;
            color: var(--text-primary);
            line-height: 1.7;
        }
        .bg-gradient {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: 
                radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255, 107, 107, 0.1), transparent),
                radial-gradient(ellipse 60% 40% at 100% 100%, rgba(88, 101, 242, 0.08), transparent),
                var(--dark);
            z-index: -1;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 60px 30px;
        }
        .back-btn {
            position: fixed;
            top: 25px;
            left: 25px;
            width: 50px;
            height: 50px;
            background: var(--glass);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-primary);
            text-decoration: none;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 100;
            opacity: 0;
            animation: fadeIn 0.5s ease 0.1s forwards;
        }
        .back-btn:hover {
            background: var(--secondary);
            transform: scale(1.1);
            box-shadow: 0 0 30px rgba(88, 101, 242, 0.4);
        }
        .back-btn svg { width: 24px; height: 24px; }
        @keyframes fadeIn { to { opacity: 1; } }
        
        .header {
            text-align: center;
            margin-bottom: 50px;
            opacity: 0;
            animation: slideUp 0.6s ease 0.2s forwards;
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .header-icon {
            width: 70px;
            height: 70px;
            background: linear-gradient(135deg, var(--primary), var(--accent));
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }
        .header-icon svg { width: 36px; height: 36px; stroke: white; fill: none; stroke-width: 1.5; }
        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
            background: linear-gradient(135deg, var(--text-primary), var(--primary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .effective-date {
            color: var(--text-muted);
            font-size: 0.9rem;
        }
        
        .content-card {
            background: var(--glass);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 24px;
            padding: 40px;
            margin-bottom: 25px;
            opacity: 0;
            animation: slideUp 0.6s ease forwards;
        }
        .content-card:nth-child(3) { animation-delay: 0.3s; }
        .content-card:nth-child(4) { animation-delay: 0.35s; }
        .content-card:nth-child(5) { animation-delay: 0.4s; }
        .content-card:nth-child(6) { animation-delay: 0.45s; }
        .content-card:nth-child(7) { animation-delay: 0.5s; }
        .content-card:nth-child(8) { animation-delay: 0.55s; }
        .content-card:nth-child(9) { animation-delay: 0.6s; }
        .content-card:nth-child(10) { animation-delay: 0.65s; }
        .content-card:nth-child(11) { animation-delay: 0.7s; }
        .content-card:nth-child(12) { animation-delay: 0.75s; }
        .content-card:nth-child(13) { animation-delay: 0.8s; }
        
        .section-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
        }
        .section-icon {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, rgba(255, 107, 107, 0.2), rgba(124, 58, 237, 0.2));
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .section-icon svg { width: 22px; height: 22px; stroke: var(--primary); fill: none; stroke-width: 1.8; }
        h2 {
            font-size: 1.3rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        p {
            color: var(--text-secondary);
            margin-bottom: 15px;
        }
        p:last-child { margin-bottom: 0; }
        ul {
            color: var(--text-secondary);
            margin-left: 20px;
            margin-bottom: 15px;
        }
        li { margin-bottom: 8px; }
        li::marker { color: var(--primary); }
        
        .warning-box {
            background: rgba(255, 107, 107, 0.1);
            border: 1px solid rgba(255, 107, 107, 0.2);
            border-radius: 12px;
            padding: 20px;
            margin-top: 15px;
        }
        .warning-box p { margin: 0; font-size: 0.95rem; }
        
        .info-box {
            background: rgba(88, 101, 242, 0.1);
            border: 1px solid rgba(88, 101, 242, 0.2);
            border-radius: 12px;
            padding: 20px;
            margin-top: 15px;
        }
        .info-box p { margin: 0; font-size: 0.95rem; }
        
        .footer {
            text-align: center;
            padding: 40px 0;
            color: var(--text-muted);
            font-size: 0.85rem;
            opacity: 0;
            animation: fadeIn 0.5s ease 1s forwards;
        }
        .footer a { color: var(--secondary); text-decoration: none; }
        .footer a:hover { color: var(--primary); }
        
        /* Carousel Styles */
        .carousel-wrapper {
            display: flex;
            align-items: center;
            gap: 25px;
            width: 100%;
            position: relative;
            min-height: 380px;
        }
        .nav-arrow {
            width: 48px;
            height: 48px;
            background: var(--glass);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            flex-shrink: 0;
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            z-index: 10;
        }
        .nav-arrow#prevBtn { left: 0; }
        .nav-arrow#nextBtn { right: 0; }
        .nav-arrow:hover:not(.disabled) {
            background: linear-gradient(135deg, var(--secondary), var(--accent));
            transform: translateY(-50%) scale(1.1);
        }
        .nav-arrow.disabled { opacity: 0.3; cursor: not-allowed; }
        .nav-arrow svg { width: 22px; height: 22px; stroke: white; fill: none; stroke-width: 2; }
        .slides-container {
            flex: 1;
            margin: 0 70px;
        }
        .slides-container .content-card {
            margin-bottom: 0 !important;
        }
        .progress-dots {
            display: flex;
            gap: 8px;
            justify-content: center;
            margin-top: 20px;
        }
        .dot {
            width: 10px; height: 10px;
            border-radius: 50%;
            background: var(--glass-border);
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .dot.active {
            background: var(--secondary);
            transform: scale(1.2);
        }
    </style>
</head>
<body>
    <div class="bg-gradient"></div>
    <div class="container">
    <a href="/" class="back-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
    </a>
        
        <div class="header">
            <div class="header-icon">
                <svg viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                </svg>
            </div>
            <h1>Terms of Service</h1>
            <p class="effective-date">Effective Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <!-- Carousel -->
        <div class="carousel-wrapper">
            <div class="nav-arrow" id="prevBtn" onclick="changeSlide(-1)">
                <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </div>
            <div class="slides-container">
        
        <div class="content-card slide active">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </div>
                <h2>1. Acceptance of Terms</h2>
            </div>
            <p>By accessing or using the Shonen Multiverse Discord bot and related services ("Service"), you agree to be bound by these Terms of Service ("Terms"). These Terms constitute a legally binding agreement between you and Shonen Multiverse.</p>
            <p>If you do not agree to these Terms, you must not access or use our Service. Your continued use of the Service constitutes acceptance of any updates to these Terms.</p>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                </div>
                <h2>2. Description of Service</h2>
            </div>
            <p>Shonen Multiverse provides a Discord bot that offers the following features:</p>
            <ul>
                <li><strong>Roblox Account Verification:</strong> Link your Roblox account to Discord using OAuth 2.0</li>
                <li><strong>Role Synchronization:</strong> Automatic Discord role assignment based on Roblox group ranks</li>
                <li><strong>Leveling System:</strong> XP-based progression, leaderboards, and rewards</li>
                <li><strong>Moderation Tools:</strong> Server management and community safety features</li>
                <li><strong>Community Features:</strong> Giveaways, polls, tickets, and more</li>
            </ul>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <h2>3. User Accounts & Eligibility</h2>
            </div>
            <p>To use our Service, you must:</p>
            <ul>
                <li>Be at least 13 years of age or the minimum age required by Discord in your country</li>
                <li>Have a valid Discord account in good standing</li>
                <li>Have a valid Roblox account (for verification features)</li>
                <li>Comply with Discord's Terms of Service and Community Guidelines</li>
                <li>Comply with Roblox's Terms of Use and Community Standards</li>
            </ul>
            <div class="info-box">
                <p>ℹ️ By verifying your Roblox account, you authorize us to access your public Roblox profile information through Roblox's official OAuth 2.0 API.</p>
            </div>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h2>4. Usage Rules & Prohibited Conduct</h2>
            </div>
            <p>You agree NOT to:</p>
            <ul>
                <li>Use the Service for any illegal, harmful, or fraudulent purposes</li>
                <li>Attempt to exploit, hack, reverse-engineer, or disrupt the Service</li>
                <li>Use automated tools, scripts, or bots to interact with the Service</li>
                <li>Impersonate other users or misrepresent your identity</li>
                <li>Spam commands or abuse the Service to disrupt server operations</li>
                <li>Circumvent bans, mutes, or other moderation actions</li>
                <li>Share or sell access to verified accounts</li>
                <li>Use the Service to harass, bully, or harm other users</li>
            </ul>
            <div class="warning-box">
                <p>⚠️ <strong>Warning:</strong> Violation of these rules may result in immediate termination of access, account blacklisting, and reporting to Discord and/or Roblox.</p>
            </div>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <h2>5. Intellectual Property</h2>
            </div>
            <p>The Service, including its original content, features, and functionality, is owned by Shonen Multiverse and is protected by international copyright, trademark, and other intellectual property laws.</p>
            <p>"Shonen Multiverse" and related branding are trademarks of our organization. "Discord" is a trademark of Discord Inc. "Roblox" is a trademark of Roblox Corporation. All third-party trademarks are property of their respective owners.</p>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </div>
                <h2>6. Third-Party Services</h2>
            </div>
            <p>Our Service integrates with third-party platforms:</p>
            <ul>
                <li><strong>Discord:</strong> Subject to <a href="https://discord.com/terms" style="color: var(--secondary);">Discord's Terms of Service</a></li>
                <li><strong>Roblox:</strong> Subject to <a href="https://en.help.roblox.com/hc/en-us/articles/115004647846" style="color: var(--secondary);">Roblox's Terms of Use</a></li>
            </ul>
            <p>We are not responsible for the availability, content, or practices of these third-party services. Your use of these platforms is subject to their respective terms and policies.</p>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <h2>7. Disclaimer of Warranties</h2>
            </div>
            <p>THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.</p>
            <p>We do not warrant that:</p>
            <ul>
                <li>The Service will be uninterrupted, timely, secure, or error-free</li>
                <li>The results obtained from using the Service will be accurate or reliable</li>
                <li>Any errors in the Service will be corrected</li>
            </ul>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                </div>
                <h2>8. Limitation of Liability</h2>
            </div>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, SHONEN MULTIVERSE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:</p>
            <ul>
                <li>Loss of data, profits, or goodwill</li>
                <li>Service interruption or computer damage</li>
                <li>Cost of substitute services</li>
                <li>Any other intangible losses</li>
            </ul>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </div>
                <h2>9. Termination</h2>
            </div>
            <p>We reserve the right to terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including:</p>
            <ul>
                <li>Breach of these Terms</li>
                <li>Violation of our usage rules</li>
                <li>Request by law enforcement or government agencies</li>
                <li>Discontinuation or modification of the Service</li>
            </ul>
            <p>Upon termination, your right to use the Service will immediately cease. Provisions that by their nature should survive termination shall survive.</p>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </div>
                <h2>10. Changes to Terms</h2>
            </div>
            <p>We reserve the right to modify these Terms at any time. We will notify users of significant changes through our Discord server or by updating the "Effective Date" at the top of these Terms.</p>
            <p>Your continued use of the Service after any changes constitutes acceptance of the new Terms. If you do not agree to the modified Terms, you must stop using the Service.</p>
        </div>
        
        <div class="content-card" style="display:none">
            <div class="section-header">
                <div class="section-icon">
                    <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <h2>11. Contact Us</h2>
            </div>
            <p>If you have any questions about these Terms of Service, please contact us through:</p>
            <ul>
                <li><strong>Discord Server:</strong> <a href="https://discord.gg/2xvmzeDy3Y" style="color: var(--secondary);">discord.gg/2xvmzeDy3Y</a></li>
                <li><strong>Support Tickets:</strong> Open a ticket in our Discord server</li>
            </ul>
        </div>
        
            </div><!-- slides-container end -->
            <div class="nav-arrow" id="nextBtn" onclick="changeSlide(1)">
                <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
            </div>
        </div><!-- carousel-wrapper end -->
        
        <div class="progress-dots" id="progressDots"></div>
        
        <div class="footer">
            <p>© 2025 Shonen Multiverse | <a href="/privacy">Privacy Policy</a> | <a href="/">Home</a></p>
        </div>
    </div>
    
    <script>
        // Carousel functionality
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slides-container .content-card');
        const totalSlides = slides.length;
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const dotsContainer = document.getElementById('progressDots');
        
        // IMMEDIATELY hide all slides except the first one  
        slides.forEach((slide, i) => {
            slide.style.display = i === 0 ? 'block' : 'none';
            slide.style.opacity = i === 0 ? '1' : '0';
            slide.style.animation = 'none';
            slide.classList.add('slide');
            if (i === 0) slide.classList.add('active');
        });
        
        // Create progress dots
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot' + (i === 0 ? ' active' : '');
            dot.onclick = () => goToSlide(i);
            dotsContainer.appendChild(dot);
        }
        
        function updateSlides() {
            slides.forEach((slide, i) => {
                slide.classList.remove('active', 'prev');
                if (i === currentSlide) {
                    slide.classList.add('active');
                    slide.style.display = 'block';
                    slide.style.opacity = '1';
                } else {
                    slide.style.display = 'none';
                    slide.style.opacity = '0';
                    if (i < currentSlide) {
                        slide.classList.add('prev');
                    }
                }
            });
            
            // Update dots
            document.querySelectorAll('.dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === currentSlide);
            });
            
            // Update arrows
            prevBtn.classList.toggle('disabled', currentSlide === 0);
            nextBtn.classList.toggle('disabled', currentSlide === totalSlides - 1);
        }
        
        function changeSlide(direction) {
            const newSlide = currentSlide + direction;
            if (newSlide >= 0 && newSlide < totalSlides) {
                currentSlide = newSlide;
                updateSlides();
            }
        }
        
        function goToSlide(index) {
            currentSlide = index;
            updateSlides();
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') changeSlide(-1);
            if (e.key === 'ArrowRight') changeSlide(1);
        });
        
        // Initialize
        updateSlides();
    </script>
</body>
</html>
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
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Successful - Shonen Multiverse</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #ff6b6b;
            --secondary: #5865F2;
            --accent: #7c3aed;
            --success: #22c55e;
            --dark: #0a0a0f;
            --glass: rgba(255,255,255,0.03);
            --glass-border: rgba(255,255,255,0.08);
            --text-primary: #ffffff;
            --text-secondary: rgba(255,255,255,0.7);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: var(--dark);
            min-height: 100vh;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .bg-gradient {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: 
                radial-gradient(ellipse 80% 50% at 50% -20%, rgba(34, 197, 94, 0.15), transparent),
                radial-gradient(ellipse 60% 40% at 100% 100%, rgba(88, 101, 242, 0.1), transparent),
                var(--dark);
            z-index: -1;
        }
        .card {
            background: var(--glass);
            backdrop-filter: blur(24px);
            border: 1px solid var(--glass-border);
            border-radius: 28px;
            padding: 50px;
            text-align: center;
            max-width: 450px;
            width: 90%;
            animation: slideUp 0.6s ease;
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .success-icon {
            width: 90px;
            height: 90px;
            background: linear-gradient(135deg, var(--success), #16a34a);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 25px;
            box-shadow: 0 10px 40px rgba(34, 197, 94, 0.4);
            animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s forwards;
            transform: scale(0);
        }
        .success-icon svg { width: 45px; height: 45px; stroke: white; stroke-width: 3; fill: none; }
        @keyframes popIn { to { transform: scale(1); } }
        h1 {
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 10px;
            background: linear-gradient(135deg, var(--success), #4ade80);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .subtitle { color: var(--text-secondary); font-size: 1rem; margin-bottom: 30px; }
        .user-info {
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.2);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .user-name { font-size: 1.3rem; font-weight: 600; margin-bottom: 5px; }
        .user-id { font-size: 0.85rem; color: var(--text-secondary); }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: linear-gradient(135deg, var(--secondary), var(--accent));
            color: white;
            padding: 16px 40px;
            border-radius: 14px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 10px 30px rgba(88, 101, 242, 0.3);
        }
        .btn:hover { transform: translateY(-3px); }
        .redirect-text { color: var(--text-secondary); font-size: 0.85rem; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="bg-gradient"></div>
    <div class="card">
        <div class="success-icon">
            <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h1>Verification Successful!</h1>
        <p class="subtitle">Your Roblox account has been linked</p>
        <div class="user-info">
            <p class="user-name">${robloxUser.preferred_username || robloxUser.name}</p>
            <p class="user-id">Roblox ID: ${robloxUser.sub}</p>
        </div>
        <a href="https://discord.gg/2xvmzeDy3Y" class="btn">Return to Discord Server</a>
        <p class="redirect-text">Redirecting to Discord server in 3 seconds...</p>
    </div>
    <script>setTimeout(() => { window.location.href = "https://discord.gg/2xvmzeDy3Y"; }, 3000);</script>
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
