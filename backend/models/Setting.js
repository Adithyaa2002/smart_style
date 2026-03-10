const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true // e.g., 'global_config'
    },
    value: {
        maintenanceMode: { type: Boolean, default: false }
    }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
