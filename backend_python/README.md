# Python Backend for Server-Side Clothing Fitting

This backend uses Python and Blender to perform high-quality clothing fitting on the server side.

## Prerequisites

1.  **Python 3.8+**: Installed and added to PATH.
2.  **Blender 3.6+ or 4.x**: Installed.
    *   **CRITICAL**: You MUST update `BLENDER_EXECUTABLE` in `server.py` to point to your `blender.exe`.
    *   Default is: `C:\Program Files\Blender Foundation\Blender 4.3\blender.exe`

## Setup

1.  Navigate to this directory:
    ```bash
    cd backend_python
    ```

2.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```

## Usage

1.  Start the server:
    ```bash
    python server.py
    ```
    The server runs on `http://localhost:5001`.

2.  **API Endpoint**:
    *   `POST /fit-clothing`
    *   Body: JSON
        ```json
        {
          "clothingUrl": "dress1.glb",  // Filename of uploaded cloth (must be in ../backend/uploads/)
          "measurements": {
            "chest": 36,
            "waist": 28,
            "hips": 40,
            "thigh": 22,
            "shoulders": 16
          }
        }
        ```
    *   Response: JSON
        ```json
        {
          "status": "success",
          "processedUrl": "http://localhost:5001/processed/fitted_uuid_dress1.glb"
        }
        ```

## Frontend Integration

Update your frontend to call this endpoint instead of relying solely on client-side scaling.

Example (in React):

```javascript
const response = await fetch('http://localhost:5001/fit-clothing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clothingUrl: "dress1.glb", // You need to send the filename
    measurements: userMeasurements
  })
});

const data = await response.json();
if (data.processedUrl) {
  setClothingModelUrl(data.processedUrl);
}
```
