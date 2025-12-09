const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    actionType: {
        type: String,
        required: true,
        enum: ['BAN', 'KICK', 'CHANNEL_DELETE', 'ROLE_DELETE', 'BOT_ADD', 'MASS_MENTION', 'RAID_DETECTED', 'NUKE_ATTEMPT']
    },
    executorId: {
        type: String,
        required: true
    },
    targetId: {
        type: String,
        default: null
    },
    action_taken: {
        type: String,
        default: null
    },
    details: {
        type: String,
        default: null
    }
}, { timestamps: true });

// Index for querying by guild and time
securityLogSchema.index({ guildId: 1, createdAt: -1 });
securityLogSchema.index({ executorId: 1, guildId: 1, createdAt: -1 });

// Static method to count recent actions by a user
securityLogSchema.statics.countRecentActions = async function (guildId, executorId, actionType, sinceTime) {
    return this.countDocuments({
        guildId,
        executorId,
        actionType,
        createdAt: { $gte: sinceTime }
    });
};

// Static method to log action
securityLogSchema.statics.logAction = async function (data) {
    return this.create(data);
};

module.exports = mongoose.model('SecurityLog', securityLogSchema);
