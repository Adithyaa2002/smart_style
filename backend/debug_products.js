const mongoose = require('mongoose');
const Product = require('./models/Product');
const dotenv = require('dotenv');
const path = require('path');

// Try loading from explicit path
const envPath = path.resolve(__dirname, '.env');
console.log("Loading .env from:", envPath);
dotenv.config({ path: envPath });
console.log("MONGO_URI:", process.env.MONGO_URI ? "Found" : "Not Found");

const checkProducts = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error("MONGO_URI is missing. Please check .env file.");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const products = await Product.find({});
        console.log(`Found ${products.length} products`);
        if (products.length > 0) {
            // Log the last product to see its structure
            console.log("Last product:", JSON.stringify(products[products.length - 1], null, 2));

            const brands = await Product.distinct("brand");
            console.log("Brands found:", brands);
        } else {
            console.log("No products found.");
        }

        mongoose.disconnect();
    } catch (error) {
        console.error("Error Detail:", error);
    }
};

checkProducts();
