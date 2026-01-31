const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/smartstyle')
    .then(async () => {
        console.log("Connected to MongoDB for Category Logic");

        // 1. Check existing categories
        const categories = await Product.distinct('category');
        console.log('Current Distinct Categories:', categories);

        const validCategories = ["Men", "Women", "Kids", "Accessories", "Sale"];

        // 2. If no valid categories exist or many represent null/missing, randomize them for demo
        // Fetch all products
        const products = await Product.find({});

        let updatedCount = 0;
        for (const p of products) {
            // If category is missing or not in our valid list, assign a random one
            if (!p.category || !validCategories.includes(p.category)) {
                const randomCat = validCategories[Math.floor(Math.random() * validCategories.length)];
                p.category = randomCat;
                await p.save();
                updatedCount++;
            }
        }

        console.log(`Updated ${updatedCount} products with missing/invalid categories.`);

        const finalCategories = await Product.distinct('category');
        console.log('Final Distinct Categories:', finalCategories);

        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
