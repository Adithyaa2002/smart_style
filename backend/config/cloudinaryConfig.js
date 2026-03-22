const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'ELECTRA',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup specialized storage for different resource types (images vs glb models)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const isModel = file.originalname.toLowerCase().endsWith('.glb') || file.originalname.toLowerCase().endsWith('.gltf');
        const folder = isModel ? 'smart_style/models' : 'smart_style/images';

        return {
            folder: folder,
            resource_type: isModel ? 'raw' : 'image', // Must use 'raw' for .glb to maintain binary integrity
            public_id: Date.now() + '-' + path.parse(file.originalname).name,
            format: isModel ? 'glb' : undefined, // Explicitly keep glb extension for models
        };
    },
});

module.exports = { cloudinary, storage };
