const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const findBrokenProduct = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const products = await Product.find({ model3D: { $regex: '1772939892764-maledrss.glb' } });
        console.log("Found products:", JSON.stringify(products, null, 2));
        mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};
findBrokenProduct();
