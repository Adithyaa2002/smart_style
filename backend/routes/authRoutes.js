const express = require('express');
const {
  signup,
  login,
  getMe,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changePassword,
  verifyOTP
} = require('../controllers/authController');
const {
  validateSignup,
  validateLogin,
  handleValidationErrors
} = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/signup', validateSignup, handleValidationErrors, signup);
router.post('/login', validateLogin, handleValidationErrors, login);
router.post('/verify-otp', verifyOTP);

// Password Reset Routes
router.post('/forgot-password', forgotPassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', authMiddleware, getMe);
router.put('/change-password', authMiddleware, changePassword);

// ✅ GET ALL USERS (Admin)
router.get('/users', async (req, res) => {
  try {
    const User = require('../models/User'); // Lazy load to avoid circular issues
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;