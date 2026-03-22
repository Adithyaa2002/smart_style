import os
import sys
import json
import cv2  # type: ignore[import-unresolved]
import mediapipe as mp  # type: ignore[import-unresolved]
import numpy as np  # type: ignore[import-unresolved]
import math
from mediapipe.tasks import python  # type: ignore[import-unresolved]
from mediapipe.tasks.python import vision  # type: ignore[import-unresolved]

def analyze_face(image_path):
    # Path to the model file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, "models", "face_landmarker.task")
    
    if not os.path.exists(model_path):
        return {"error": f"Model file not found at {model_path}"}

    # Initialize Face Landmarker
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
        num_faces=1
    )
    
    with vision.FaceLandmarker.create_from_options(options) as landmarker:
        # Load image using Mediapipe's own loader
        try:
            # Check if it's a URL
            if image_path.startswith('http'):
                import urllib.request
                import numpy as np
                import tempfile
                
                print(f"DEBUG: Downloading image from URL: {image_path}", file=sys.stderr)
                # Create a temporary file to store the downloaded image
                with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
                    urllib.request.urlretrieve(image_path, tmp.name)
                    local_path = tmp.name
                
                mp_image = mp.Image.create_from_file(local_path)
                
                # Cleanup temporary file later or keep track
                # For simplicity, we just use it and it will be cleaned up by OS eventually or we can manually delete
            else:
                mp_image = mp.Image.create_from_file(image_path)
        except Exception as e:
            return {"error": f"Could not read image: {str(e)}"}

        # Process image
        results = landmarker.detect(mp_image)

        if not results.face_landmarks:
            return {"error": "No face detected"}

        # Extract landmarks (first face)
        landmarks = results.face_landmarks[0]

        # Helper to get coords
        def get_pt(idx):
            # Tasks API landmarks have x, y, z
            return (landmarks[idx].x, landmarks[idx].y, landmarks[idx].z)

        def dist(p1, p2):
            return math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2 + (p1[2]-p2[2])**2)

        # Points (Indices are the same as legacy face mesh)
        left_cheek = get_pt(234)
        right_cheek = get_pt(454)
        top_head = get_pt(10)
        chin = get_pt(152)
        
        nose_left = get_pt(64)   # Left Alare
        nose_right = get_pt(294) # Right Alare
        
        left_eye_L = get_pt(33)
        left_eye_R = get_pt(133)
        right_eye_L = get_pt(362)
        right_eye_R = get_pt(263)
        
        jaw_L = get_pt(172) # Approx Gonion
        jaw_R = get_pt(397) # Approx Gonion

        # Measurements
        face_width = dist(left_cheek, right_cheek)
        face_height = dist(top_head, chin)
        
        nose_width_raw = dist(nose_left, nose_right)
        
        # Eye Size (AVG width of both eyes)
        eye_width_L = dist(left_eye_L, left_eye_R)
        eye_width_R = dist(right_eye_L, right_eye_R)
        avg_eye_width = (eye_width_L + eye_width_R) / 2
        
        # Jaw Width
        jaw_width_raw = dist(jaw_L, jaw_R)

        # RATIOS (Normalized 0.0 - 1.0 logic)
        # 1. Face Width Ratio (Aspect Ratio)
        aspect_ratio = face_width / face_height
        # Mapping 0.6 -> 0.0 (Narrow), 1.2 -> 1.0 (Wide)
        norm_face_width = (aspect_ratio - 0.6) / (1.2 - 0.6)
        
        # 2. Jaw Width Ratio (relative to Face Width)
        jaw_ratio = jaw_width_raw / face_width
        norm_jaw_width = (jaw_ratio - 0.6) / (1.0 - 0.6)

        # 3. Nose Width Ratio (relative to Face Width)
        nose_ratio = nose_width_raw / face_width
        norm_nose_width = (nose_ratio - 0.15) / (0.4 - 0.15)
        
        # 4. Eye Size Ratio (relative to Face Width)
        eye_ratio = avg_eye_width / face_width
        norm_eye_size = (eye_ratio - 0.1) / (0.3 - 0.1)

        # 5. Chin Height (Distance from lip bottom to chin / Face Height)
        lip_bottom = get_pt(17)
        chin_len = dist(lip_bottom, chin)
        chin_ratio = chin_len / face_height
        norm_chin_height = (chin_ratio - 0.1) / (0.2 - 0.1)



        # 6. DOMINANT SKIN COLOR (Improved)
        skin_hex = "#F5C392" # Default fallback
        try:
            img_np = mp_image.numpy_view()
            if img_np is not None:
                h, w, c = img_np.shape
                
                # DIAGNOSTIC: Check image format meta
                print(f"DEBUG: Image Format: {mp_image.image_format} | Shape: {img_np.shape}", file=sys.stderr)
                
                # Check for standard landmarks
                points_to_sample = [
                    get_pt(151), # Forehead center
                    get_pt(123), # Left inner cheek
                    get_pt(352), # Right inner cheek
                    get_pt(152), # Chin
                    get_pt(6)    # Between eyes (Nose bridge)
                ]
                
                valid_colors = []
                
                for pt in points_to_sample:
                    cx = int(pt[0] * w)
                    cy = int(pt[1] * h)
                    
                    # Larger sample size for better averaging
                    sample_size = 4
                    y_s = max(0, cy - sample_size)
                    y_e = min(h, cy + sample_size)
                    x_s = max(0, cx - sample_size)
                    x_e = min(w, cx + sample_size)
                    
                    roi = img_np[y_s:y_e, x_s:x_e]
                    if roi.size > 0:
                        # Compute average color of this region
                        avg = roi.mean(axis=(0,1))
                        
                        # HANDLE RGB vs BGR vs RGBA vs BGRA
                        # MediaPipe ImageFormat ENUMS: 
                        # SRGB=1, SRGBA=2, SBGR=3, SBGRA=4
                        fmt = mp_image.image_format
                        r, g, b = 0, 0, 0
                        
                        if fmt == mp.ImageFormat.SRGB:
                            r, g, b = avg[0], avg[1], avg[2]
                        elif fmt == mp.ImageFormat.SRGBA:
                            r, g, b = avg[0], avg[1], avg[2]
                        elif fmt == mp.ImageFormat.SBGR:
                            b, g, r = avg[0], avg[1], avg[2]
                        elif fmt == mp.ImageFormat.SBGRA:
                            b, g, r = avg[0], avg[1], avg[2]
                        else:
                            # Fallback assume RGB
                            r, g, b = avg[0], avg[1], avg[2]

                        brightness = 0.299*r + 0.587*g + 0.114*b
                        print(f"DEBUG: Sample at ({cx},{cy}) -> RGB({int(r)},{int(g)},{int(b)}) Luma:{int(brightness)}", file=sys.stderr)
                        
                        if 10 < brightness < 250: 
                            valid_colors.append((r, g, b))

                if valid_colors:
                    # Sort by luma to find a representative sample
                    valid_colors.sort(key=lambda x: 0.299*x[0] + 0.587*x[1] + 0.114*x[2], reverse=True)
                    
                    # Use a median-ish sample rather than brightest to avoid highlight distortion
                    center_idx = len(valid_colors) // 2
                    r, g, b = valid_colors[center_idx]
                    luma = 0.299*r + 0.587*g + 0.114*b
                    
                    # --- SKIN TONE ENHANCEMENT (REFINE) ---
                    # For dark skin (low luma), keep the color natural and avoid pinkish shift
                    if luma < 100:
                        # Subtle saturation boost only if it's very grey
                        pass 
                    else:
                        # For fair skin, retain some warmth boost but keep it subtle
                        if r < g * 1.05: 
                            r = min(255, r * 1.05)
                        
                        # Final Brightness Boost for fair skin
                        if luma > 140:
                             target_r = 230
                             if r < target_r:
                                 scale = target_r / r
                                 r, g, b = [min(float(255), x * scale) for x in [r, g, b]]

                    # --- FINAL SUBTLE REDUCTION (User Request) ---
                    # Reduce intensity by ~2% for a more grounded look
                    best_rgb = [max(float(0), x * 0.98) for x in [r, g, b]]

                    # Final Hex
                    skin_hex = "#{:02x}{:02x}{:02x}".format(int(best_rgb[0]), int(best_rgb[1]), int(best_rgb[2]))
                    print(f"DEBUG: Enhanced RGB {best_rgb} | Hex: {skin_hex}", file=sys.stderr)

                # --- 7. FACE TEXTURE EXTRACTION (New) ---
                texture_filename = None
                try:
                    # Get bounds of the facial features
                    feat_pts = [10, 152, 234, 454] # Top, Bottom, Left, Right
                    xs = [landmarks[i].x for i in feat_pts]
                    ys = [landmarks[i].y for i in feat_pts]
                    
                    min_x, max_x = min(xs), max(xs)
                    min_y, max_y = min(ys), max(ys)
                    
                    # Add padding (20%)
                    pad_x = (max_x - min_x) * 0.2
                    pad_y = (max_y - min_y) * 0.2
                    
                    x1 = max(0, int((min_x - pad_x) * w))
                    y1 = max(0, int((min_y - pad_y) * h))
                    x2 = min(w, int((max_x + pad_x) * w))
                    y2 = min(h, int((max_y + pad_y) * h))
                    
                    face_crop = img_np[y1:y2, x1:x2]
                    
                    if face_crop.size > 0:
                        # Convert back to BGR for OpenCV save
                        if mp_image.image_format == mp.ImageFormat.SRGB or mp_image.image_format == mp.ImageFormat.SRGBA:
                            face_crop_bgr = cv2.cvtColor(face_crop, cv2.COLOR_RGB2BGR)
                        else:
                            face_crop_bgr = face_crop # Already BGR or similar
                            
                        # Resize to power of two for Three.js performance
                        face_crop_bgr = cv2.resize(face_crop_bgr, (512, 512))

                        # Create a 4-channel image (RGBA)
                        face_rgba = cv2.cvtColor(face_crop_bgr, cv2.COLOR_BGR2BGRA)
                        
                        # Create a radial gradient mask for feathering
                        h_resized, w_resized = face_rgba.shape[:2]
                        mask = np.zeros((h_resized, w_resized), dtype=np.float32)  # type: ignore[attr-defined]
                        center_x = w_resized // 2
                        center_y = h_resized // 2
                        radius = min(h_resized, w_resized) // 2

                        for y_mask in range(h_resized):
                            for x_mask in range(w_resized):
                                dist_mask = math.sqrt((x_mask - center_x) ** 2 + (y_mask - center_y) ** 2)
                                if dist_mask < radius * 0.7:
                                    mask[y_mask, x_mask] = 1.0
                                elif dist_mask < radius:
                                    mask[y_mask, x_mask] = 1.0 - (dist_mask - radius * 0.7) / (radius * 0.3)
                                else:
                                    mask[y_mask, x_mask] = 0.0

                        # Apply mask to alpha channel
                        face_rgba[:, :, 3] = (mask * 255).astype(np.uint8)  # type: ignore[attr-defined]
                        
                        # Save as PNG
                        base_path = os.path.splitext(image_path)[0]
                        texture_filename = os.path.basename(str(base_path)) + "_texture.png"
                        texture_save_path = str(base_path) + "_texture.png"
                        
                        cv2.imwrite(texture_save_path, face_rgba)
                        print(f"DEBUG: Saved Feathered Texture to {texture_save_path}", file=sys.stderr)
                        
                except Exception as ex:
                    print(f"DEBUG: Texture Extraction Failed: {str(ex)}", file=sys.stderr)
                    
        except Exception as e:
            print(f"DEBUG: Color Extraction Failed: {str(e)}", file=sys.stderr)

        def clamp(v):
            return max(0.0, min(1.0, v))

        return {
            "success": True,
            "faceWidth": clamp(norm_face_width),
            "jawWidth": clamp(norm_jaw_width),
            "noseWidth": clamp(norm_nose_width),
            "eyeSize": clamp(norm_eye_size),
            "chinHeight": clamp(norm_chin_height),
            "skinColor": skin_hex,
            "faceTexture": texture_filename,
            "landmarks": [{"x": l.x, "y": l.y, "z": l.z} for l in landmarks], # FULL MESH
            "debug": {
                "aspect": aspect_ratio,
                "jaw": jaw_ratio,
                "nose": nose_ratio
            }
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)
        
    image_path = sys.argv[1]
    try:
        result = analyze_face(image_path)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
