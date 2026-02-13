const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// In-memory settings store (reset on restart, which is fine for now)
let storeSettings = {
    maintenanceMode: false,
    helpline: '+91 1800-SMART-STYLE',
    officialEmail: 'support@smartstyle.com'
};

// @desc    Get Admin Analytics Overview
// @route   GET /api/analytics/overview
router.get('/analytics/overview', async (req, res) => {
    try {
        // Calculate real stats
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();

        // Calculate Revenue
        const allOrders = await Order.find({ status: { $ne: 'Cancelled' } });
        const totalRevenue = allOrders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);

        // Formatted Revenue
        const revenueString = `₹${totalRevenue.toLocaleString()}`;

        // Get Recent Orders
        const recentOrdersRaw = await Order.find().sort({ createdAt: -1 }).limit(5);
        const recentOrders = recentOrdersRaw.map(order => ({
            id: `RD-${order._id.toString().slice(-6).toUpperCase()}`,
            customer: order.customerId,
            status: order.status || 'Pending',
            amount: `₹${order.totalAmount}`,
            date: new Date(order.createdAt).toLocaleDateString()
        }));

        // Mock Inventory Alerts (Real stock check)
        // We could fetch real low stock items too
        // const lowStockProducts = await Product.find({ stock: { $lt: 5 } }).limit(5);

        res.json({
            success: true,
            data: {
                totalStats: {
                    totalUsers,
                    totalProducts,
                    totalOrders,
                    totalRevenue: revenueString
                },
                recentOrders,
                userAnalytics: {
                    new: 12, // Mock
                    returning: totalUsers - 12
                }
            }
        });
    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// @desc    Get Store Settings
// @route   GET /api/settings
router.get('/settings', (req, res) => {
    res.json(storeSettings);
});

// @desc    Update Store Settings
// @route   POST /api/settings
router.post('/settings', (req, res) => {
    storeSettings = { ...storeSettings, ...req.body };
    res.json({ success: true, settings: storeSettings });
});

// @desc    Get All Reviews (Aggregated)
// @route   GET /api/reviews/all
router.get('/reviews/all', async (req, res) => {
    try {
        const products = await Product.find({ 'reviews.0': { $exists: true } }).select('name image reviews');
        let allReviews = [];
        products.forEach(p => {
            p.reviews.forEach(r => {
                allReviews.push({
                    productId: p._id,
                    productName: p.name,
                    productImage: p.image,
                    reviewId: r._id,
                    user: r.name, // Assuming review object has name
                    rating: r.rating,
                    comment: r.comment,
                    date: r.createdAt
                });
            });
        });
        // Sort by newest
        allReviews.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(allReviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Delete a Review
// @route   DELETE /api/reviews/:productId/:reviewId
router.delete('/reviews/:productId/:reviewId', async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        // Filter out the review
        product.reviews = product.reviews.filter(r => r._id.toString() !== req.params.reviewId);

        // Recalculate rating
        if (product.reviews.length > 0) {
            product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;
        } else {
            product.rating = 0;
        }

        await product.save();
        res.json({ message: 'Review deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
