const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const pythonCommand = 'python';
const scriptPath = path.join(__dirname, 'scripts', 'face_analysis.py');

// Use the latest face upload
const faceDir = path.join(__dirname, 'uploads', 'faces');
const files = fs.readdirSync(faceDir).filter(f => f.startsWith('face_') && !f.endsWith('_texture.png'));
files.sort((a, b) => fs.statSync(path.join(faceDir, b)).mtime - fs.statSync(path.join(faceDir, a)).mtime);

if (files.length === 0) {
    console.error("No face images found in uploads/faces");
    process.exit(1);
}

const sampleImage = path.join(faceDir, files[0]);
console.log("Testing analysis on LATEST photo:", sampleImage);

const pythonProcess = spawn(pythonCommand, [scriptPath, sampleImage]);

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
    if (code !== 0) {
        console.error('Python Error (stderr):', errorString);
    } 
    
    // Find JSON start
    const jsonStart = dataString.indexOf('{');
    if (jsonStart !== -1) {
        try {
            const result = JSON.parse(dataString.substring(jsonStart));
            console.log('Success Result:', result);
        } catch (e) {
            console.log('JSON Parse Failed. Raw stdout:', dataString);
        }
    } else {
        console.log('No JSON found. Raw stdout:', dataString);
    }
});
