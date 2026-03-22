const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: String, // email
      required: true,
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: String,
        price: Number,
        quantity: Number,
        image: String,
        vendorId: String, // Snapshot of vendor at purchase time
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      default: "Pending", // Pending, Processing, Shipped, Delivered, Cancelled
    },

    paymentStatus: {
      type: String,
      default: "Pending", // Pending, Paid, Failed
    },

    paymentMethod: {
      type: String,
      enum: ["upi", "card", "cod", "net_banking", "unknown", "online"],
      default: "unknown",
    },

    razorpay_payment_id: {
      type: String,
    },

    razorpay_order_id: {
      type: String,
    },

    shippingAddress: {
      type: String, // Simplified for now
      default: "",
    },
  },
  { timestamps: true } // adds createdAt + updatedAt automatically
);

module.exports = mongoose.model("Order", orderSchema);
