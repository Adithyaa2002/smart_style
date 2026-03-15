const mongoose = require('mongoose');
const Product = require('./models/Product');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const products = await Product.find({}, 'name vendorId category');
        console.log("PRODUCTS_LIST_START");
        products.forEach(p => {
            console.log(`Product: ${p.name} | Vendor: ${p.vendorId} | Cat: ${p.category}`);
        });
        console.log("PRODUCTS_LIST_END");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
