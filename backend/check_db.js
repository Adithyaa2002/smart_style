
const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/Home/Desktop/smart_style/backend/.env' });

const ProductSchema = new mongoose.Schema({
    name: String,
    model3D: String
});

const Product = mongoose.model('Product', ProductSchema);

async function checkProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartstyle');
        console.log("Connected to DB");
        const products = await Product.find({}, 'name model3D');
        console.log("Products in DB:");
        products.forEach(p => {
            console.log(`- ${p.name}: ${p.model3D}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkProducts();
