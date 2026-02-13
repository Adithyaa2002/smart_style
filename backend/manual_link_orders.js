const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Order = require('./models/Order');

const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

const TARGET_VENDOR_EMAIL = "adithyaa967@gmail.com";

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("Connected DB");

        const orders = await Order.find({}).sort({ createdAt: -1 }).limit(10);
        let count = 0;

        for (const order of orders) {
            const updatedItems = order.items.map(item => {
                if (!item.vendorId) {
                    const itemObj = item.toObject ? item.toObject() : item;
                    return { ...itemObj, vendorId: TARGET_VENDOR_EMAIL };
                }
                return item;
            });

            await Order.updateOne(
                { _id: order._id },
                { $set: { items: updatedItems } }
            );
            console.log(`Linked Order ${order._id}`);
            count++;
        }

        console.log(`Manually linked ${count} orders to ${TARGET_VENDOR_EMAIL}`);
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
