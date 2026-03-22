const mongoose = require('mongoose');
const User = require('./models/User'); // Ensure path is correct
require('dotenv').config();

const registerUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_style');
        console.log('✅ Connected to MongoDB');

        const userData = {
            name: 'Sisira D R',
            email: 'sisira_23I001cs@gecwyd.ac.in',
            password: 'gecwyd1234', // Model should hash this in pre-save
            role: 'customer'
        };

        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            console.log('ℹ️ User already exists');
            process.exit(0);
        }

        const newUser = new User(userData);
        await newUser.save();
        console.log('✅ User registered successfully as customer');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error registering user:', err.message);
        process.exit(1);
    }
};

registerUser();
