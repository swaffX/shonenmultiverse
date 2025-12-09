const { Collection, ChannelType } = require('discord.js');
const config = require('../config/config');

// Store join timestamps
const joinCache = new Collection();
let lockdownActive = false;

// Clean old entries
setInterval(() => {
    const now = Date.now();
    joinCache.forEach((timestamps, guildId) => {
        const filtered = timestamps.filter(time => now - time < config.antiRaid.joinInterval * 2);
        if (filtered.length === 0) {
            joinCache.delete(guildId);
        } else {
            joinCache.set(guildId, filtered);
        }
    });
}, 30000);

// Check for raid
async function checkRaid(member, client) {
    if (!config.antiRaid.enabled) return false;

    const guildId = member.guild.id;
    const now = Date.now();

    if (!joinCache.has(guildId)) {
        joinCache.set(guildId, []);
    }

    const timestamps = joinCache.get(guildId);
    timestamps.push(now);

    // Filter old timestamps
    const recentJoins = timestamps.filter(time => now - time < config.antiRaid.joinInterval);
    joinCache.set(guildId, recentJoins);

    // Check if threshold exceeded
    if (recentJoins.length >= config.antiRaid.joinThreshold) {
        if (!lockdownActive) {
            await triggerLockdown(member.guild, client);
        }
        return true;
    }

    return false;
}

// Trigger lockdown
async function triggerLockdown(guild, client) {
    lockdownActive = true;

    console.log(`🚨 RAID DETECTED! Triggering lockdown for ${guild.name}`);

    // Notify owners
    for (const ownerId of config.ownerIds) {
        try {
            const owner = await client.users.fetch(ownerId);
            await owner.send({
                content: `🚨 **RAID ALERT!**\n\nServer: **${guild.name}**\nReason: ${config.antiRaid.joinThreshold}+ members joined within ${config.antiRaid.joinInterval / 1000} seconds!\n\n**Lockdown activated.** Verification levels have been increased.`
            });
        } catch (err) {
            console.error(`Failed to notify owner: ${ownerId}`);
        }
    }

    // Try to increase verification level
    try {
        const originalLevel = guild.verificationLevel;
        if (originalLevel < 4) {
            await guild.setVerificationLevel(4, 'Anti-raid lockdown');
            console.log(`Verification level increased to VERY HIGH`);
        }

        // Auto-disable lockdown after duration
        setTimeout(async () => {
            try {
                await guild.setVerificationLevel(originalLevel, 'Lockdown ended');
                lockdownActive = false;
                console.log(`Lockdown ended, verification level restored`);

                // Notify owners
                for (const ownerId of config.ownerIds) {
                    try {
                        const owner = await client.users.fetch(ownerId);
                        await owner.send({
                            content: `✅ **Lockdown Ended**\n\nServer: **${guild.name}**\nVerification level has been restored.`
                        });
                    } catch (err) {
                        // Ignore
                    }
                }
            } catch (err) {
                console.error('Failed to end lockdown:', err);
            }
        }, config.antiRaid.lockdownDuration);

    } catch (error) {
        console.error('Failed to trigger lockdown:', error);
    }
}

// Initialize anti-raid handler
function initAntiRaid(client) {
    console.log('🛡️ Anti-raid system initialized');
}

module.exports = {
    checkRaid,
    triggerLockdown,
    initAntiRaid
};
