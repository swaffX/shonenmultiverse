const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    // Welcome settings
    welcome: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        message: { type: String, default: 'Welcome to **{server}**! You are member **#{count}**!' },
        bannerUrl: { type: String, default: null },
        embedEnabled: { type: Boolean, default: true }
    },
    // Goodbye settings
    goodbye: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        message: { type: String, default: '**{user}** has left **{server}**. We now have **{count}** members.' },
        bannerUrl: { type: String, default: null }
    },
    // Level system settings
    levelSystem: {
        enabled: { type: Boolean, default: true },
        channelId: { type: String, default: null }, // Level up announcement channel
        rewards: { type: Map, of: String, default: new Map() } // level -> roleId
    },
    // Anti-spam settings
    antiSpam: {
        enabled: { type: Boolean, default: true },
        whitelistedChannels: [{ type: String }],
        whitelistedRoles: [{ type: String }]
    },
    // Anti-raid settings
    antiRaid: {
        enabled: { type: Boolean, default: true },
        quarantineRoleId: { type: String, default: null }
    },
    // Anti-nuke settings
    antiNuke: {
        enabled: { type: Boolean, default: true },
        whitelistedUsers: [{ type: String }] // Bot'un müdahale etmeyeceği kullanıcılar
    },
    // Logging
    logging: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        modActions: { type: Boolean, default: true },
        memberJoinLeave: { type: Boolean, default: true },
        messageDelete: { type: Boolean, default: true }
    },
    // Muted role
    mutedRoleId: { type: String, default: null },
    // Server stats channels
    statsChannels: {
        categoryId: { type: String, default: null },
        allMembers: { type: String, default: null },
        members: { type: String, default: null },
        bots: { type: String, default: null }
    },
    // Booster showcase system
    boosterSystem: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        messageId: { type: String, default: null },
        bannerUrl: { type: String, default: null }
    },
    // Ticket system
    ticketSystem: {
        enabled: { type: Boolean, default: false },
        panelChannelId: { type: String, default: null },
        categoryId: { type: String, default: null },
        supportRoleId: { type: String, default: null },
        bannerUrl: { type: String, default: null }
    },
    // Logging system
    loggingSystem: {
        enabled: { type: Boolean, default: false },
        categoryId: { type: String, default: null },
        channels: {
            messages: { type: String, default: null },
            members: { type: String, default: null },
            moderation: { type: String, default: null },
            roles: { type: String, default: null },
            channels: { type: String, default: null },
            voice: { type: String, default: null },
            server: { type: String, default: null }
        }
    }
}, { timestamps: true });

// Static method to get or create guild settings
guildSchema.statics.findOrCreate = async function (guildId) {
    let guild = await this.findOne({ guildId });
    if (!guild) {
        guild = await this.create({ guildId });
    }
    return guild;
};

module.exports = mongoose.model('Guild', guildSchema);
