const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/smartstyle')
    .then(async () => {
        console.log("Connected to MongoDB...");
        const products = await Product.find({});
        console.log(`Found ${products.length} products.`);

        for (const p of products) {
            // Ensure price is a number
            if (typeof p.price !== 'number') {
                p.price = Number(p.price);
                await p.save();
                console.log(`Fixed price type for: ${p.name}`);
            }
        }

        // Force one item to be cheap (Under 500) if none exist
        const cheapProduct = products.find(p => p.price <= 500);
        if (!cheapProduct && products.length > 0) {
            products[0].price = 450;
            await products[0].save();
            console.log(`UPDATED: Set '${products[0].name}' to ₹450 for testing.`);
        } else if (cheapProduct) {
            console.log(`Found existing cheap product: ${cheapProduct.name} at ₹${cheapProduct.price}`);
        }

        console.log("Done.");
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
