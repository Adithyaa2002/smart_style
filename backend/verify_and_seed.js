const mongoose = require('mongoose');
const Product = require('./models/Product'); // Ensure path is correct

mongoose.connect('mongodb://localhost:27017/smartstyle')
    .then(async () => {
        console.log("Connected to MongoDB");

        // Check for cheap products
        const count = await Product.countDocuments({ price: { $lte: 500 } });
        console.log(`Products under 500: ${count}`);

        if (count === 0) {
            console.log("Creating dummy cheap product...");
            await Product.create({
                name: "Test Cheap Item",
                price: 199,
                category: "Accessories", // Ensure it matches a category
                stock: 100,
                image: "https://via.placeholder.com/200",
                description: "A test item for filtering"
            });
            console.log("Created 'Test Cheap Item' at 199");
        }

        // Update ANY product with string price to number
        const allProducts = await Product.find({});
        for (let p of allProducts) {
            if (typeof p.price === 'string') {
                p.price = Number(p.price);
                await p.save();
                console.log(`Converted price for ${p.name}`);
            }
        }

        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
