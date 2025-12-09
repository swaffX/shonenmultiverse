const { Events, AuditLogEvent } = require('discord.js');
const { recordAction, handleNukeAttempt } = require('../systems/protectionSystem');
const config = require('../config/config');

module.exports = {
    name: Events.GuildBanAdd,
    once: false,
    async execute(ban, client) {
        if (!config.antiNuke.enabled) return;

        try {
            // Get audit log to find who banned
            const auditLogs = await ban.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MemberBanAdd
            });

            const logEntry = auditLogs.entries.first();
            if (!logEntry) return;

            const executorId = logEntry.executor.id;

            // Skip if bot banned
            if (executorId === client.user.id) return;

            // Record the action
            const result = await recordAction(ban.guild.id, executorId, 'BAN', ban.user.id);

            // Check if threshold exceeded
            if (result && result.exceeded) {
                await handleNukeAttempt(ban.guild, executorId, 'BAN', client);
            }
        } catch (error) {
            console.error('GuildBanAdd event hatası:', error);
        }
    }
};
