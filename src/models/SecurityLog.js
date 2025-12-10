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
// Static method to log action
securityLogSchema.statics.logAction = async function (guildId, executorId, actionType, detailsOrTarget) {
    // Handle both old (object) and new (args) usage just in case, or stick to one.
    // protectionSystem passes: guildId, oderId (executor), actionType, targetId (which acts as details/target)

    let data = {};
    if (typeof guildId === 'object') {
        data = guildId;
    } else {
        data = {
            guildId,
            executorId,
            actionType,
            details: typeof detailsOrTarget === 'string' ? detailsOrTarget : JSON.stringify(detailsOrTarget)
            // targetId is optional in schema, maybe map it if needed? 
            // The schema has targetId and details.
            // protectionSystem passes 4th arg as 'targetId' variable but usage implies it might be details sometimes?
            // Let's look at protectionSystem: 
            // recordAction(guildId, oderId, actionType, targetId)
        };
        // Explicitly map targetId if it looks like an ID, otherwise treat as details?
        // Actually looking at Schema, it has 'targetId' and 'details'.
        // Let's just update the signature to match what we need.
        data.targetId = (typeof detailsOrTarget === 'string' && detailsOrTarget.match(/^\d+$/)) ? detailsOrTarget : null;
        if (!data.targetId) data.details = detailsOrTarget;
    }
    return this.create(data);
};

module.exports = mongoose.model('SecurityLog', securityLogSchema);
