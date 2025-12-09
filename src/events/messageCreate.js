const { Events } = require('discord.js');
const { checkSpam } = require('../systems/antiSpamSystem');
const config = require('../config/config');

module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(message, client) {
        if (message.author.bot) return;
        if (!message.guild) return;

        // Anti-spam
        if (config.antiSpam.enabled) {
            await checkSpam(message, client);
        }
    }
};
