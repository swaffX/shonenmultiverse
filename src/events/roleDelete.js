const { Events, AuditLogEvent } = require('discord.js');
const { recordAction, handleNukeAttempt } = require('../systems/protectionSystem');
const config = require('../config/config');

module.exports = {
    name: Events.GuildRoleDelete,
    once: false,
    async execute(role, client) {
        if (!config.antiNuke.enabled) return;

        try {
            // Get audit log to find who deleted
            const auditLogs = await role.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.RoleDelete
            });

            const logEntry = auditLogs.entries.first();
            if (!logEntry) return;

            const executorId = logEntry.executor.id;

            // Skip if bot deleted
            if (executorId === client.user.id) return;

            // Record the action
            const result = await recordAction(role.guild.id, executorId, 'ROLE_DELETE', role.id);

            // Check if threshold exceeded
            if (result && result.exceeded) {
                await handleNukeAttempt(role.guild, executorId, 'ROLE_DELETE', client);
            }
        } catch (error) {
            console.error('RoleDelete event hatası:', error);
        }
    }
};
