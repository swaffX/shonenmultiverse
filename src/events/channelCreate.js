const { Events } = require('discord.js');
const { logChannelCreate } = require('../systems/loggingSystem');

module.exports = {
    name: Events.ChannelCreate,
    once: false,
    async execute(channel, client) {
        // Log channel create
        await logChannelCreate(channel).catch(console.error);
    }
};
