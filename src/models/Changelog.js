const mongoose = require('mongoose');

const changelogSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    version: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    changes: [{
        type: {
            type: String,
            enum: ['added', 'changed', 'fixed', 'removed'],
            default: 'added'
        },
        description: String
    }],
    author: {
        id: String,
        username: String
    },
    imageUrl: {
        type: String,
        default: null
    }
}, { timestamps: true });

// Index for fast queries
changelogSchema.index({ guildId: 1, createdAt: -1 });

// Get recent changelogs
changelogSchema.statics.getRecent = function (guildId, limit = 5) {
    return this.find({ guildId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

module.exports = mongoose.model('Changelog', changelogSchema);
