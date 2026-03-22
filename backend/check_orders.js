const mongoose = require("mongoose");
const Order = require("./models/Order");

const checkOrders = async () => {
    try {
        const mongoURI = "mongodb://localhost:27017/smart_style";
        await mongoose.connect(mongoURI);
        const count = await Order.countDocuments();
        console.log(`Order Count: ${count}`);
        process.exit(0);
    } catch (err) {
        console.error("Connection failed");
        process.exit(1);
    }
};

checkOrders();
