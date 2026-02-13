const express = require("express");
const Vendor = require("../models/Vendor");
const router = express.Router();

router.get("/:email", async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ email: req.params.email });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:email", async (req, res) => {
  try {
    const vendor = await Vendor.findOneAndUpdate(
      { email: req.params.email },
      req.body,
      { new: true, upsert: true }
    );
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const Product = require("../models/Product");
const Order = require("../models/Order");

// ... existing routes ...

// --------------------- ANALYTICS ---------------------
router.get("/analytics/:email", async (req, res) => {
  try {
    const vendorEmail = req.params.email;

    // 1. Find all products belonging to this vendor
    const vendorProducts = await Product.find({ vendorId: vendorEmail });
    const vendorProductIds = vendorProducts.map(p => p._id.toString());

    // 2. Find orders (legacy product ID or new vendorId)
    const orders = await Order.find({
      $or: [
        { "items.productId": { $in: vendorProductIds } },
        { "items.vendorId": vendorEmail }
      ]
    }).sort({ createdAt: 1 }); // Sort strictly ascending for chart data

    let totalRevenue = 0;      // Life-time GMV
    let completedRevenue = 0;  // Delivered orders (Realized)
    let pendingRevenue = 0;    // Active orders (Not yet delivered)
    let productsSold = 0;

    // Monthly Sales Map (e.g., "Jan 2024": 5000)
    const monthlySales = {};
    const productSalesMap = {};

    orders.forEach(order => {
      // SKIP Cancelled or Refunded orders completely
      if (order.status === 'Cancelled' || order.status === 'Refunded') return;

      const orderDate = new Date(order.createdAt);
      const monthKey = orderDate.toLocaleString('default', { month: 'short', year: 'numeric' });

      order.items.forEach(item => {
        // Only count items that belong to THIS vendor
        if (vendorProductIds.includes(item.productId.toString()) || item.vendorId === vendorEmail) {
          const qty = item.quantity || 1;
          const rev = (item.price || 0) * qty;

          totalRevenue += rev;
          productsSold += qty;

          // Split Revenue by Status
          if (order.status === 'Delivered') {
            completedRevenue += rev;
          } else {
            pendingRevenue += rev;
          }

          // Monthly Aggregation
          monthlySales[monthKey] = (monthlySales[monthKey] || 0) + rev;

          // Track per-product stats
          // Use name as grouping key if possible
          const pKey = item.name || item.productId.toString();
          if (!productSalesMap[pKey]) {
            productSalesMap[pKey] = {
              name: item.name,
              quantity: 0,
              revenue: 0,
              image: item.image
            };
          }
          productSalesMap[pKey].quantity += qty;
          productSalesMap[pKey].revenue += rev;
        }
      });
    });

    // 3. Process Data for Frontend
    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Convert monthly map to array (Last 6 months)
    const labels = [];
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      labels.push(key);
      data.push(monthlySales[key] || 0);
    }

    // 4. Generate Recent Transactions Ledger (Derived from Orders)
    const transactions = [];
    // Process orders in reverse (newest first) for the ledger
    [...orders].reverse().slice(0, 10).forEach(order => {
      // Calculate vendor's share in this specific order
      let orderShare = 0;
      order.items.forEach(item => {
        if (vendorProductIds.includes(item.productId.toString()) || item.vendorId === vendorEmail) {
          orderShare += (item.price || 0) * (item.quantity || 1);
        }
      });

      if (orderShare > 0) {
        transactions.push({
          date: order.createdAt,
          description: `Order Revenue - #${order._id.toString().slice(-6).toUpperCase()}`,
          amount: orderShare,
          type: 'credit',
          status: order.status === 'Delivered' ? 'Completed' : 'Pending'
        });
      }
    });

    res.json({
      totalRevenue,
      completedRevenue, // Available for payout (roughly)
      pendingRevenue,   // Locked
      totalOrders: orders.length,
      productsSold,
      topProducts,
      salesGraph: { labels, data },
      transactions // New field
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------- GET VENDOR ORDERS ---------------------
router.get("/orders/:email", async (req, res) => {
  try {
    const vendorEmail = req.params.email;

    // 1. Find all products by this vendor
    console.log(`🔍 Fetching orders for vendor: ${vendorEmail}`);

    // FETCH VENDOR PROFILE to get variations of ID (Name, ShopName)
    const vendorProfile = await Vendor.findOne({ email: vendorEmail });
    const searchCriteria = [{ vendorId: vendorEmail }];
    if (vendorProfile) {
      if (vendorProfile.name) searchCriteria.push({ vendorId: vendorProfile.name });
      if (vendorProfile.shopName) searchCriteria.push({ vendorId: vendorProfile.shopName });
    }

    const vendorProducts = await Product.find({ $or: searchCriteria });
    console.log(`📦 Found ${vendorProducts.length} products for this vendor (Criteria: ${JSON.stringify(searchCriteria)})`);

    const vendorProductIds = vendorProducts.map(p => p._id.toString());
    console.log(`🆔 Product IDs:`, vendorProductIds);

    // 2. Find orders containing these products OR explicitly tagged with vendorId
    // EVEN IF vendorProducts is empty, we still search for orders by vendorId directly
    const orders = await Order.find({
      $or: [
        { "items.productId": { $in: vendorProductIds } },
        { "items.vendorId": vendorEmail }
      ]
    }).sort({ createdAt: -1 });

    console.log(`🛒 Found ${orders.length} matching orders.`);

    // 3. Filter items in each order to ONLY show this vendor's products
    // (We don't want Vendor A to see Vendor B's items in the same cart order)
    const vendorOrders = orders.map(order => {
      const myItems = order.items.filter(item =>
        vendorProductIds.includes(item.productId.toString()) ||
        item.vendorId === vendorEmail
      );

      return {
        _id: order._id,
        createdAt: order.createdAt,
        status: order.status,
        customerAddress: order.shippingAddress,
        items: myItems,
        // Calculate total only for MY items
        totalData: myItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
      };
    });

    res.json(vendorOrders);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
