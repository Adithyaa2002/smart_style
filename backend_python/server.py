from flask import Flask, request, jsonify, send_from_directory  # type: ignore[import-unresolved]
from flask_cors import CORS  # type: ignore[import-unresolved]
import subprocess
import os
import uuid
import json

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
OUTPUT_FOLDER = os.path.join(os.getcwd(), 'processed')
BLENDER_EXECUTABLE = "C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe" # UPDATE THIS PATH
BASE_AVATAR_PATH = os.path.abspath("../frontend/public/models/female_base.glb") # Adjust path as needed

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

@app.route('/fit-clothing', methods=['POST'])
def fit_clothing():
    try:
        data = request.json
        clothing_url = data.get('clothingUrl')
        measurements = data.get('measurements')

        if not clothing_url or not measurements:
            return jsonify({"error": "Missing clothingUrl or measurements"}), 400

        # Create a unique ID for this job
        job_id = str(uuid.uuid4())
        
        # In a real app, you would download the file from the URL. 
        # For this local setup, we assume the URL might be a local path or we need to handle it.
        # IF the frontend sends a file upload, use that.
        # Assuming for now we get a local path or we need to download it.
        
        # Simplified: We expect the frontend to upload the file or provide a path we can access.
        # If it's a URL from our own backend (localhost:5000), we can translate it to a file path.
        
        # For this prototype, let's assume the frontend sends the *filename* if it was just uploaded
        # OR sends a full URL.
        
        # Let's say we receive the filename of the uploaded cloth.
        clothing_filename = os.path.basename(clothing_url)
        # We need to find where this file is. The Node backend saves to "backend/uploads"
        # Since we are in "backend_python", the Node uploads are in "../backend/uploads"
        
        source_clothing_path = os.path.abspath(os.path.join("../backend/uploads", clothing_filename))
        
        if not os.path.exists(source_clothing_path):
             return jsonify({"error": f"Clothing file not found at {source_clothing_path}"}), 404

        output_filename = f"fitted_{job_id}_{clothing_filename}"
        output_path = os.path.join(OUTPUT_FOLDER, output_filename)

        # Prepare arguments for Blender script
        # We pass measurements as a JSON string argument
        measurements_json = json.dumps(measurements)
        
        # Command to run Blender in background
        # blender -b -P process_avatar.py -- <clothing_path> <output_path> <measurements_json> <base_avatar_path>
        
        cmd = [
            BLENDER_EXECUTABLE,
            "-b", # Background mode
            "-P", "process_avatar.py",
            "--", # End of blender args, start of script args
            source_clothing_path,
            output_path,
            measurements_json,
            BASE_AVATAR_PATH
        ]

        print(f"Running Blender command: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print("Blender Error:", result.stderr)
            return jsonify({"error": "Blender processing failed", "details": result.stderr}), 500

        print("Blender Output:", result.stdout)

        # Return the URL to the processed file
        # We need to serve this file.
        processed_url = f"http://localhost:5001/processed/{output_filename}"
        
        return jsonify({
            "status": "success",
            "processedUrl": processed_url
        })

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@app.route('/processed/<filename>')
def serve_processed(filename):
    return send_from_directory(OUTPUT_FOLDER, filename)

if __name__ == '__main__':
    app.run(port=5001, debug=True)
