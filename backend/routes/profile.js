const express = require('express');
const router = express.Router();

// Temporary storage (we'll add database later)
let userProfiles = [];

// Get user profile
router.get('/:userId', (req, res) => {
  const profile = userProfiles.find(p => p.userId === req.params.userId);
  
  if (!profile) {
    // Return default profile if not found
    const defaultProfile = {
      userId: req.params.userId,
      personalInfo: {
        firstName: '',
        lastName: '',
        phone: '',
        dateOfBirth: null,
        gender: 'prefer-not-to-say'
      },
      bodyMeasurements: {
        height: null,
        weight: null,
        bust: null,
        waist: null,
        hips: null,
        shoulderWidth: null,
        armLength: null,
        legLength: null
      },
      stylePreferences: {
        preferredStyles: [],
        favoriteColors: [],
        sizePreference: 'regular',
        budgetRange: { min: 0, max: 1000 }
      },
      shippingAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      avatarSettings: {
        skinTone: 'medium',
        hairColor: 'black',
        hairStyle: 'straight',
        bodyType: 'average'
      },
      notifications: {
        emailPromotions: true,
        newArrivals: true,
        priceDrops: true,
        orderUpdates: true
      },
      privacySettings: {
        profileVisibility: 'private',
        showMeasurements: false,
        dataSharing: false
      }
    };
    return res.json(defaultProfile);
  }
  
  res.json(profile);
});

// Update user profile
router.put('/:userId', (req, res) => {
  const { userId } = req.params;
  const updatedProfile = req.body;
  
  const existingIndex = userProfiles.findIndex(p => p.userId === userId);
  
  if (existingIndex >= 0) {
    userProfiles[existingIndex] = { ...userProfiles[existingIndex], ...updatedProfile };
  } else {
    userProfiles.push({ userId, ...updatedProfile });
  }
  
  console.log('✅ Profile updated for user:', userId);
  res.json({ message: 'Profile updated successfully', profile: updatedProfile });
});

// Update specific section of profile
router.patch('/:userId/:section', (req, res) => {
  const { userId, section } = req.params;
  const sectionData = req.body;
  
  let profile = userProfiles.find(p => p.userId === userId);
  
  if (!profile) {
    profile = { userId };
    userProfiles.push(profile);
  }
  
  profile[section] = { ...profile[section], ...sectionData };
  
  console.log(`✅ ${section} updated for user:`, userId);
  res.json({ message: `${section} updated successfully` });
});

module.exports = router;