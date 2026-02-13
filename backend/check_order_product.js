const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('./models/Product');
const Order = require('./models/Order');

const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        const orderId = "69809fdec252539587e8cdb5"; // from previous output
        const order = await Order.findById(orderId);
        if (!order) {
            console.log("Order not found");
            process.exit();
        }

        console.log("Order Items:");
        for (let item of order.items) {
            const pid = item.productId;
            const p = await Product.findById(pid);
            console.log(`- Item Name: ${item.name}`);
            console.log(`  ProdID: ${pid}`);
            console.log(`  Exists in DB? ${p ? "YES" : "NO"}`);
            if (p) {
                console.log(`  VendorId: ${p.vendorId}`);
            }
        }
        process.exit();
    })
    .catch(err => console.error(err));
