// backend/scripts/lock_perfect_fits.js
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const Product = require('../models/Product');

/**
 * PERMANENT RECORD OF 'PERFECT' FIT ADJUSTMENTS
 * These values were found through manual user testing on March 14th, 2026.
 * Run this script to restore these exact values to the database.
 */

const PERFECT_ADJUSTMENTS = [
    {
        name: "Bodycon dress Kneelength",
        adjustments: { adjustmentScale: 1.10, adjustmentX: 0.00, adjustmentY: 0.04, adjustmentZ: 0.01 }
    },
    {
        name: "tshirt",
        adjustments: { adjustmentScale: 1.00, adjustmentX: 0.00, adjustmentY: 0.00, adjustmentZ: 0.00 }
    },
    {
        name: "Printed Shirt",
        adjustments: { adjustmentScale: 1.10, adjustmentX: 0.00, adjustmentY: 0.00, adjustmentZ: 0.00 }
    },
    {
        name: "Majestic Man Men Classic Slim Fit Pure Cotton Casual Shirt",
        adjustments: { adjustmentScale: 1.00, adjustmentX: 0.00, adjustmentY: 0.00, adjustmentZ: 0.00 }
    }
];

async function lockFits() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected successfully.\n');

        for (const item of PERFECT_ADJUSTMENTS) {
            console.log(`Locking ${item.name}...`);
            const result = await Product.findOneAndUpdate(
                { name: item.name },
                item.adjustments,
                { new: true }
            );
            if (result) {
                console.log(`✅ Success: ${item.name} updated.`);
            } else {
                console.log(`⚠️ Warning: ${item.name} not found in database.`);
            }
        }

        // Also lock all other 'shirt' or 'tshirt' products to 1.0/0/0/0 if they don't have adjustments
        console.log('\nScanning for other shirt-related products to protect...');
        const others = await Product.updateMany(
            {
                name: { $regex: /shirt/i },
                name: { $nin: PERFECT_ADJUSTMENTS.map(a => a.name) }
            },
            {
                $setOnInsert: { adjustmentScale: 1.0, adjustmentX: 0, adjustmentY: 0, adjustmentZ: 0 }
            },
            { upsert: false }
        );
        console.log(`Locked ${others.modifiedCount || 0} additional items.\n`);

        console.log('--- ALL PERFECT FITS LOCKED ---');
    } catch (err) {
        console.error('❌ Error during locking process:', err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
}

lockFits();
