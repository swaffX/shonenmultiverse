const { Events } = require('discord.js');
const { logMessageEdit } = require('../systems/loggingSystem');

module.exports = {
    name: Events.MessageUpdate,
    once: false,
    async execute(oldMessage, newMessage, client) {
        // Skip bot messages and DMs
        if (!oldMessage.guild) return;
        if (oldMessage.partial || newMessage.partial) return;
        if (oldMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;

        // Log message edit
        await logMessageEdit(oldMessage, newMessage).catch(console.error);
    }
};
