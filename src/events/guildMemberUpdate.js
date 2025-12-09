const { Events, AuditLogEvent } = require('discord.js');
const config = require('../config/config');

module.exports = {
    name: Events.GuildMemberUpdate,
    once: false,
    async execute(oldMember, newMember, client) {
        // Check for dangerous role additions
        if (!config.antiNuke.enabled) return;

        try {
            const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));

            if (addedRoles.size === 0) return;

            // Check if any added role has dangerous permissions
            const dangerousPerms = ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'BanMembers', 'KickMembers'];

            for (const [, role] of addedRoles) {
                const hasDangerousPerm = dangerousPerms.some(perm => role.permissions.has(perm));

                if (hasDangerousPerm && !config.ownerIds.includes(newMember.id)) {
                    // Get audit log
                    const auditLogs = await newMember.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MemberRoleUpdate
                    });

                    const logEntry = auditLogs.entries.first();
                    if (!logEntry) continue;

                    const executorId = logEntry.executor.id;

                    // Skip if owner gave the role
                    if (config.ownerIds.includes(executorId)) continue;

                    // Notify owners about dangerous role assignment
                    for (const ownerId of config.ownerIds) {
                        try {
                            const owner = await client.users.fetch(ownerId);
                            await owner.send({
                                content: `⚠️ **TEHLİKELİ ROL UYARISI!**\n\nSunucu: **${newMember.guild.name}**\nRol veren: <@${executorId}>\nHedef: <@${newMember.id}>\nRol: **${role.name}** (tehlikeli yetkiler içeriyor)\n\nBu işlemi kontrol etmenizi öneririm.`
                            });
                        } catch (err) {
                            console.error(`Owner'a mesaj gönderilemedi: ${ownerId}`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('GuildMemberUpdate event hatası:', error);
        }
    }
};
