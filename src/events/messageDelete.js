const { Events } = require('discord.js');
const { logMessageDelete } = require('../systems/loggingSystem');

module.exports = {
    name: Events.MessageDelete,
    once: false,
    async execute(message, client) {
        // Skip bot messages and DMs
        if (!message.guild) return;
        if (message.partial) return; // Can't log partial messages
        if (message.author?.bot) return;

        // Log message delete
        await logMessageDelete(message).catch(console.error);
    }
};
