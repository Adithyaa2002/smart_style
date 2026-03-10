const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const fixBrokenProduct = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // Find the product by name OR the broken link
        const brokenPath = '/uploads/1772939892764-maledrss.glb';
        const workingPath = '/uploads/1772616379226-maledrss.glb'; // This one exists

        const result = await Product.updateMany(
            { model3D: brokenPath },
            { $set: { model3D: workingPath } }
        );

        console.log(`Updated ${result.modifiedCount} products.`);
        mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};
fixBrokenProduct();
