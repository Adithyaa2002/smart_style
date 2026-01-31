const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  try {
    const { name, email, password, role = 'customer' } = req.body;

    console.log('Signup attempt for:', email, 'Role:', role);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role
    });

    await user.save();
    console.log('User registered successfully:', email);

    // Auto-login: Generate token immediately
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔐 Login attempt for:", email);

    // Hardcoded admin check
    if (email === 'admin@smartstyle.com' && password === 'admin123') {
      console.log("✅ Admin login successful");
      const adminUser = {
        _id: 'admin',
        name: 'Admin',
        email: 'admin@smartstyle.com',
        role: 'admin'
      };

      const token = generateToken(adminUser._id);

      return res.json({
        success: true,
        message: 'Admin login successful',
        token,
        user: adminUser
      });
    }

    // Find user by email
    console.log("🔍 Searching for user in database...");
    const user = await User.findOne({ email });

    if (!user) {
      console.log("❌ User not found in database:", email);
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify Password
    console.log("🔒 Comparing passwords...");
    const isPasswordValid = await user.comparePassword(password);
    console.log("🔑 Password validation result:", isPasswordValid);

    if (!isPasswordValid) {
      console.log("❌ Password incorrect for user:", email);
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    console.log("🎫 Generating JWT token...");
    const token = generateToken(user._id);
    console.log("✅ Login successful for:", email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  signup,
  login,
  getMe
};