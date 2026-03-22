// backend/scripts/fix_broken_model_links.js
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const Product = require('../models/Product');

async function fixBrokenLinks() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected successfully.\n');

        // 1. Identify broken products
        const brokenLinks = [
            { name: "Red bodycon", fallback: "/uploads/1770056618072-dress1.glb" },
            { name: "short dress", fallback: "/uploads/1770056618072-dress1.glb" },
            { name: "gown", fallback: "/uploads/1770056618072-dress1.glb" },
            { name: "pant", fallback: "/uploads/1772616379226-maledrss.glb" }
        ];

        console.log('Repairing identified broken models...');
        for (const item of brokenLinks) {
            const result = await Product.updateMany(
                { name: item.name },
                { model3D: item.fallback }
            );
            if (result.matchedCount > 0) {
                console.log(`✅ Fixed model for ${item.name}: ${result.modifiedCount} items updated.`);
            } else {
                console.log(`⚠️ Warning: Product '${item.name}' not found.`);
            }
        }

        // 2. Scan for any other /api/products/file/ links and generic fallbacks
        // (This ensures all 404s reported by user are caught)
        const extraFixes = await Product.updateMany(
            { model3D: /\/api\/products\/file\/.*(mendrss2|reddress|1nonfinal)/i },
            [
                {
                    $set: {
                        model3D: {
                            $cond: {
                                if: { $regexMatch: { input: "$model3D", regex: /mendrss2/i } },
                                then: "/uploads/1772616379226-maledrss.glb",
                                else: "/uploads/1770056618072-dress1.glb"
                            }
                        }
                    }
                }
            ]
        );
        console.log(`\nAdditional cleanup: ${extraFixes.modifiedCount} more items fixed.`);

        console.log('\n--- ALL BROKEN MODEL LINKS REDIRECTED TO PLACEHOLDERS ---');
    } catch (err) {
        console.error('❌ Error during repair process:', err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
}

fixBrokenLinks();
