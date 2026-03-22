const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const { storage } = require('../config/cloudinaryConfig');

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit
});

// @desc    Analyze Face from Photo
// @route   POST /api/avatar/face-from-photo
// @access  Public (or Private)
router.post('/face-from-photo', upload.single('photo'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No photo uploaded' });
    }

    const imagePath = req.file.path;
    console.log('📸 Analyzing Face Photo:', imagePath);

    // Spawn Python Process
    // NOTE: Assuming 'python' is in PATH. If 'py' or 'python3' is needed, user might need to adjust.
    // We try 'python' first.
    const pythonCommand = 'python';
    const scriptPath = path.join(__dirname, '../scripts/face_analysis.py');

    const pythonProcess = spawn(pythonCommand, [scriptPath, imagePath]);

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python process closed with code ${code}`);

        // Cleanup: Delete uploaded file after processing
        // fs.unlinkSync(imagePath);

        if (code !== 0) {
            console.error('Python Error:', errorString);

            // FALLBACK FOR DEVELOPMENT: If python fails (e.g. not installed), return dummy data
            if (process.env.NODE_ENV === 'development') {
                console.log('⚠️ Falling back to dummy face params because Python execution failed.');
                return res.json({
                    success: true,
                    faceParams: {
                        faceWidth: 0.5,
                        jawWidth: 0.5,
                        noseWidth: 0.5,
                        eyeSize: 0.5,
                        chinHeight: 0.5
                    },
                    message: "Simulation active (Python script could not run)"
                });
            }

            return res.status(500).json({
                message: 'Face analysis failed',
                error: errorString
            });
        }

        try {
            // Find the first '{' to ignore potential library logs (like matplotlib font cache messages)
            const jsonStart = dataString.indexOf('{');
            if (jsonStart === -1) {
                console.error('Invalid Output:', dataString);
                return res.status(500).json({ message: 'Face analysis failed: Script did not return JSON' });
            }
            const actualJson = dataString.substring(jsonStart);
            const result = JSON.parse(actualJson);
            
            if (result.error) {
                return res.status(400).json({ message: result.error });
            }

            console.log('✅ Face Analysis Success:', result);
            res.json({
                success: true,
                faceParams: result // Returns { faceWidth, jawWidth, etc... }
            });

        } catch (parseError) {
            console.error('JSON Parse Error:', parseError, dataString);
            res.status(500).json({ message: 'Failed to parse analysis results' });
        }
    });
});

module.exports = router;
