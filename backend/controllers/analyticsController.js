const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');

// @desc    Get dashboard overview stats
// @route   GET /api/analytics/overview
// @access  Private/Admin
exports.getOverviewStats = async (req, res) => {
    try {
        console.log('📊 Fetching Dashboard Analytics...');

        // 1. Basic Stats
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();

        console.log(`Found: ${totalUsers} Users, ${totalProducts} Products, ${totalOrders} Orders`);

        // GMV: Including all orders for visibility
        const revenueResult = await Order.aggregate([
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        // 2. Sales Metrics
        const rawSalesMetrics = await Order.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
        ]);

        // 3. Revenue Trend (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const revenueTrend = await Order.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    amount: { $sum: "$totalAmount" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // 4. User Analytics
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newUsersCount = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

        // 5. Recent Orders
        const orders = await Order.find().sort({ createdAt: -1 }).limit(5);

        console.log(`Sending response with ${orders.length} recent orders`);

        res.json({
            success: true,
            data: {
                totalStats: {
                    totalUsers,
                    totalProducts,
                    totalOrders,
                    totalRevenue: `₹${totalRevenue.toLocaleString()}`
                },
                salesMetrics: rawSalesMetrics.map(m => ({
                    label: m._id || 'Pending',
                    value: `₹${m.revenue.toLocaleString()}`,
                    count: m.count
                })),
                userAnalytics: {
                    total: totalUsers,
                    new: newUsersCount,
                    returning: Math.max(0, totalUsers - newUsersCount)
                },
                recentOrders: orders.map(o => ({
                    id: `#ORD-${o._id.toString().slice(-4).toUpperCase()}`,
                    customer: o.customerId || 'Guest',
                    status: o.status || 'Pending',
                    amount: `₹${(o.totalAmount || 0).toLocaleString()}`,
                    date: new Date(o.createdAt).toLocaleDateString()
                }))
            }
        });

    } catch (error) {
        console.error('❌ Analytics Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics data',
            error: error.message
        });
    }
};
