import sys
import json
import cv2
import mediapipe as mp
import math

def analyze_face(image_path):
    mp_face_mesh = mp.solutions.face_mesh
    
    # Initialize Face Mesh
    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5
    ) as face_mesh:
        
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            return {"error": "Could not read image"}

        results = face_mesh.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

        if not results.multi_face_landmarks:
            return {"error": "No face detected"}

        landmarks = results.multi_face_landmarks[0].landmark

        # Helper to get coords
        def get_pt(idx):
            return (landmarks[idx].x, landmarks[idx].y, landmarks[idx].z)

        def dist(p1, p2):
            return math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2 + (p1[2]-p2[2])**2)

        # MEDIA PIPE LANDMARK INDICES (Approximate)
        # Left Eye: 33 (corner), 133 (corner)
        # Right Eye: 362 (corner), 263 (corner)
        # Nose: 1 (tip), 195, 197 (width?) - Let's use alares: 64, 294
        # Mouth: 61, 291 (corners)
        # Face Width: 234 (left cheek), 454 (right cheek)
        # Face Height: 10 (top), 152 (chin)
        # Jaw: 58 (right), 288 (left)? -> specific jawline points 
        # Jaw Width (Gonions): 172, 397 (approx)

        # Points
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

        mouth_L = get_pt(61)
        mouth_R = get_pt(291)
        
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
        # We need to normalize against face dimensions to be robust to zoom/distance
        
        # 1. Face Width Ratio (Aspect Ratio)
        # Standard Width/Height is approx 0.7 - 0.75
        # If > 0.75 -> Wide Face (1.0). If < 0.7 -> Narrow Face (0.0)
        aspect_ratio = face_width / face_height
        norm_face_width = (aspect_ratio - 0.65) / (0.85 - 0.65)
        
        # 2. Jaw Width Ratio (relative to Face Width)
        # Jaw usually ~0.8-0.9 of Face Width
        jaw_ratio = jaw_width_raw / face_width
        norm_jaw_width = (jaw_ratio - 0.7) / (1.0 - 0.7)

        # 3. Nose Width Ratio (relative to Face Width)
        # Nose ~0.25 of Face
        nose_ratio = nose_width_raw / face_width
        norm_nose_width = (nose_ratio - 0.2) / (0.35 - 0.2)
        
        # 4. Eye Size Ratio (relative to Face Width)
        # Eye ~0.2 of Face
        eye_ratio = avg_eye_width / face_width
        norm_eye_size = (eye_ratio - 0.15) / (0.28 - 0.15)

        # 5. Chin Height (Distance from lip bottom to chin / Face Height)
        lip_bottom = get_pt(17)
        chin_len = dist(lip_bottom, chin)
        chin_ratio = chin_len / face_height
        norm_chin_height = (chin_ratio - 0.1) / (0.2 - 0.1)

        def clamp(v):
            return max(0.0, min(1.0, v))

        return {
            "success": True,
            "faceWidth": clamp(norm_face_width),
            "jawWidth": clamp(norm_jaw_width),
            "noseWidth": clamp(norm_nose_width),
            "eyeSize": clamp(norm_eye_size),
            "chinHeight": clamp(norm_chin_height),
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
