const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  personalInfo: {
    firstName: String,
    lastName: String,
    phone: String,
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say']
    }
  },
  bodyMeasurements: {
    height: Number, // in cm
    weight: Number, // in kg
    bust: Number,
    waist: Number,
    hips: Number,
    shoulderWidth: Number,
    armLength: Number,
    legLength: Number
  },
  stylePreferences: {
    preferredStyles: [String], // casual, formal, sporty, etc.
    favoriteColors: [String],
    sizePreference: {
      type: String,
      enum: ['slim', 'regular', 'loose']
    },
    budgetRange: {
      min: Number,
      max: Number
    }
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  avatarSettings: {
    skinTone: String,
    hairColor: String,
    hairStyle: String,
    bodyType: String
  },
  notifications: {
    emailPromotions: { type: Boolean, default: true },
    newArrivals: { type: Boolean, default: true },
    priceDrops: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true }
  },
  privacySettings: {
    profileVisibility: {
      type: String,
      enum: ['public', 'friends-only', 'private'],
      default: 'private'
    },
    showMeasurements: { type: Boolean, default: false },
    dataSharing: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Profile', profileSchema);