const mongoose = require('mongoose');
require('dotenv').config();

const deleteUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('./models/User');
    const email = 'sisira_23l001cs@gecwyd.ac.in';
    
    const result = await User.deleteOne({ email: email });
    
    if (result.deletedCount > 0) {
      console.log(`Successfully deleted ${email} from the database.`);
    } else {
      console.log(`User ${email} was not found in the database.`);
    }
  } catch (error) {
    console.error('Error connecting or deleting:', error.message);
  } finally {
    process.exit(0);
  }
};

deleteUser();
