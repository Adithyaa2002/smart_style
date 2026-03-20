const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('./models/Product');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB.");

        const filter = {
            gender: { $in: ["Men", "male", "Unisex"] },
            $or: [
                { category: { $in: ["Tops", "Shirts", "T-Shirts", "Jackets", "Kurtas", "Topwear", "top"] } },
                { name: /top|shirt|jacket|kurta/i }
            ]
        };

        const update = {
            $set: {
               adjustmentScale: 1.10,
                adjustmentX: 0.0,
                adjustmentY: -0.03,
                adjustmentZ: 0.0
            }
        };

        const result = await Product.updateMany(filter, update);
        console.log(`Updated ${result.modifiedCount} male topwear products to the new standard baseline.`);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
