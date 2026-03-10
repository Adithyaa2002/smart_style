const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');

// ✅ GET GLOBAL SETTINGS
router.get('/', async (req, res) => {
    try {
        let settings = await Setting.findOne({ key: 'global_config' });
        if (!settings) {
            // Create defaults if not exists
            settings = new Setting({ key: 'global_config', value: {} });
            await settings.save();
        }
        res.json(settings.value);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ UPDATE GLOBAL SETTINGS
router.post('/', async (req, res) => {
    try {
        const newConfig = req.body;
        let settings = await Setting.findOneAndUpdate(
            { key: 'global_config' },
            { value: newConfig },
            { new: true, upsert: true }
        );
        res.json({ success: true, settings: settings.value });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
