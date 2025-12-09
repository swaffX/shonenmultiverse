const { Events } = require('discord.js');
const { logVoiceUpdate } = require('../systems/loggingSystem');
const { handleVoiceXP } = require('../systems/levelSystem');

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,
    async execute(oldState, newState, client) {
        // Log voice activity
        await logVoiceUpdate(oldState, newState).catch(console.error);

        // Voice XP system
        await handleVoiceXP(oldState, newState, client).catch(console.error);
    }
};
