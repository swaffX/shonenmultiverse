const mongoose = require('mongoose');

const reactionRoleSchema = new mongoose.Schema({
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
    // Type of reaction role: 'reaction' or 'button'
    roleType: {
        type: String,
        enum: ['reaction', 'button'],
        default: 'reaction'
    },
    title: {
        type: String,
        default: 'Reaction Roles'
    },
    description: {
        type: String,
        default: 'Click to get roles!'
    },
    // For reaction-based roles (emoji -> roleId)
    roles: [{
        emoji: { type: String, required: true },
        roleId: { type: String, required: true },
        description: { type: String, default: '' }
    }],
    // For button-based roles (key -> roleId mapping)
    buttonRoles: {
        type: Map,
        of: String,
        default: new Map()
    }
}, { timestamps: true });

// Index for faster lookups
reactionRoleSchema.index({ messageId: 1 });

// Static method to find by message ID
reactionRoleSchema.statics.findByMessage = async function (messageId) {
    return this.findOne({ messageId });
};

module.exports = mongoose.model('ReactionRole', reactionRoleSchema);
