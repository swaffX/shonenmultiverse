const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    channelId: {
        type: String,
        required: true
    },
    messageId: {
        type: String,
        required: true,
        unique: true
    },
    hostId: {
        type: String,
        required: true
    },
    prize: {
        type: String,
        required: true
    },
    winnersCount: {
        type: Number,
        default: 1
    },
    participants: [{
        type: String
    }],
    winners: [{
        type: String
    }],
    endsAt: {
        type: Date,
        required: true
    },
    ended: {
        type: Boolean,
        default: false
    },
    requirements: {
        roleId: { type: String, default: null },
        minLevel: { type: Number, default: 0 },
        minInvites: { type: Number, default: 0 }
    }
}, { timestamps: true });

// Index for active giveaways
giveawaySchema.index({ ended: 1, endsAt: 1 });

// Static method to get active giveaways
giveawaySchema.statics.getActive = async function () {
    return this.find({ ended: false });
};

// Static method to get giveaways ending soon
giveawaySchema.statics.getEndingSoon = async function () {
    const now = new Date();
    return this.find({
        ended: false,
        endsAt: { $lte: now }
    });
};

module.exports = mongoose.model('Giveaway', giveawaySchema);
