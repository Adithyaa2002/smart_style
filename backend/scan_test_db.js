const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const checkTestDB = async () => {
    try {
        const baseUri = process.env.MONGODB_URI.split('?')[0];
        const options = process.env.MONGODB_URI.split('?')[1];
        const testUri = baseUri.replace(/\/smartstyle$/, '/test') + (options ? '?' + options : '');

        await mongoose.connect(testUri);
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        console.log('--- SCANNING test DB ---');
        for (let col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`[${col.name}] documents: ${count}`);
        }
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
};

checkTestDB();
