const { Events, AuditLogEvent } = require('discord.js');
const { recordAction, handleNukeAttempt } = require('../systems/protectionSystem');
const config = require('../config/config');

module.exports = {
    name: Events.ChannelDelete,
    once: false,
    async execute(channel, client) {
        if (!config.antiNuke.enabled) return;
        if (!channel.guild) return; // DM channel

        try {
            // Get audit log to find who deleted
            const auditLogs = await channel.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.ChannelDelete
            });

            const logEntry = auditLogs.entries.first();
            if (!logEntry) return;

            const executorId = logEntry.executor.id;

            // Skip if bot deleted
            if (executorId === client.user.id) return;

            // Record the action
            const result = await recordAction(channel.guild.id, executorId, 'CHANNEL_DELETE', channel.id);

            // Check if threshold exceeded
            if (result && result.exceeded) {
                await handleNukeAttempt(channel.guild, executorId, 'CHANNEL_DELETE', client);
            }
        } catch (error) {
            console.error('ChannelDelete event hatası:', error);
        }
    }
};
