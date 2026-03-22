const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");

let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        console.log("✅ Razorpay Initialized");
    } catch (err) {
        console.error("❌ Razorpay Init Error:", err.message);
    }
} else {
    console.warn("⚠️ Razorpay Keys missing from .env. Payment features will be disabled.");
}

// ✅ CREATE ORDER
router.post("/create-order", async (req, res) => {
    try {
        const { amount, currency } = req.body;

        const options = {
            amount: amount * 100, // amount in the smallest currency unit (paise for INR)
            currency: currency || "INR",
            receipt: `receipt_${Date.now()}`,
        };

        if (!razorpay) {
            return res.status(500).json({ success: false, message: "Razorpay is not configured on this server" });
        }
        const order = await razorpay.orders.create(options);

        res.status(200).json({
            success: true,
            order,
            key_id: process.env.RAZORPAY_KEY_ID // Send key to frontend
        });
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(500).json({ success: false, message: "Could not create order" });
    }
});

// ✅ VERIFY PAYMENT
router.post("/verify", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        console.log("DEBUG: Verification Data Received:", { razorpay_order_id, razorpay_payment_id });

        const secret = process.env.RAZORPAY_KEY_SECRET;
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", secret)
            .update(sign.toString())
            .digest("hex");

        console.log("DEBUG: Signature Comparison", {
            received: razorpay_signature,
            generated: expectedSign,
            isMatch: razorpay_signature === expectedSign,
            secretLength: secret ? secret.length : 0
        });

        if (razorpay_signature === expectedSign) {
            console.log("DEBUG: Verification SUCCESSFUL");
            return res.status(200).json({ success: true, message: "Payment verified successfully" });
        } else {
            console.error("DEBUG: Verification FAILED - Signature mismatch");
            return res.status(400).json({ success: false, message: "Invalid signature" });
        }
    } catch (error) {
        console.error("Razorpay Verify Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

module.exports = router;
