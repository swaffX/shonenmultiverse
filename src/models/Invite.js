const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    oderId: {
        type: String,
        required: true,
        index: true
    },
    // Users this person has invited
    invitedUsers: [{
        userId: String,
        username: String,
        joinedAt: { type: Date, default: Date.now },
        isValid: { type: Boolean, default: true } // False if they left quickly
    }],
    // Counts
    totalInvites: { type: Number, default: 0 },
    validInvites: { type: Number, default: 0 },  // Still in server
    leftInvites: { type: Number, default: 0 },   // Left the server
    fakeInvites: { type: Number, default: 0 },   // Account too new or left fast
    // Rewards tracking
    lastRewardAt: { type: Date, default: null },
    rewardsClaimed: [{
        milestone: Number,
        claimedAt: Date
    }]
}, { timestamps: true });

// Compound index for fast queries
inviteSchema.index({ guildId: 1, oderId: 1 }, { unique: true });
inviteSchema.index({ guildId: 1, validInvites: -1 });

// Find or create
inviteSchema.statics.findOrCreate = async function (oderId, guildId) {
    let doc = await this.findOne({ oderId, guildId });
    if (!doc) {
        doc = await this.create({ oderId, guildId });
    }
    return doc;
};

// Get top invites
inviteSchema.statics.getTopInviters = async function (guildId, limit = 10) {
    return this.find({ guildId, validInvites: { $gt: 0 } })
        .sort({ validInvites: -1 })
        .limit(limit);
};

// Recalculate valid invites
inviteSchema.methods.recalculateInvites = function () {
    this.validInvites = this.invitedUsers.filter(u => u.isValid).length;
    this.leftInvites = this.invitedUsers.filter(u => !u.isValid).length;
    return this.save();
};

module.exports = mongoose.model('Invite', inviteSchema);
