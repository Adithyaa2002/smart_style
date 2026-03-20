
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkFiles() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads'
    });

    const filename = '1773565660053-maledrss.glb';
    const files = await bucket.find({ filename }).toArray();

    if (files.length > 0) {
      console.log(`✅ File found in GridFS:`, files[0]);
    } else {
      console.log(`❌ File NOT found in GridFS: ${filename}`);
      
      console.log("\nSearching for all GLB files in GridFS:");
      const allFiles = await bucket.find({ filename: { $regex: /\.glb$/i } }).toArray();
      allFiles.forEach(f => console.log(` - ${f.filename} (${f.length} bytes)`));
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

checkFiles();
