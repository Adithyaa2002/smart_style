// backend/routes/customerRoutes.js
const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer"); // make sure model exists

// GET customer by email
router.get("/:email", async (req, res) => {
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

module.exports = router;
