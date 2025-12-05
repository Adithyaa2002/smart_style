const express = require('express');
const {
  signup,
  login,
  getMe
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

// Protected routes
router.get('/me', authMiddleware, getMe);

module.exports = router;