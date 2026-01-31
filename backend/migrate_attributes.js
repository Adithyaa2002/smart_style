const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/smartstyle')
    .then(async () => {
        console.log("Connected to MongoDB for Attribute Migration");

        // Random brands
        const brands = ["Nike", "Adidas", "Puma", "Zara", "H&M", "FabIndia", "Allen Solly"];

        const products = await Product.find({});
        console.log(`Found ${products.length} products.`);

        for (const p of products) {
            // Assign random brand if missing
            if (!p.brand) {
                p.brand = brands[Math.floor(Math.random() * brands.length)];
            }

            // Assign random rating (between 3.5 and 5.0) if missing
            if (!p.rating) {
                // Random decimal between 3.5 and 5
                const r = (Math.random() * (5.0 - 3.5) + 3.5).toFixed(1);
                p.rating = Number(r);
            }

            await p.save();
        }

        console.log("Migration complete.");
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
