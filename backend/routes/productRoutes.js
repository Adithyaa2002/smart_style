// backend/routes/productRoutes.js

const express = require("express");
const Product = require("../models/Product");
const multer = require("multer");

const router = express.Router();

// --------------------- Multer Configuration ---------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// --------------------- CREATE PRODUCT (Vendor) ---------------------
// Changed to upload.fields to handle both image and model3D
router.post("/", upload.fields([{ name: 'image', maxCount: 1 }, { name: 'model3D', maxCount: 1 }]), async (req, res) => {
  try {
    const imageFile = req.files['image'] ? req.files['image'][0] : null;
    const model3DFile = req.files['model3D'] ? req.files['model3D'][0] : null;

    let sizeChart = {};
    if (req.body.sizeChart) {
      try {
        sizeChart = JSON.parse(req.body.sizeChart);
      } catch (e) {
        console.error("Error parsing sizeChart:", e);
      }
    }

    const productData = {
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      category: req.body.category,
      gender: req.body.gender,
      brand: req.body.brand,
      sizes: req.body.sizes ? req.body.sizes.split(",").map(s => s.trim()) : [],
      colors: req.body.colors ? req.body.colors.split(",").map(c => c.trim()) : [],
      stock: req.body.stock,
      image: imageFile ? `/uploads/${imageFile.filename}` : null,
      model3D: model3DFile ? `/uploads/${model3DFile.filename}` : null,
      vendorId: req.body.vendorId,
      sizeChart: sizeChart
    };

    console.log("REQ BODY:", req.body);
    console.log("REQ FILES:", req.files);

    const product = new Product(productData);
    const saved = await product.save();

    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------- GET ALL PRODUCTS ---------------------
// --------------------- GET ALL PRODUCTS ---------------------
router.get("/", async (req, res) => {
  try {
    const { category, gender, minPrice, maxPrice, search, brand, minRating } = req.query;

    // Build query object
    let query = {};

    if (category) {
      // Case-insensitive match
      query.category = { $regex: new RegExp(category, "i") };
    }

    if (gender) {
      query.gender = { $regex: new RegExp(gender, "i") };
    }

    if (brand) {
      query.brand = { $regex: new RegExp(brand, "i") };
    }

    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search) {
      query.name = { $regex: new RegExp(search, "i") };
    }

    console.log("🔍 Product Filter Query:", JSON.stringify(query, null, 2)); // DEBUG LOG

    const products = await Product.find(query);
    console.log(`📦 Found ${products.length} products`); // DEBUG LOG

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------- DELETE PRODUCT ---------------------
router.delete("/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------- GET UNIQUE BRANDS ---------------------
router.get("/brands", async (req, res) => {
  try {
    const brands = await Product.distinct("brand");
    res.json(brands.filter(b => b)); // Filter out null/undefined
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------- GET SINGLE PRODUCT ---------------------
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------- UPDATE PRODUCT ---------------------
router.put("/:id", async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------- ADD REVIEW ---------------------
router.post("/reviews/:id", async (req, res) => {
  const { userId, userName, rating, comment } = req.body;
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const review = { userId, userName, rating, comment, createdAt: Date.now() };
    product.reviews.push(review);

    // Recalculate average rating
    const total = product.reviews.reduce((acc, item) => acc + item.rating, 0);
    product.rating = total / product.reviews.length;

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
