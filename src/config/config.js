
module.exports = {
    // Bot owners
    ownerIds: ['315875588906680330', '413081778031427584'],

    roblox: {
        groupId: process.env.ROBLOX_GROUP_ID || '32567584',
        clientId: process.env.ROBLOX_CLIENT_ID,
        clientSecret: process.env.ROBLOX_CLIENT_SECRET,
        redirectUri: process.env.ROBLOX_REDIRECT_URI || 'https://194.105.5.37.sslip.io/auth/roblox/callback'
    },

    // Server
    server: {
        guildId: '1438851714907377684',
        channels: {
            rules: '1447219076538699776',
            info: '1447219408253489222',
            roles: '1447219962988073141',
            polls: '1447220262901645342',
            botCommands: '1447220694244003880',
            chat: '1447220615940542545'
        },
        roles: {
            owner: '1438874153796108288',
            developer: '1446840899974860820',
            admin: '1438874331164704838',
            moderator: '1439008644879486976',
            supporter: '1440081902206976124',
            verified: '1439009819519488112',
            unverified: '1439010347716579519'
        }
    },

    // Game
    game: {
        name: 'Shonen Multiverse',
        robloxLink: 'https://www.roblox.com/games/130542097430425/Shonen-Multiverse',
        groupLink: 'https://www.roblox.com/communities/35379020/Shomei-Studios'
    },

    // Colors
    colors: {
        primary: '#FF6B6B',
        success: '#2ECC71',
        error: '#E74C3C',
        warning: '#F39C12',
        info: '#3498DB',
        giveaway: '#FF1493',
        poll: '#00BCD4',
        moderation: '#FF5722'
    },

    // Status
    statusMessages: [
        { name: 'Saving Konoha', type: 'Playing' }
    ],

    // Anti-spam
    antiSpam: {
        enabled: true,
        messageLimit: 5,
        timeWindow: 5000,
        muteDuration: 300000,
        deleteMessages: true
    },

    // Anti-raid
    antiRaid: {
        enabled: true,
        joinThreshold: 10,
        joinInterval: 10000,
        lockdownDuration: 300000
    },

    // Anti-nuke
    antiNuke: {
        enabled: true,
        banThreshold: 5,
        kickThreshold: 5,
        channelDeleteThreshold: 3,
        roleDeleteThreshold: 3,
        interval: 60000,
        action: 'removeRoles'
    }
};
