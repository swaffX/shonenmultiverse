const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
    oderId: {
        type: String,
        required: true,
        index: true
    },
    guildId: {
        type: String,
        required: true
    },
    // Unlocked achievement IDs
    unlocked: [{
        achievementId: String,
        unlockedAt: { type: Date, default: Date.now }
    }],
    // Progress tracking for partial achievements
    progress: {
        type: Map,
        of: Number,
        default: {}
    }
}, { timestamps: true });

// Compound index
achievementSchema.index({ oderId: 1, guildId: 1 }, { unique: true });

// Find or create
achievementSchema.statics.findOrCreate = async function (oderId, guildId) {
    let doc = await this.findOne({ oderId, guildId });
    if (!doc) {
        doc = await this.create({ oderId, guildId, unlocked: [], progress: new Map() });
    }
    return doc;
};

// Check if achievement is unlocked
achievementSchema.methods.hasAchievement = function (achievementId) {
    return this.unlocked.some(a => a.achievementId === achievementId);
};

// Unlock achievement
achievementSchema.methods.unlock = function (achievementId) {
    if (!this.hasAchievement(achievementId)) {
        this.unlocked.push({ achievementId, unlockedAt: new Date() });
    }
    return this;
};

module.exports = mongoose.model('Achievement', achievementSchema);
