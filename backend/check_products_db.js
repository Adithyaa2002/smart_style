const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const ProductSchema = new mongoose.Schema({
    name: String,
    model3D: String
});

const Product = mongoose.model('Product', ProductSchema);

async function checkAllProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartstyle');
        console.log("Connected to DB");

        const products = await Product.find({ model3D: /maledrss/ });
        console.log(`Found ${products.length} products matching 'maledrss'`);

        products.forEach(p => {
            console.log(` - [${p._id}] Name: ${p.name} | URL: ${p.model3D}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

checkAllProducts();
