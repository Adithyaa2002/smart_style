
const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/Home/Desktop/smart_style/backend/.env' });

const ProductSchema = new mongoose.Schema({
    name: String,
    model3D: String
});

const Product = mongoose.model('Product', ProductSchema);

async function fixProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        // Update the "tucked T shirt" product
        const result = await Product.updateOne(
            { name: "tucked T shirt" },
            { model3D: "/uploads/1772613647260-maledrss.glb" }
        );

        if (result.modifiedCount > 0) {
            console.log("✅ Successfully updated 'tucked T shirt' model path.");
        } else {
            console.log("ℹ️ No updates made to 'tucked T shirt'. It might already be correct or not found.");
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixProducts();
