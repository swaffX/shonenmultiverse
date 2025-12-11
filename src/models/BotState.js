const mongoose = require('mongoose');

const botStateSchema = new mongoose.Schema({
    clientId: { type: String, required: true, unique: true },
    maintenanceMode: { type: Boolean, default: false }
});

module.exports = mongoose.model('BotState', botStateSchema);
