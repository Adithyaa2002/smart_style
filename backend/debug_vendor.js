const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Vendor = require('./models/Vendor');

const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("Connected DB");

        console.log("--- VENDORS ---");
        const vendors = await Vendor.find({});
        vendors.forEach(v => console.log(`Email: ${v.email}, Name: ${v.name}, Shop: ${v.shopName}`));

        console.log("\n--- PRODUCTS (Sample 10) ---");
        const products = await Product.find({}).limit(10);
        products.forEach(p => console.log(`ID: ${p._id}, Name: ${p.name}, VendorId: ${p.vendorId}`));

        // Group products by vendorId
        const productsByVendor = await Product.aggregate([
            { $group: { _id: "$vendorId", count: { $sum: 1 } } }
        ]);
        console.log("\n--- PRODUCT COUNTS BY VENDORID ---");
        console.log(productsByVendor);

        console.log("\n--- ORDERS (Sample 5) ---");
        const orders = await Order.find({}).limit(5);
        orders.forEach(o => {
            console.log(`Order: ${o._id}, Items: ${o.items.length}`);
            o.items.forEach(i => console.log(`  - ProdID: ${i.productId}, Name: ${i.name}`));
        });

        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
