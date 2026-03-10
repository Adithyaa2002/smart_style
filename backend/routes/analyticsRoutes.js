const express = require('express');
const router = express.Router();
const { getOverviewStats } = require('../controllers/analyticsController');

// Access: Private/Admin
router.get('/overview', getOverviewStats);

module.exports = router;
