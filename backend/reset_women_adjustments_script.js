const mongoose = require('mongoose');
const Product = require('./models/Product');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Find all women's products
        const products = await Product.find({ gender: "Women" });
        console.log(`Found ${products.length} women's products.`);
        
        let count = 0;
        for (const p of products) {
            // Check if it's considered topwear or a dress
            const cat = p.category ? p.category.toLowerCase() : "";
            const isTopwear = cat.includes("top") || cat.includes("dress") || cat.includes("shirt") || cat.includes("jacket") || cat.includes("blazer") || cat.includes("saree") || cat.includes("kurta");
            
            if (isTopwear) {
                p.adjustmentScale = 1.0;
                p.adjustmentX = 0;
                p.adjustmentY = 0;
                p.adjustmentZ = 0;
                await p.save();
                console.log(`Reset adjustments for: [${p.category}] ${p.name}`);
                count++;
            }
        }
        console.log(`Successfully reset manual adjustments for ${count} women's topwear products to neutral (so new code baseline takes effect).`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
