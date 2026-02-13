const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Order = require('./models/Order');
const Product = require('./models/Product');

const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("Connected DB");

        console.log("--- LATEST 5 ORDERS ---");
        const orders = await Order.find({}).sort({ createdAt: -1 }).limit(5);

        for (const o of orders) {
            console.log(`\nOrder ID: ${o._id}`);
            console.log(`Created At: ${o.createdAt}`);
            console.log(`Customer: ${o.customerId}`);
            console.log(`Items count: ${o.items.length}`);

            for (const item of o.items) {
                console.log(`  - Item: ${item.name}`);
                console.log(`    ProductID: ${item.productId}`);
                console.log(`    VendorID in Item: ${item.vendorId || 'MISSING'}`);

                // Check if product exists in DB
                const p = await Product.findById(item.productId);
                console.log(`    Product exists in DB?: ${p ? 'YES' : 'NO'}`);
                if (p) {
                    console.log(`    Product VendorID: ${p.vendorId}`);
                }
            }
        }

        process.exit();
    })
    .catch(err => console.error(err));
