const mongoose = require('mongoose');
const Product = require('./models/Product');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const products = await Product.find({});
        console.log(`Found ${products.length} products total.`);
        products.forEach(p => {
            console.log(`- [${p.gender}] [${p.category}] ${p.name}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
