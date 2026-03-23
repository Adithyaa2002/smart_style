const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('./models/Product');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const dresses = [
  {
    name: "Classic Black Evening Dress",
    price: 3499,
    category: "Dresses",
    gender: "Women",
    brand: "SmartStyle Luxe",
    rating: 4.9,
    sizes: ["S", "M", "L"],
    colors: ["Black"],
    stock: 25,
    description: "An elegant black evening dress for high-end events.",
    image: "/uploads/1772096084599-dress.jpg",
    model3D: "/uploads/1768588461510-black_dress.glb"
  },
  {
    name: "Floral Summer Day Dress",
    price: 1999,
    category: "Dresses",
    gender: "Women",
    brand: "SmartStyle Casual",
    rating: 4.6,
    sizes: ["M", "L", "XL"],
    colors: ["Multi"],
    stock: 40,
    description: "A breezy floral dress perfect for summer days.",
    image: "/uploads/1770053640914-Screenshot 2026-02-02 230223.png",
    model3D: "/uploads/1770053640915-dress1.glb"
  },
  {
    name: "Designer Party Gown",
    price: 5999,
    category: "Dresses",
    gender: "Women",
    brand: "SmartStyle Premium",
    rating: 5.0,
    sizes: ["S", "M"],
    colors: ["Gold", "Silver"],
    stock: 10,
    description: "Luxury party gown for gala nights.",
    image: "/uploads/1765213833983-shopping (1).webp",
    model3D: "/uploads/1768589730127-black_dress.glb"
  }
];

const seed = async () => {
  try {
    console.log("Connecting to:", process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to DB");

    for (const dress of dresses) {
      const existing = await Product.findOne({ name: dress.name });
      if (existing) {
        console.log(`Product "${dress.name}" already exists. Skipping.`);
      } else {
        await Product.create(dress);
        console.log(`✅ Seeded: ${dress.name}`);
      }
    }

    console.log("Seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
};

seed();
