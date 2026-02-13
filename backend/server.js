// server.js
require("dotenv").config();



const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes'); // <-- NEW
const orderRoutes = require("./routes/orderRoutes");

const customerRoutes = require("./routes/customerRoutes");
const vendorRoutes = require("./routes/vendorRoutes");




// Initialize express app
const app = express();

// Connect to database
connectDB();
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static("uploads"));
app.use("/api/vendor", vendorRoutes);
app.use("/api/orders", orderRoutes);
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes); // <-- NEW
app.use("/api/customer", customerRoutes);
app.use("/api/orders", orderRoutes);

// Admin Routes
const adminRoutes = require('./routes/adminRoutes');
app.use('/api', adminRoutes); // Mounts /api/analytics and /api/settings

const bannerRoutes = require('./routes/bannerRoutes');
app.use('/api/banners', bannerRoutes);

// ✅ Avatar Routes
app.use('/api/avatar', require('./routes/avatarRoutes'));

// Root Route (Friendly Message)
app.get('/', (req, res) => {
  res.send(`
    <h1>SmartStyle Backend is Running! 🚀</h1>
    <p>This is the API server. For the website, please visit: <a href="http://localhost:3000">http://localhost:3000</a></p>
  `);
});

// Test route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running successfully',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});
const fs = require("fs");
const path = require("path");

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log("📁 'uploads' folder created automatically.");
}

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
