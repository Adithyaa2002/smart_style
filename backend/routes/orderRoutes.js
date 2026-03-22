const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");

// ✅ PLACE ORDER + AUTO STOCK REDUCTION
router.post("/", async (req, res) => {
  try {
    const { customerId, items, totalAmount, paymentStatus, paymentMethod, shippingAddress } = req.body;

    // 1️⃣ Validate Stock & Enrich Items with Vendor ID
    const enrichedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.name}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }

      // Store product temporarily to update stock later
      item.productRef = product;

      // Add to enriched items
      enrichedItems.push({
        ...item,
        vendorId: product.vendorId // Capture vendor ID
      });
    }

    // 2️⃣ Save Order
    const order = new Order({
      customerId,
      items: enrichedItems,
      totalAmount,
      paymentStatus,
      paymentMethod,
      shippingAddress
    });

    await order.save();

    // 3️⃣ Reduce Stock
    for (const item of items) {
      const product = item.productRef;
      product.stock -= item.quantity;
      await product.save();
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to place order" });
  }
});

// ✅ GET ALL ORDERS (ADMIN)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();

    // Resolve names manually since customerId is a string email rather than an ObjectId ref
    const User = require("../models/User");
    const enhancedOrders = await Promise.all(orders.map(async (order) => {
      const user = await User.findOne({ email: order.customerId }).select('name').lean();
      return {
        ...order,
        customerName: user ? user.name : "Unknown User"
      };
    }));

    res.json(enhancedOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET ORDERS BY CUSTOMER
router.get("/customer/:email", async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.params.email }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET SINGLE ORDER BY ID
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ UPDATE ORDER STATUS (ADMIN)
router.patch("/:id", async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, paymentStatus },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
