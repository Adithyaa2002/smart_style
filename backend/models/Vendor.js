const mongoose = require("mongoose");

const VendorSchema = new mongoose.Schema({
  name: String,
  shopName: String,
  email: { type: String, unique: true },
  phone: String,
  address: String,
  businessType: String,
  gstNumber: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Vendor", VendorSchema);
