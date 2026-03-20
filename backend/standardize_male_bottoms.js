const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('./models/Product');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB.");

        // More inclusive list for male bottomwear
        const filter = {
            gender: { $in: ["Men", "male", "Unisex"] },
            $or: [
                { category: { $in: ["Bottomwear", "Bottoms", "Jeans", "Trousers", "Pants", "Shorts", "bottomwear", "bottoms", "jeans", "trousers", "pants", "shorts"] } },
                { name: /pant|jeans|trouser|short|bottom/i }
            ]
        };

        const update = {
            $set: {
                adjustmentScale: 0.94,
                adjustmentX: -0.01,
                adjustmentY: 0.0,
                adjustmentZ: 0.0
            }
        };

        const products = await Product.find(filter);
        console.log(`Found ${products.length} male/unisex bottomwear products to standardize.`);

        const result = await Product.updateMany(filter, update);
        console.log(`Updated ${result.modifiedCount} products to 1.0 scale and 0.0 offsets.`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
