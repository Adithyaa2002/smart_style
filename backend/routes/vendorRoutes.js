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
    // We assume vendorId in Product matches the vendor's email (as stored in frontend)
    const vendorProducts = await Product.find({ vendorId: vendorEmail });
    const vendorProductIds = vendorProducts.map(p => p._id.toString());

    if (vendorProducts.length === 0) {
      return res.json({
        totalRevenue: 0,
        totalOrders: 0,
        productsSold: 0,
        topProducts: []
      });
    }

    // 2. Find all orders that contain ANY of these products
    const orders = await Order.find({
      "items.productId": { $in: vendorProductIds }
    });

    let totalRevenue = 0;
    let productsSold = 0;
    const productSalesMap = {}; // { productId: { name, quantity, revenue } }

    orders.forEach(order => {
      order.items.forEach(item => {
        // Only count items that belong to THIS vendor
        if (vendorProductIds.includes(item.productId.toString())) {
          const qty = item.quantity || 1;
          const rev = (item.price || 0) * qty;

          totalRevenue += rev;
          productsSold += qty;

          // Track per-product stats
          const pId = item.productId.toString();
          if (!productSalesMap[pId]) {
            productSalesMap[pId] = {
              name: item.name,
              quantity: 0,
              revenue: 0
            };
          }
          productSalesMap[pId].quantity += qty;
          productSalesMap[pId].revenue += rev;
        }
      });
    });

    // 3. Sort top products
    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.json({
      totalRevenue,
      totalOrders: orders.length, // Count of unique orders containing vendor items
      productsSold,
      topProducts
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
