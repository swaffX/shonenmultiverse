const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    oderId: { // userId (typo preserved for compat)
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    // Level System
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    totalMessages: { type: Number, default: 0 },
    totalVoiceTime: { type: Number, default: 0 }, // in minutes
    lastXpGain: { type: Date, default: null },
    lastVoiceJoin: { type: Date, default: null },

    // Weekly Stats (reset every Monday)
    weeklyMessages: { type: Number, default: 0 },
    weeklyVoiceTime: { type: Number, default: 0 }, // in minutes
    weeklyResetAt: { type: Date, default: Date.now },

    // Monthly Stats (reset 1st of each month)
    monthlyMessages: { type: Number, default: 0 },
    monthlyVoiceTime: { type: Number, default: 0 }, // in minutes
    monthlyResetAt: { type: Date, default: Date.now },

    // Channel Stats
    channelStats: {
        type: Map,
        of: Number,
        default: new Map()
    },

    // Moderation
    warnings: [{
        moderatorId: String,
        reason: String,
        date: { type: Date, default: Date.now }
    }],
    isMuted: { type: Boolean, default: false },
    muteExpires: { type: Date, default: null }
}, { timestamps: true });

// Compound index for faster queries
userSchema.index({ oderId: 1, guildId: 1 }, { unique: true });

// Static method to get or create user
userSchema.statics.findOrCreate = async function (userId, guildId) {
    let user = await this.findOne({ oderId: userId, guildId });
    if (!user) {
        user = await this.create({ oderId: userId, guildId });
    }
    return user;
};

// Static method to get XP leaderboard
userSchema.statics.getLeaderboard = async function (guildId, limit = 10) {
    return this.find({ guildId })
        .sort({ xp: -1 })
        .limit(limit);
};

// Static method to get weekly message leaderboard
userSchema.statics.getWeeklyMessageLeaders = async function (guildId, limit = 10) {
    return this.find({ guildId })
        .sort({ weeklyMessages: -1 })
        .limit(limit);
};

// Static method to get weekly voice leaderboard
userSchema.statics.getWeeklyVoiceLeaders = async function (guildId, limit = 10) {
    return this.find({ guildId })
        .sort({ weeklyVoiceTime: -1 })
        .limit(limit);
};

// Static method to get monthly message leaderboard
userSchema.statics.getMonthlyMessageLeaders = async function (guildId, limit = 10) {
    return this.find({ guildId })
        .sort({ monthlyMessages: -1 })
        .limit(limit);
};

// Static method to get monthly voice leaderboard
userSchema.statics.getMonthlyVoiceLeaders = async function (guildId, limit = 10) {
    return this.find({ guildId })
        .sort({ monthlyVoiceTime: -1 })
        .limit(limit);
};

// Static method to reset weekly stats
userSchema.statics.resetWeeklyStats = async function (guildId) {
    return this.updateMany(
        { guildId },
        {
            weeklyMessages: 0,
            weeklyVoiceTime: 0,
            weeklyResetAt: new Date()
        }
    );
};

// Static method to reset monthly stats
userSchema.statics.resetMonthlyStats = async function (guildId) {
    return this.updateMany(
        { guildId },
        {
            monthlyMessages: 0,
            monthlyVoiceTime: 0,
            monthlyResetAt: new Date()
        }
    );
};

module.exports = mongoose.model('User', userSchema);
