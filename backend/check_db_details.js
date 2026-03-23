const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const checkDbDetails = async () => {
    try {
        console.log("URI from .env:", process.env.MONGODB_URI ? "Found" : "NOT FOUND");
        await mongoose.connect(process.env.MONGODB_URI);
        
        const db = mongoose.connection.db;
        console.log("Current Database Name:", db.databaseName);
        
        const collections = await db.listCollections().toArray();
        console.log("Collections in DB:", collections.map(c => c.name));
        
        if (collections.some(c => c.name === 'products')) {
            const count = await db.collection('products').countDocuments();
            console.log("Total products in 'products' collection:", count);
            
            const sample = await db.collection('products').findOne({});
            console.log("Sample product:", JSON.stringify(sample, null, 2));
        } else {
            console.log("❌ 'products' collection NOT FOUND in this database!");
        }
        
        await mongoose.disconnect();
    } catch (err) {
        console.error("Error:", err);
    }
};

checkDbDetails();
