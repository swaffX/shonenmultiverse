const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

async function loadCommands(client) {
    const commands = [];
    const commandsPath = path.join(__dirname, '..', 'commands');

    // Read all category folders
    const categories = fs.readdirSync(commandsPath);

    for (const category of categories) {
        const categoryPath = path.join(commandsPath, category);

        // Skip if not a directory
        if (!fs.statSync(categoryPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(categoryPath, file);

            // Clear cache to get updated commands
            delete require.cache[require.resolve(filePath)];

            const command = require(filePath);

            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                commands.push(command.data.toJSON());
                console.log(`✅ Command loaded: ${command.data.name}`);
            } else {
                console.log(`⚠️ Missing 'data' or 'execute' in ${filePath}`);
            }
        }
    }

    console.log(`📦 Total ${commands.length} commands loaded.`);

    // Register commands with Discord API
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

    try {
        console.log('🔄 Registering slash commands...');

        // FIRST: Clear global commands to prevent duplicates
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [] }
        );
        console.log('🧹 Global commands cleared.');

        // Register to specific guild only (instant updates)
        if (process.env.GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );
            console.log(`✅ Commands registered to guild ${process.env.GUILD_ID}!`);
        } else {
            // If no guild ID, register globally (takes up to 1 hour)
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            console.log('✅ Global commands registered!');
        }
    } catch (error) {
        console.error('❌ Command registration error:', error);
    }

    return commands;
}

module.exports = loadCommands;
