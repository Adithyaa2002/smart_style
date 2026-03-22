const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Product = require('./models/Product');

async function checkAdjustments() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartstyle');
        console.log("Connected to DB");

        const products = await Product.find({
            $or: [
                { name: /dress/i },
                { name: /bodycon/i },
                { name: /gown/i },
                { name: /frock/i },
                { category: /dress/i },
                { category: /frock/i }
            ]
        });

        console.log(`Found ${products.length} relevant products:`);
        products.forEach(p => {
            console.log(`- [${p.name}]`);
            console.log(`  Model: ${p.model3D}`);
            console.log(`  Adjustments: Scale=${p.adjustmentScale}, X=${p.adjustmentX}, Y=${p.adjustmentY}, Z=${p.adjustmentZ}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

checkAdjustments();
