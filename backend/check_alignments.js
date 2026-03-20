const mongoose = require('mongoose');
const Product = require('./models/Product');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const products = await Product.find({}, 'name category gender adjustmentScale adjustmentX adjustmentY adjustmentZ');
        console.log("ALIGMENTS_START");
        products.forEach(p => {
            console.log(`Product: ${p.name} | Cat: ${p.category} | Gen: ${p.gender} | Scale: ${p.adjustmentScale} | X: ${p.adjustmentX} | Y: ${p.adjustmentY} | Z: ${p.adjustmentZ}`);
        });
        console.log("ALIGMENTS_END");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
