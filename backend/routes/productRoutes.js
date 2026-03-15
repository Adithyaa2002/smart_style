// backend/routes/productRoutes.js

const express = require("express");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const multer = require("multer");

const router = express.Router();

const { GridFsStorage } = require("multer-gridfs-storage");
const mongoose = require("mongoose");

// --------------------- GridFS Storage Configuration (Robust Alternative) ---------------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper to upload buffer to GridFS
const uploadToGridFS = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads"
    });
    const filename = Date.now() + "-" + file.originalname;
    const uploadStream = bucket.openUploadStream(filename);
    uploadStream.end(file.buffer);
    uploadStream.on('finish', () => resolve(filename));
    uploadStream.on('error', reject);
  });
};

// --------------------- CREATE PRODUCT (Vendor) ---------------------
router.post("/", upload.fields([{ name: 'image', maxCount: 1 }, { name: 'model3D', maxCount: 1 }]), async (req, res) => {
  try {
    const imageFile = req.files['image'] ? req.files['image'][0] : null;
    const model3DFile = req.files['model3D'] ? req.files['model3D'][0] : null;

    // Manually upload files to GridFS
    const imageFilename = await uploadToGridFS(imageFile);
    const model3DFilename = await uploadToGridFS(model3DFile);

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
      sizes: Array.isArray(req.body.sizes) ? req.body.sizes : (req.body.sizes ? req.body.sizes.split(",").map(s => s.trim()) : []),
      colors: Array.isArray(req.body.colors) ? req.body.colors : (req.body.colors ? req.body.colors.split(",").map(c => c.trim()) : []),
      stock: req.body.stock,
      image: imageFilename ? `/api/products/file/${imageFilename}` : null,
      model3D: model3DFilename ? `/api/products/file/${model3DFilename}` : null,
      vendorId: req.body.vendorId,
      sizeChart: sizeChart
    };

    const product = new Product(productData);
    const saved = await product.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Create Product Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------- GET ALL PRODUCTS ---------------------
router.get("/", async (req, res) => {
  try {
    const { category, gender, minPrice, maxPrice, search, brand, minRating, sort, vendorId } = req.query;

    // Build query object
    let query = {};

    // ✅ VENDOR FILTER (Security/Isolation)
    if (vendorId) {
      query.vendorId = vendorId;
    }

    if (category) {
      // Case-insensitive match
      query.category = { $regex: new RegExp(category, "i") };
    }

    if (gender) {
      // Exact match (case insensitive) to avoid 'Men' matching 'Women'
      query.gender = { $regex: new RegExp(`^${gender}$`, "i") };
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

    // Sorting Logic
    let sortOption = {};
    if (sort === "price_asc") sortOption = { price: 1 };
    else if (sort === "price_desc") sortOption = { price: -1 };
    else if (sort === "newest") sortOption = { createdAt: -1 };
    else if (sort === "rating") sortOption = { rating: -1, "reviews.length": -1 }; // High rating, then most reviews
    else sortOption = { _id: -1 }; // Default to newest added (roughly)

    const products = await Product.find(query).sort(sortOption);
    console.log(`📦 Found ${products.length} products`); // DEBUG LOG

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------- DELETE PRODUCT ---------------------
router.delete("/:id", async (req, res) => {
  try {
    const { vendorId } = req.query; // Expect vendorId in query params
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // ✅ SECURITY CHECK: Ensure only the owner can delete
    if (product.vendorId && product.vendorId !== vendorId) {
      return res.status(403).json({ message: "Unauthorized: You do not own this product" });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --------------------- GET RECOMMENDATIONS ---------------------
router.get("/recommendations", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const customer = await Customer.findOne({ userId });
    // If no customer profile yet, just return trending/top-rated items
    if (!customer) {
      const trending = await Product.find().sort({ rating: -1 }).limit(6);
      return res.json(trending);
    }

    // 1. Analyze History
    const history = customer.tryOnHistory || [];
    const triedProductIds = history.map(h => h.productId);

    // Fetch full details of history items to find preferences
    const historicProducts = await Product.find({ _id: { $in: triedProductIds } });

    const brandCounts = {};
    const categoryCounts = {};

    historicProducts.forEach(p => {
      if (p.brand) brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
      if (p.category) categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });

    const topBrands = Object.keys(brandCounts).sort((a, b) => brandCounts[b] - brandCounts[a]);
    const topCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);

    // 2. Build Query
    // Match Gender (if specified in profile) + 'Unisex'
    let genderQuery = {};
    if (customer.gender) {
      genderQuery = {
        gender: {
          $in: [
            new RegExp(`^${customer.gender}$`, "i"),
            "Unisex"
          ]
        }
      };
    }

    // 3. Score Products
    // Get candidates NOT in history (Discovery Mode)
    const candidateProducts = await Product.find({
      ...genderQuery,
      _id: { $nin: triedProductIds }
    });

    const scoredProducts = candidateProducts.map(p => {
      let score = 0;

      // Trend Factor (Rating)
      score += (p.rating || 0) * 2;

      // Personalization: Brand Affinity
      if (topBrands.includes(p.brand)) {
        score += 5;
        // Boost if it's their #1 brand
        if (p.brand === topBrands[0]) score += 3;
      }

      // Personalization: Category Affinity
      if (topCategories.includes(p.category)) {
        score += 3;
      }

      return { product: p, score };
    });

    // Sort by Score Descending
    scoredProducts.sort((a, b) => b.score - a.score);

    // Return Top 6
    let recommendations = scoredProducts.slice(0, 6).map(sp => sp.product);

    // 4. Fallback
    // If we have fewer than 3 recommendations (e.g. new user, limited inventory), fill with top rated
    if (recommendations.length < 3) {
      const excludeIds = [...triedProductIds, ...recommendations.map(r => r._id)];
      const fallback = await Product.find({
        ...genderQuery,
        _id: { $nin: excludeIds }
      }).sort({ rating: -1 }).limit(6 - recommendations.length);

      recommendations = [...recommendations, ...fallback];
    }

    res.json(recommendations);

  } catch (err) {
    console.error("Recommendation Error:", err);
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
router.put("/:id", (req, res) => {
  const uploadMiddleware = upload.fields([{ name: 'image', maxCount: 1 }, { name: 'model3D', maxCount: 1 }]);

  uploadMiddleware(req, res, async (err) => {
    if (err) {
      console.error("❌ Multer/GridFS Error during Update:", err);
      return res.status(400).json({ message: "File upload failed", error: err.message });
    }

    try {
      const { vendorId } = req.body;
      console.log(`🛠️ Incoming Update for ID: ${req.params.id}`);
      console.log(`👤 Request vendorId: "${vendorId}"`);

      const product = await Product.findById(req.params.id);
      if (!product) {
        console.warn("🔍 Product not found in DB");
        return res.status(404).json({ message: "Product not found" });
      }

      console.log(`📦 DB Product vendorId: "${product.vendorId}"`);

      // ✅ SECURITY CHECK (Case-insensitive)
      const pVendor = (product.vendorId || "").toLowerCase();
      const rVendor = (vendorId || "").toLowerCase();

      if (pVendor && pVendor !== rVendor) {
        console.warn(`🚫 Ownership Mismatch: ${pVendor} !== ${rVendor}`);
        return res.status(403).json({ message: "Unauthorized: You do not own this product" });
      }

      const updateData = { ...req.body };

      // Handle optional file uploads during edit (using buffers now)
      if (req.files && req.files['image']) {
        const imageFilename = await uploadToGridFS(req.files['image'][0]);
        updateData.image = `/api/products/file/${imageFilename}`;
        console.log("📸 New image uploaded:", imageFilename);
      }
      
      if (req.files && req.files['model3D']) {
        const model3DFilename = await uploadToGridFS(req.files['model3D'][0]);
        updateData.model3D = `/api/products/file/${model3DFilename}`;
        console.log("📦 New 3D model uploaded:", model3DFilename);
      }

      // Parse array fields if they come as strings from FormData
      if (updateData.sizes && typeof updateData.sizes === 'string') {
        updateData.sizes = updateData.sizes.split(",").map(s => s.trim()).filter(s => s);
      }
      if (updateData.colors && typeof updateData.colors === 'string') {
        updateData.colors = updateData.colors.split(",").map(c => c.trim()).filter(c => c);
      }

      // Sync Size Chart
      if (updateData.sizeChart && typeof updateData.sizeChart === 'string') {
        try {
          updateData.sizeChart = JSON.parse(updateData.sizeChart);
          console.log("📏 Size Chart parsed successfully");
        } catch (e) {
          console.error("❌ Error parsing sizeChart during update:", e);
        }
      }

      const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true
      });

      console.log("✅ Product updated successfully");
      res.json(updatedProduct);
    } catch (err) {
      console.error("🔥 Internal Update Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
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

// --------------------- SAVE CLOTHING ADJUSTMENTS (Try-On UI) ---------------------
router.patch("/:id/adjustments", async (req, res) => {
  try {
    const { adjustmentScale, adjustmentX, adjustmentY, adjustmentZ } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { adjustmentScale, adjustmentX, adjustmentY, adjustmentZ },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------- GET FILE FROM GRIDFS ---------------------
router.get("/file/:filename", async (req, res) => {
  try {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    const files = await bucket.find({ filename: req.params.filename }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ message: "File not found" });
    }

    // Set content type for common files
    const filename = req.params.filename.toLowerCase();
    if (filename.endsWith('.glb')) res.set('Content-Type', 'model/gltf-binary');
    else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) res.set('Content-Type', 'image/jpeg');
    else if (filename.endsWith('.png')) res.set('Content-Type', 'image/png');
    else if (filename.endsWith('.webp')) res.set('Content-Type', 'image/webp');

    const downloadStream = bucket.openDownloadStreamByName(req.params.filename);
    downloadStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
