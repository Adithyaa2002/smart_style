const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/smartstyle')
    .then(async () => {
        console.log("Connected to MongoDB for Gender Migration");

        const products = await Product.find({});
        console.log(`Found ${products.length} products to migrate.`);

        let updated = 0;
        for (const p of products) {
            let gender = "Unisex";
            const cat = p.category ? p.category.toLowerCase() : "";

            if (cat === "men") gender = "Men";
            else if (cat === "women" || cat === "saree" || cat === "western" || cat === "beauty") gender = "Women";
            else if (cat === "kids") gender = "Kids";

            // Update if different
            if (p.gender !== gender) {
                p.gender = gender;
                await p.save();
                updated++;
            }
        }

        console.log(`Updated gender for ${updated} products.`);
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
