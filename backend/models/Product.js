const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String },
  gender: { type: String, enum: ['Men', 'Women', 'Kids', 'Unisex'], default: 'Unisex' },
  brand: { type: String },      // e.g. "Nike", "Adidas"
  rating: { type: Number, default: 0 }, // e.g. 4.5
  sizes: { type: [String], default: [] }, // e.g. ["S", "M", "L"] or ["7", "8"]
  colors: { type: [String], default: [] }, // e.g. ["Red", "Blue"]
  stock: { type: Number },
  description: { type: String },
  image: { type: String },      // URL or base64 string
  model3D: { type: String },    // Path to valid .glb/.gltf file

  // Per-product clothing positioning adjustments (stored by admin/vendor)
  adjustmentScale: { type: Number, default: 1.0 },
  adjustmentX: { type: Number, default: 0 },
  adjustmentY: { type: Number, default: 0 },
  adjustmentZ: { type: Number, default: 0 },
  adjustmentDepth: { type: Number, default: 0 },
  sizeChart: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  reviews: [
    {
      userId: { type: String, required: true },
      userName: { type: String, required: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      comment: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  vendorId: { type: String },   // optional, store vendor ID
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
