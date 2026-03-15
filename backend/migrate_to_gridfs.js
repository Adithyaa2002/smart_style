const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config({ path: path.join(__dirname, '.env') });

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB for migration");

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "uploads",
        });

        const products = await Product.find({
            $or: [
                { image: { $regex: /^\/uploads\// } },
                { model3D: { $regex: /^\/uploads\// } }
            ]
        });

        console.log(`🔍 Found ${products.length} products to migrate`);

        for (const product of products) {
            console.log(`📦 Migrating: ${product.name}`);

            if (product.image && product.image.startsWith('/uploads/')) {
                const filename = product.image.replace('/uploads/', '');
                const filePath = path.join(__dirname, 'uploads', filename);

                if (fs.existsSync(filePath)) {
                    console.log(`  🖼️ Uploading image: ${filename}`);
                    const uploadStream = bucket.openUploadStream(filename);
                    fs.createReadStream(filePath).pipe(uploadStream);

                    await new Promise((resolve, reject) => {
                        uploadStream.on('finish', resolve);
                        uploadStream.on('error', reject);
                    });

                    product.image = `/api/products/file/${filename}`;
                } else {
                    console.warn(`  ⚠️ Image file not found locally: ${filePath}`);
                }
            }

            if (product.model3D && product.model3D.startsWith('/uploads/')) {
                const filename = product.model3D.replace('/uploads/', '');
                const filePath = path.join(__dirname, 'uploads', filename);

                if (fs.existsSync(filePath)) {
                    console.log(`  🎮 Uploading model: ${filename}`);
                    const uploadStream = bucket.openUploadStream(filename);
                    fs.createReadStream(filePath).pipe(uploadStream);

                    await new Promise((resolve, reject) => {
                        uploadStream.on('finish', resolve);
                        uploadStream.on('error', reject);
                    });

                    product.model3D = `/api/products/file/${filename}`;
                } else {
                    console.warn(`  ⚠️ Model file not found locally: ${filePath}`);
                }
            }

            await product.save();
            console.log(`  ✅ ${product.name} updated in DB`);
        }

        console.log("🏁 Migration completed successfully");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
};

migrate();
