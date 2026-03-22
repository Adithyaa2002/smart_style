const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_style';
console.log('Target URI:', uri);

mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        const dbs = await mongoose.connection.db.admin().listDatabases();
        console.log('Databases:', dbs.databases.map(db => db.name));

        const Product = mongoose.model('Product', new mongoose.Schema({}));
        const count = await Product.countDocuments();
        console.log('Product count in current DB:', count);

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    });
