// backend/routes/customerRoutes.js
const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer"); // make sure model exists
const mongoose = require("mongoose");

// Helper to check if DB is offline
const isOffline = () => mongoose.connection.readyState !== 1;

// GET customer by email
router.get("/:email", async (req, res) => {
  const email = decodeURIComponent(req.params.email);

  // ✅ OFFLINE ADMIN BYPASS
  if (isOffline() && email === 'admin@smartstyle.com') {
    return res.json({
      _id: 'admin',
      userId: 'admin',
      name: 'Admin User (Offline)',
      email: 'admin@smartstyle.com',
      role: 'admin',
      measurements: { height: "180", weight: "75", chest: "40", waist: "32", hips: "38" }
    });
  }

  // ✅ FAST FAIL IF OFFLINE
  if (isOffline()) {
    return res.status(503).json({ error: "Database is offline. Only Admin profile is accessible." });
  }

  try {
    const email = decodeURIComponent(req.params.email);
    const customer = await Customer.findOne({ email });
    if (!customer) return res.status(404).json(null);
    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

// Explicit Find or Create Logic
router.put("/:email", async (req, res) => {
  console.log("📥 Recieved Profile Update Request (Explicit)");
  const emailParam = decodeURIComponent(req.params.email);
  console.log("PARAMS email:", emailParam);

  // ✅ OFFLINE CHECK
  if (isOffline()) {
    return res.status(503).json({ error: "Database is offline. Profiles cannot be updated." });
  }

  try {
    let customer = await Customer.findOne({ email: emailParam });

    if (customer) {
      console.log("✅ Customer found. Updating...");
      // Update existing fields
      Object.assign(customer, req.body);
      const updated = await customer.save();
      return res.json(updated);
    } else {
      console.log("⚠️ Customer not found. Creating new...");
      // Create new
      // Ensure userId exists
      if (!req.body.userId) {
        return res.status(400).json({ error: "Cannot create profile: Missing userId" });
      }

      const newCustomer = new Customer({
        ...req.body,
        email: emailParam // Ensure email matches param
      });

      const saved = await newCustomer.save();
      console.log("✅ New Customer Saved:", saved);
      return res.json(saved);
    }

  } catch (err) {
    console.error("❌ Profile Update Error Details:", err);
    res.status(500).json({ error: "Failed to update profile", details: err.message });
  }
});

// ADD TRY-ON HISTORY
router.post("/:email/tryon", async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const { productId, productName, productImage, userId } = req.body;
  console.log(`📑 Attempting to add try-on history for ${email}. Product: ${productName} (${productId})`);

  try {
    let customer = await Customer.findOne({ email });
    if (!customer) {
      console.log(`👤 Customer profile not found for ${email}. Auto-creating with userId: ${userId}`);
      if (!userId) return res.status(404).json({ error: "Customer not found and no userId provided" });
      customer = new Customer({ email, userId });
    }

    // Check if distinct product
    const existingIdx = customer.tryOnHistory ? customer.tryOnHistory.findIndex(h => h.productId && h.productId.toString() === productId) : -1;

    if (existingIdx > -1) {
      // Move to top
      customer.tryOnHistory.splice(existingIdx, 1);
    }

    if (!customer.tryOnHistory) customer.tryOnHistory = [];

    // Add to top
    customer.tryOnHistory.unshift({ productId, productName, productImage });

    // Limit history
    if (customer.tryOnHistory.length > 20) customer.tryOnHistory.pop();

    await customer.save();
    console.log(`✅ Try-on history updated for ${email}. Total items: ${customer.tryOnHistory.length}`);
    res.json(customer.tryOnHistory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
// CLEAR TRY-ON HISTORY
router.delete("/:email/tryon", async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  try {
    const customer = await Customer.findOne({ email });
    if (!customer) return res.json({ success: true, message: "Nothing to clear, customer not found" });

    customer.tryOnHistory = [];
    await customer.save();
    res.json({ success: true, message: "Try-on history cleared" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// REMOVE SINGLE TRY-ON HISTORY ITEM
router.delete("/:email/tryon/:productId", async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const productId = req.params.productId;
  try {
    const customer = await Customer.findOne({ email });
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

    customer.tryOnHistory = customer.tryOnHistory.filter(h => h.productId !== productId);
    await customer.save();
    res.json({ success: true, message: "Try-on item removed", tryOnHistory: customer.tryOnHistory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
