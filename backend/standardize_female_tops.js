const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('./models/Product');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB.");

        // More inclusive list to ensure we catch everything top-related
        const topCategories = ["Tops", "Shirts", "T-Shirts", "Dresses", "Jackets", "Kurtas", "Sarees", "Topwear", "dress", "gown", "top"];

        // We'll search case-insensitively or just include generic terms
        const filter = {
            gender: { $in: ["Women", "female"] },
            $or: [
                { category: { $in: topCategories } },
                { name: /top|shirt|dress|gown/i }
            ]
        };

        const update = {
            $set: {
                adjustmentScale: 0.83,
                adjustmentX: 0.0,
                adjustmentY: 0.01,
                adjustmentZ: 0.2
            }
        };

        const products = await Product.find(filter);
        console.log(`Found ${products.length} products to standardize.`);

        const result = await Product.updateMany(filter, update);
        console.log(`Updated ${result.modifiedCount} products to 1.0 scale and 0.0 offsets.`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
