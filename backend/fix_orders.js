const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('./models/Product');
const Order = require('./models/Order');

const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("Connected DB. Scanning orders...");

        const orders = await Order.find({});
        let updatedCount = 0;

        for (const order of orders) {
            let orderChanged = false;
            for (const item of order.items) {
                if (!item.vendorId) {
                    // Try to find product
                    const p = await Product.findById(item.productId);
                    if (p && p.vendorId) {
                        item.vendorId = p.vendorId;
                        orderChanged = true;
                        console.log(`Fixed Item: ${item.name} -> Vendor: ${p.vendorId}`);
                    }
                }
            }
            if (orderChanged) {
                await order.save();
                updatedCount++;
            }
        }

        console.log(`Done. Updated ${updatedCount} orders.`);
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
