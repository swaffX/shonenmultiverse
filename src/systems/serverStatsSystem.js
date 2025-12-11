const { ChannelType, PermissionFlagsBits } = require('discord.js');

// Stats kanal ID'lerini saklamak için
const statsChannels = new Map();

// Kategori ve kanal emojileri
const STATS_CONFIG = {
    categoryName: '📊 SERVER STATS',
    channels: [
        { key: 'allMembers', prefix: '👥 All Members: ' },
        { key: 'members', prefix: '👤 Members: ' },
        { key: 'bots', prefix: '🤖 Bots: ' }
    ]
};

/**
 * Sunucu istatistiklerini al
 */
function getServerStats(guild) {
    const allMembers = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const members = allMembers - bots;

    return {
        allMembers,
        members,
        bots
    };
}

/**
 * Stats kanallarını güncelle
 */
async function updateStatsChannels(guild, channelIds) {
    try {
        const stats = getServerStats(guild);

        // Her kanalı güncelle
        for (const config of STATS_CONFIG.channels) {
            const channelId = channelIds[config.key];
            if (!channelId) continue;

            const channel = guild.channels.cache.get(channelId);
            if (!channel) continue;

            const newName = `${config.prefix}${stats[config.key]}`;

            // İsim aynıysa güncelleme
            if (channel.name !== newName) {
                await channel.setName(newName).catch(console.error);
            }
        }

        console.log(`📊 Stats updated for ${guild.name}: All: ${stats.allMembers}, Members: ${stats.members}, Bots: ${stats.bots}`);
    } catch (error) {
        console.error('Stats güncelleme hatası:', error);
    }
}

/**
 * Stats kanallarını oluştur
 */
async function createStatsChannels(guild) {
    try {
        // Önce kategori oluştur
        const category = await guild.channels.create({
            name: STATS_CONFIG.categoryName,
            type: ChannelType.GuildCategory,
            position: 0,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.Connect],
                    allow: [PermissionFlagsBits.ViewChannel]
                }
            ]
        });

        const stats = getServerStats(guild);
        const channelIds = {};

        // Her stats kanalını oluştur
        for (const config of STATS_CONFIG.channels) {
            const channel = await guild.channels.create({
                name: `${config.prefix}${stats[config.key]}`,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.Connect],
                        allow: [PermissionFlagsBits.ViewChannel]
                    }
                ]
            });

            channelIds[config.key] = channel.id;
        }

        // Kanal ID'lerini sakla
        statsChannels.set(guild.id, {
            categoryId: category.id,
            ...channelIds
        });

        console.log(`📊 Stats channels created for ${guild.name}`);

        return {
            success: true,
            categoryId: category.id,
            channelIds
        };
    } catch (error) {
        console.error('Stats kanalları oluşturma hatası:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Stats kanallarını sil
 */
async function deleteStatsChannels(guild, channelIds) {
    try {
        // Kanalları sil
        for (const key of ['allMembers', 'members', 'bots']) {
            if (channelIds[key]) {
                const channel = guild.channels.cache.get(channelIds[key]);
                if (channel) await channel.delete().catch(() => { });
            }
        }

        // Kategoriyi sil
        if (channelIds.categoryId) {
            const category = guild.channels.cache.get(channelIds.categoryId);
            if (category) await category.delete().catch(() => { });
        }

        // Cache'den kaldır
        statsChannels.delete(guild.id);

        return true;
    } catch (error) {
        console.error('Stats kanalları silme hatası:', error);
        return false;
    }
}

/**
 * Stats sistemini başlat - REMOVED duplicate event listeners
 * Stats updates are now triggered from event files to avoid duplicates
 */
function initServerStats(client, updateInterval = 300000) {
    // Periyodik güncelleme
    setInterval(async () => {
        for (const [guildId, channelIds] of statsChannels) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                await guild.members.fetch().catch(() => { });
                await updateStatsChannels(guild, channelIds);
            }
        }
    }, updateInterval);

    console.log('📊 Server Stats system initialized');
}

/**
 * Trigger stats update on member join/leave - called from event files
 */
async function triggerStatsUpdate(guild) {
    const channelIds = statsChannels.get(guild.id);
    if (channelIds) {
        setTimeout(() => updateStatsChannels(guild, channelIds), 5000);
    }
}

/**
 * Manuel güncelleme için
 */
async function forceUpdateStats(guild) {
    const channelIds = statsChannels.get(guild.id);
    if (channelIds) {
        await guild.members.fetch().catch(() => { });
        await updateStatsChannels(guild, channelIds);
        return true;
    }
    return false;
}

/**
 * Kayıtlı kanalları yükle
 */
function loadStatsChannels(guildId, channelIds) {
    statsChannels.set(guildId, channelIds);
}

/**
 * Kayıtlı kanalları al
 */
function getStatsChannelIds(guildId) {
    return statsChannels.get(guildId);
}

module.exports = {
    initServerStats,
    createStatsChannels,
    deleteStatsChannels,
    updateStatsChannels,
    forceUpdateStats,
    triggerStatsUpdate,
    getServerStats,
    loadStatsChannels,
    getStatsChannelIds,
    STATS_CONFIG
};
