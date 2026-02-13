const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('./models/Product');

// Load env
const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

console.log("Connecting to:", process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("Connected DB");

        const products = await Product.find({});
        console.log(`Found ${products.length} products to analyze.`);

        let updatedCount = 0;

        for (const p of products) {
            const name = p.name ? p.name.toLowerCase() : "";
            let newCat = "Others";
            let newGender = p.gender; // Keep existing unless we find better

            // Infer Category
            if (name.includes("shirt") && !name.includes("t-shirt") && !name.includes("tee")) newCat = "Shirts";
            else if (name.includes("t-shirt") || name.includes("tee")) newCat = "T-Shirts";
            else if (name.includes("jeans") || name.includes("denim")) newCat = "Jeans";
            else if (name.includes("trouser") || name.includes("pant")) newCat = "Trousers";
            else if (name.includes("dress") || name.includes("gown")) newCat = "Dresses";
            else if (name.includes("saree") || name.includes("sari")) newCat = "Sarees";
            else if (name.includes("kurta") || name.includes("kurti")) newCat = "Kurtas";
            else if (name.includes("top") || name.includes("blouse")) newCat = "Tops";
            else if (name.includes("skirt")) newCat = "Skirts";
            else if (name.includes("jacket") || name.includes("coat") || name.includes("blazer")) newCat = "Jackets";
            else if (name.includes("watch")) newCat = "Watches";
            else if (name.includes("bag") || name.includes("purse")) newCat = "Bags";
            else if (name.includes("shoe") || name.includes("sneaker") || name.includes("boot")) newCat = "Shoes";

            // Infer Gender (if not already set correctly)
            if (name.includes("men") && !name.includes("women")) newGender = "Men";
            else if (name.includes("women") || name.includes("lady") || name.includes("girl")) newGender = "Women";
            else if (name.includes("kid") || name.includes("boy") || name.includes("child")) newGender = "Kids";

            // Apply updates
            let changed = false;
            // Only update category if we found a specific one, or if current is generic "Topwear"
            if ((p.category === "Topwear" || !p.category) && newCat !== "Others") {
                p.category = newCat;
                changed = true;
            } else if (newCat !== "Others" && p.category !== newCat) {
                // Force update if we found a specific match
                p.category = newCat;
                changed = true;
            }

            // Update gender if we inferred it strongly
            if (newGender && p.gender !== newGender) {
                p.gender = newGender;
                changed = true;
            }

            if (changed) {
                await p.save();
                console.log(`Updated: ${p.name} -> Cat: ${p.category}, Gender: ${p.gender}`);
                updatedCount++;
            }
        }

        console.log(`Update complete. Modified ${updatedCount} products.`);
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
