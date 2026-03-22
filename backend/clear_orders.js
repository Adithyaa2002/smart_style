require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("./models/Order");

const clearOrders = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI not found in environment variables");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        const result = await Order.deleteMany({});
        console.log(`Successfully cleared orders. Deleted ${result.deletedCount} orders.`);
        process.exit(0);
    } catch (err) {
        console.error("Failed to clear orders:", err.message);
        process.exit(1);
    }
};

clearOrders();
