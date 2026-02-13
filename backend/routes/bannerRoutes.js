const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const multer = require('multer');
const path = require('path');

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `banner-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// @route   GET /api/banners
// @desc    Get all active banners
router.get('/', async (req, res) => {
    try {
        const banners = await Banner.find({ active: true }).sort({ createdAt: -1 });
        res.json(banners);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/banners
// @desc    Create new banner (Admin)
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Image is required' });

        const banner = new Banner({
            title: req.body.title,
            image: `/uploads/${req.file.filename}`,
            link: req.body.link
        });

        const newBanner = await banner.save();
        res.status(201).json(newBanner);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// @route   DELETE /api/banners/:id
// @desc    Delete banner
router.delete('/:id', async (req, res) => {
    try {
        await Banner.findByIdAndDelete(req.params.id);
        res.json({ message: 'Banner deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
