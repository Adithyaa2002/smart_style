const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('./models/Product');

const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("Connected");
        const menShirts = await Product.find({
            gender: "Men",
            category: "Shirts"
        });
        console.log(`Found ${menShirts.length} Men's Shirts`);
        menShirts.forEach(p => console.log(`- ${p.name}`));

        const allMen = await Product.find({ gender: "Men" });
        console.log(`Total Men's items: ${allMen.length}`);
        allMen.forEach(p => console.log(`  * ${p.name} [${p.category}]`));

        process.exit();
    })
    .catch(err => console.error(err));
