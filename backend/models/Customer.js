const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // removed unique: true temporarily 
  name: String,
  email: String,
  phone: String,
  gender: String,
  avatar: String,

  addressLine1: String,
  addressLine2: String,
  city: String,
  pincode: String,

  measurements: {
    height: String,
    weight: String,
    chest: String,
    waist: String,
    hips: String,
  },

}, { timestamps: true });

module.exports = mongoose.model("Customer", CustomerSchema);
