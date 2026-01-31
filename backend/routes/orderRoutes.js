const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");

// ✅ PLACE ORDER + AUTO STOCK REDUCTION
router.post("/", async (req, res) => {
  try {
    const { customerId, items, totalAmount, paymentStatus, shippingAddress } = req.body;

    // 1️⃣ Save order
    const order = new Order({
      customerId,
      items,
      totalAmount,
      paymentStatus,
      shippingAddress
    });

    await order.save();

    // 2️⃣ Reduce stock for each product
    for (let item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Prevent negative stock
      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`,
        });
      }

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

// ✅ GET ORDERS BY CUSTOMER
router.get("/customer/:email", async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.params.email }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
