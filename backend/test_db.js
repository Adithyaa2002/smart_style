const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_style';
console.log('Connecting to:', uri);

mongoose.connect(uri)
    .then(() => {
        console.log('✅ Connection successful');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection error:', err);
        process.exit(1);
    });
