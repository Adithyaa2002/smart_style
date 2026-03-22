const User = require('../models/User');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { sendOTP } = require('../utils/brevo');
const crypto = require('crypto');

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
    const { name, password, role = 'customer' } = req.body;
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';

    console.log('--- SIGNUP ATTEMPT ---');
    console.log('Processed Email:', `"${email}"`);
    console.log('Role:', role);


    // Check DB connection for normal signup
    if (mongoose.connection.readyState !== 1) {
      console.log("❌ DB is offline. Cannot register:", email);
      return res.status(503).json({
        success: false,
        message: 'Database is offline. Sign-up is currently disabled for new users.'
      });
    }

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
      role,
      isVerified: false // Explicitly set to false until OTP verification
    });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();
    console.log('User registered (unverified):', email);

    // Send OTP via Brevo
    await sendOTP(user.email, otp);

    res.status(201).json({
      success: true,
      message: 'OTP sent to your email. Please verify to complete registration.',
      email: user.email
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
    const { password } = req.body;
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';

    console.log('--- LOGIN ATTEMPT ---');
    console.log('Processed Email:', `"${email}"`);

    // Hardcoded admin check
    if (email === 'admin@smartstyle.com' && (password === '123456' || password === 'admin123')) {
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

    // Check DB connection for non-admin login
    if (mongoose.connection.readyState !== 1) {
      console.log("❌ DB is offline. Cannot verify user:", email);
      return res.status(503).json({
        success: false,
        message: 'Database is offline. Only Hardcoded accounts can login.'
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

    // Check if user is verified
    if (!user.isVerified) {
      console.log("❌ User not verified:", email);

      // Resend OTP if not verified? (Optional, let's just inform for now)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp;
      user.otpExpires = Date.now() + 10 * 60 * 1000;
      await user.save();
      await sendOTP(user.email, otp);

      return res.status(401).json({
        success: false,
        isUnverified: true,
        message: 'Email not verified. A new OTP has been sent.',
        email: user.email
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

    // Generate direct token for verified users
    const token = generateToken(user._id);

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

// @desc    Verify OTP and finalize login
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email,
      otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Clear OTP after successful verification and set isVerified
    user.otp = undefined;
    user.otpExpires = undefined;
    user.isVerified = true;
    await user.save();

    // Generate final token
    const token = generateToken(user._id);

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
    console.error('OTP Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification'
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

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token and save to database
    user.resetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();
    
    console.log(`[Forgot Password] Token Sent: ${resetToken}`);
    console.log(`[Forgot Password] Token Expiry: ${new Date(user.resetTokenExpiry).toISOString()}`);

    // Create reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    // Send the password reset email
    const { sendPasswordResetEmail } = require('../utils/brevo');
    await sendPasswordResetEmail(email, resetUrl);

    res.status(200).json({ success: true, message: 'Email sent' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Verify Reset Token
// @route   GET /api/auth/verify-reset-token/:token
// @access  Public
const verifyResetToken = async (req, res) => {
  try {
    const crypto = require('crypto');
    const incomingToken = req.params.token;
    console.log(`[Verify Token] Token Received: ${incomingToken}`);
    
    const resetTokenHash = crypto.createHash('sha256').update(incomingToken).digest('hex');

    const user = await User.findOne({
      resetToken: resetTokenHash,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset link' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const crypto = require('crypto');
    console.log(`[Reset Password] Token Received: ${token}`);
    
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetToken: resetTokenHash,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Change Password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  signup,
  login,
  getMe,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changePassword,
  verifyOTP
};