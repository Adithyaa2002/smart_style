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
                p.adjustmentScale = 0.83;
                p.adjustmentX = 0.02;
                p.adjustmentY = 0.03;
                p.adjustmentZ = 0.02;
                await p.save();
                console.log(`Set UI defaults for: [${p.category}] ${p.name}`);
                count++;
            }
        }
        console.log(`Successfully updated manual default UI adjustments for ${count} women's topwear products.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
