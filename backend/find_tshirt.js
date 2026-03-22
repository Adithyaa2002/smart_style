const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/Home/Desktop/smart_style/backend/.env' });
const Product = require('./models/Product');

async function find() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const p = await Product.find({
            $or: [
                { name: /tshirt/i },
                { name: /t-shirt/i },
                { price: 1500 }
            ]
        });
        console.log(JSON.stringify(p.map(item => ({ name: item.name, price: item.price })), null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
find();
