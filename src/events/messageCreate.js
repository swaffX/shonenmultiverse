const { Events } = require('discord.js');
const { checkMessage } = require('../systems/autoModSystem');
const { handleAutoResponse } = require('../systems/autoResponderSystem');
const { handleMessageXP } = require('../systems/levelSystem');
const config = require('../config/config');

module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(message, client) {
        if (message.author.bot) return;
        if (!message.guild) return;

        // Auto-Responder
        await handleAutoResponse(message);

        // Auto-Moderation (Checks bad words and spam)
        await checkMessage(message, client);

        // Level XP system
        await handleMessageXP(message, client).catch(console.error);
    }
};
