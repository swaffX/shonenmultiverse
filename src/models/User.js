const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    oderId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    xp: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 1
    },
    totalMessages: {
        type: Number,
        default: 0
    },
    lastXpGain: {
        type: Date,
        default: null
    },
    warnings: [{
        moderatorId: String,
        reason: String,
        date: { type: Date, default: Date.now }
    }],
    isMuted: {
        type: Boolean,
        default: false
    },
    muteExpires: {
        type: Date,
        default: null
    }
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

// Static method to get leaderboard
userSchema.statics.getLeaderboard = async function (guildId, limit = 10) {
    return this.find({ guildId })
        .sort({ xp: -1 })
        .limit(limit);
};

module.exports = mongoose.model('User', userSchema);
