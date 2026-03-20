const mongoose = require('mongoose');
const Product = require('./models/Product');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const products = await Product.find({ gender: "Women" });
        console.log(`Found ${products.length} women's products.`);
        products.forEach(p => {
            console.log(`[${p.category}] ${p.name}: Scale=${p.adjustmentScale}, X=${p.adjustmentX}, Y=${p.adjustmentY}, Z=${p.adjustmentZ}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
