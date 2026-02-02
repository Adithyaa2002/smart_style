const {
  signup,
  login,
  getMe,
  forgotPassword,
  verifyResetToken,
  resetPassword
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

// Password Reset Routes
router.post('/forgot-password', forgotPassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', authMiddleware, getMe);

module.exports = router;