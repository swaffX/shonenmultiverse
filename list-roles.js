const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) {
        console.log('Guild not found');
        process.exit();
    }

    console.log(`Roles for guild: ${guild.name}`);

    // Fetch all roles
    const roles = await guild.roles.fetch();

    const sortedRoles = roles.sort((a, b) => b.position - a.position);

    sortedRoles.forEach(role => {
        console.log(`${role.name}: ${role.id}`);
    });

    process.exit();
});

client.login(process.env.BOT_TOKEN);
