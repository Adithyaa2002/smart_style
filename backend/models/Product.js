const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String },
  stock: { type: Number },
  image: { type: String },      // URL or base64 string
  vendorId: { type: String },   // optional, store vendor ID
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
