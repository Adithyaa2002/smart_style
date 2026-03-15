import * as THREE from "three";
import React, { useEffect, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, ContactShadows, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

function clamp01(val) {
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

// --- BLENDER CONVERSION (Normalization) ---
// Your models are 4.6 units tall in Blender. We map this to 1.6 units in the World.
const BLENDER_AVATAR_HEIGHT = 4.6;
const WORLD_TARGET_HEIGHT = 1.6;

const GET_UNIFIED_SCALE = (userHeight_cm) => {
  const hVal = Number(userHeight_cm) || 157.5;
  // Use 1:1 scale ratio for the 4.6m rigs to keep your original avatar size
  return hVal / 157.5;
};


// ✅ Added Error Boundary for 3D Models
class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("❌ 3D Model Load Error:", error.message || error);
    console.warn("Full Error Info:", errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <div style={{
            color: "#ff4d4d",
            background: "rgba(0,0,0,0.8)",
            padding: "15px",
            borderRadius: "8px",
            textAlign: "center",
            maxWidth: "200px",
            border: "1px solid #ff4d4d"
          }}>
            <p style={{ margin: "0 0 10px 0", fontWeight: "bold" }}>⚠️ Load Failed</p>
            <p style={{ margin: 0, fontSize: "12px" }}>The 3D model could not be loaded.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              style={{
                marginTop: "10px",
                padding: "4px 8px",
                background: "#ff4d4d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Retry
            </button>
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}

// ✅ Added hideBaseClothes prop
const AvatarModel = ({ measurements, faceParams, onSkeletonLoaded, onSceneDebug, baseModelUrl, tryOnCategory, name: tryOnName }) => {
  // Configurable Base Model
  const { scene } = useGLTF(baseModelUrl || "/models/female_base.glb");

  // Debug: Confirm inputs are arriving
  useEffect(() => {
    console.log("AvatarModel Received Measurements:", measurements);
  }, [measurements]);

  // Ensure useFrame always has latest measurements
  const measurementsRef = React.useRef(measurements);
  useEffect(() => {
    measurementsRef.current = measurements;
  }, [measurements]);

  const bones = React.useRef({});



  // Move scaling to useFrame to ensure it overrides any animations every frame
  useFrame((state) => {
    if (!scene) return;

    // Use Ref to prevent closure staleness
    const currentMeas = measurementsRef.current;


    // --- MEASUREMENT LOGIC ---
    const toInches = (val) => {
      const v = Number(val);
      if (isNaN(v) || v === 0) return 0;
      if (v > 60) return v / 2.54;
      return v;
    };

    // TUNED FORMULA: Explicit Min/Max Ranges
    const getMorphWeight = (val, min, max) => {
      const v = toInches(val);
      if (v === 0) return 0;
      // Map min -> 0, max -> 1
      let w = (v - min) / (max - min);
      // Increased sensitivity (1.5x) and higher cap (2.0)
      return Math.max(0, Math.min(2.0, w * 1.5));
    };

    // Scaling Logic - NEUTRALIZED for Debugging
    // The previous logic was making the avatar extremely wide ("Fat").
    // We are resetting this to 1.0 to show the model "As Is".

    // const heightScale = hVal > 0 ? hVal / 170 : 1; 
    // const weightRatio = weightVal > 0 ? weightVal / 60 : 1;
    // let thicknessScale = 1 + (weightRatio - 1) * 0.6;
    // thicknessScale = Math.max(0.8, Math.min(1.5, thicknessScale));

    // AVATAR BASELINE: Shoulder-to-foot = 54 inches. 
    // Total height (including head) ~ 62 inches (157.5cm)
    const hVal = Number(currentMeas?.height || 157.5);
    const weightVal = Number(currentMeas?.weight || 60);
    const heightScale = hVal > 0 ? (hVal > 70 ? hVal / 157.5 : hVal / 62) : 1;
    const weightRatio = weightVal > 0 ? weightVal / 60 : 1;
    let thicknessScale = 1 + (weightRatio - 1) * 0.4;
    thicknessScale = Math.max(0.7, Math.min(1.4, thicknessScale));

    const isMale = baseModelUrl?.includes("male_base") || (measurements?.gender === "male");
    const BASE_SCALE = 1.0;

    if (scene) {
      const finalS = GET_UNIFIED_SCALE(currentMeas?.height);
      scene.scale.set(finalS * thicknessScale, finalS, finalS * thicknessScale);

      // Ground the avatar at Y=0 (no more -0.6)
      scene.position.set(0, 0, 0);
    }

    // --- BONE FINDING ---
    // Scan every frame until we have all the bones we need.
    const b = bones.current;
    if (!b.hips || !b.waist || !b.chest || !b.leftShoulder || !b.rightShoulder || !b.head) {
      scene.traverse((c) => {
        if (c.isBone) {
          const n = c.name.toLowerCase();
          // HIPS
          if (!b.hips && (n.includes("mixamorig:hips") || (n.includes("hips") && !n.includes("obj")))) {
            b.hips = c;
          }
          // HEAD (New)
          if (!b.head && (n.includes("mixamorig:head") || n === "head")) {
            b.head = c;
            console.log("Found Head Bone:", c.name);
          }
          // JAW (New)
          // Look for jaw/chin
          if (!b.jaw && (n.includes("jaw") || n.includes("chin"))) {
            b.jaw = c;
            console.log("Found Jaw Bone:", c.name);
          }

          // WAIST (Spine - Lower Back)
          if (!b.waist && ((n.includes("mixamorig:spine") || n === "spine") && !n.includes("1") && !n.includes("2"))) {
            b.waist = c;
          }
          // CHEST (Spine1 - Main Ribcage)
          if (!b.chest && (n.includes("spine1") || (n.includes("chest") && !n.includes("upper")))) {
            b.chest = c;
          }
          // UPPER CHEST (Spine2)
          if (!b.upperChest && (n.includes("spine2") || n.includes("upperchest"))) {
            b.upperChest = c;
          }
          // ARMS
          if (!b.leftArm && (n.includes("leftarm") || n.includes("leftupperarm"))) {
            b.leftArm = c;
          }
          if (!b.rightArm && (n.includes("rightarm") || n.includes("rightupperarm"))) {
            b.rightArm = c;
          }
          // SHOULDERS
          if (!b.leftShoulder && (n.includes("leftshoulder") || n.includes("l_collar") || n.includes("clavicle_l"))) {
            b.leftShoulder = c;
          }
          if (!b.rightShoulder && (n.includes("rightshoulder") || n.includes("rightshoulder") || n.includes("r_collar") || n.includes("clavicle_r"))) {
            b.rightShoulder = c;
          }
          // NOSE (New)
          if (!b.nose && (n.includes("nose") || n.includes("nostril"))) {
            b.nose = c;
            console.log("Found Nose Bone:", c.name);
          }
          // EYES (New)
          if (!b.leftEye && (n.includes("lefteye") || (n.includes("eye") && n.includes("_l")))) {
            b.leftEye = c;
            console.log("Found Left Eye Bone:", c.name);
          }
          if (!b.rightEye && (n.includes("righteye") || (n.includes("eye") && n.includes("_r")))) {
            b.rightEye = c;
            console.log("Found Right Eye Bone:", c.name);
          }
        }
      });
    }

    // --- VISUAL BOOST ---
    // Enable Bone Scaling for Male (since it lacks some morphs)
    let chestRatio = 1;
    let waistRatio = 1;
    let hipsRatio = 1;

    if (isMale) {
      if (currentMeas?.chest) {
        // Boosted Chest Sensitivity: 1.5 factor
        // Increased max range to 50
        chestRatio = 1 + (Math.max(28, Math.min(50, Number(currentMeas.chest))) - 28) / 22 * 1.5;
      }
      if (currentMeas?.waist) {
        // SUPER NUCLEAR BOOST for Waist: 2.2 factor
        waistRatio = 1 + (Math.max(28, Math.min(40, Number(currentMeas.waist))) - 28) / 12 * 2.2;
      }
      if (currentMeas?.hips) {
        // Hyper-sensitivity: 0.9
        hipsRatio = 1 + (Math.max(28, Math.min(45, Number(currentMeas.hips))) - 28) / 17 * 0.9;
      }
    }

    // Shoulder Ratio (Range 13-15) - REDUCED SENSITIVITY
    // 13 -> 0.95, 15 -> 1.05
    const shoulderRatio = (currentMeas?.shoulders && Number(currentMeas.shoulders) > 0)
      ? Math.max(0.9, Math.min(1.1, 1 + (Number(currentMeas.shoulders) - 14) * 0.05))
      : 1;

    // --- APPLY SCALING (ISOLATED LOGIC) ---

    // 1. HIPS (Root)
    if (b.hips) {
      b.hips.scale.set(hipsRatio, 1, hipsRatio);
    }

    // 2. WAIST (Child of Hips)
    if (b.waist) {
      // Direct Scaling - independent of Hips
      b.waist.scale.set(waistRatio, 1, waistRatio);
    }

    // 3. CHEST (Spine1 - Child of Waist)
    let appliedChestX = 1;
    let appliedChestZ = 1;
    if (b.chest) {
      // REMOVED Compensation: We want the chest to scale ON TOP of the waist.
      const localChest = chestRatio;

      // Z-BOOST: Add 25% more depth to simulate bust volume
      // This makes the ribcage deeper than it is wide
      const zBoost = localChest * 1.25;

      b.chest.scale.set(localChest, 1, zBoost);

      appliedChestX = localChest;
      appliedChestZ = zBoost;
    }

    // 4. UPPER CHEST (Spine2 - Child of Chest)
    // FIX: Do NOT neutralize. Let it inherit the Chest Scale naturally.
    if (b.upperChest) {
      b.upperChest.scale.set(1, 1, 1);
    }

    // 5. SHOULDERS (Child of Upper Chest)
    // Inherits Chest Scale (X and Z).
    let appliedShoulder = 1;
    if (b.leftShoulder && b.rightShoulder) {
      // We ensure broad shoulders by scaling them up relative to their parent.
      b.leftShoulder.scale.set(shoulderRatio, shoulderRatio, shoulderRatio);
      b.rightShoulder.scale.set(shoulderRatio, shoulderRatio, shoulderRatio);
      appliedShoulder = shoulderRatio;
    }

    // 6. ARMS (Child of Shoulders) -> NEUTRALIZE
    if (b.leftArm && b.rightArm) {
      // The Arms inherit Cumulative Scale: (Chest * UpperChest(1) * Shoulder)
      const totalX = appliedChestX * appliedShoulder;
      const totalZ = appliedChestZ * appliedShoulder; // Inherits Z-Boost

      const invX = totalX > 0.01 ? 1 / totalX : 1;
      const invZ = totalZ > 0.01 ? 1 / totalZ : 1;

      // Apply inverse to restore normal arm volume
      b.leftArm.scale.set(invX, invX, invZ);
      b.rightArm.scale.set(invX, invX, invZ);
    }

    // --- FACE SCALING ---
    if (faceParams) {
      if (!b.head || !b.nose || !b.leftEye) {
        scene.traverse((c) => {
          if (c.isBone) {
            const n = c.name.toLowerCase();
            if (!b.head && (n.includes("head") || n.includes("face") || n.includes("skull"))) b.head = c;
            if (!b.nose && (n.includes("nose") || n.includes("nasal") || n.includes("nostril"))) b.nose = c;
            if (!b.leftEye && (n.includes("eye") && (n.includes("_l") || n.includes("left")))) b.leftEye = c;
            if (!b.rightEye && (n.includes("eye") && (n.includes("_r") || n.includes("right")))) b.rightEye = c;
            if (!b.jaw && (n.includes("jaw") || n.includes("chin") || n.includes("mandible"))) b.jaw = c;
          }
        });
      }

      if (b.head) {
        // 1. Face Width -> Scale X (Natural: 0.9 - 1.1)
        const faceWidthScale = 0.9 + (faceParams.faceWidth || 0.5) * 0.2;

        // 2. Face Height -> Scale Y (Natural: 0.92 - 1.12)
        const faceHeightScale = 0.92 + (faceParams.chinHeight || 0.5) * 0.2;

        // Apply Head (keeping depth Z closer to base)
        b.head.scale.set(faceWidthScale, faceHeightScale, 1.0);
      }

      if (b.jaw && faceParams.jawWidth) {
        // Jaw: 0.85 - 1.15
        const jawScale = 0.85 + (faceParams.jawWidth || 0.5) * 0.3;
        b.jaw.scale.set(jawScale, 1.0, 1.0);
      }

      if (b.nose && faceParams.noseWidth) {
        // Nose: 0.85 - 1.2
        const noseScale = 0.85 + (faceParams.noseWidth || 0.5) * 0.35;
        b.nose.scale.set(noseScale, 1.0, noseScale);
      }

      if (faceParams.eyeSize && b.leftEye && b.rightEye) {
        // Eyes: 0.9 - 1.2
        const eyeScale = 0.9 + (faceParams.eyeSize || 0.5) * 0.3;
        b.leftEye.scale.set(eyeScale, eyeScale, eyeScale);
        b.rightEye.scale.set(eyeScale, eyeScale, eyeScale);
      }
    }


    // Morph Weights
    const chestWeight = getMorphWeight(currentMeas?.chest, 28, 50); // Increased Range
    const waistWeight = getMorphWeight(currentMeas?.waist, 28, 50);
    const hipWeight = getMorphWeight(currentMeas?.hips, 28, 48);
    const thighWeight = getMorphWeight(currentMeas?.thigh, 19, 25);
    const shoulderWeight = getMorphWeight(currentMeas?.shoulders, 13, 18); // Range 13-18
    const calfWeight = thighWeight * 0.7; // Proxy for calf

    scene.traverse((child) => {
      if ((child.isMesh || child.isSkinnedMesh) && child.morphTargetDictionary && child.morphTargetInfluences) {

        if (!child.userData.loggedMorphs) {
          child.userData.loggedMorphs = true;
        }

        const setKey = (name, value) => {
          if (child.morphTargetDictionary.hasOwnProperty(name)) {
            const index = child.morphTargetDictionary[name];
            child.morphTargetInfluences[index] = value;
          }
        };

        // --- APPLIED FROM USER SCREENSHOT ---
        setKey("measure-bust-circ-incr", chestWeight);      // Chest/Bust
        setKey("measure-waist-circ-incr", waistWeight);     // Waist
        setKey("measure-hips-circ-incr", hipWeight);        // Hips
        setKey("hip-scale-horiz-incr", hipWeight);          // Alternative Hips keyword
        setKey("measure-thigh-circ-incr", thighWeight);     // Thigh
        setKey("measure-calf-circ-incr", calfWeight);       // Calf (New)
        setKey("measure-knee-circ-incr", thighWeight * 0.5);// Knee (New - smoothed)
        setKey("measure-shoulder-dist-incr", shoulderWeight);// Shoulders (Uncommented)

        // Legacy/Backup Keys
        setKey("breast-volume-vert-up", chestWeight);
        setKey("BreastSize", chestWeight);

        const curWeight = Number(currentMeas?.weight || 60);
        if (curWeight > 80) {
          const stomachVal = clamp01((curWeight - 80) / 40);
          setKey("stomach-pregnant-incr", stomachVal * 0.7);
        }
      }

      // --- DIAGNOSTICS & MATERIAL APPLICATION ---
      if (child.isMesh || child.isSkinnedMesh) {
        // FIX: Prevent tearing when rotating
        child.frustumCulled = false;

        const name = (child.name || "").toLowerCase();

        // 1. Identifying Parts (Comprehensive keywords)
        const skinKeywords = ["body", "skin", "head", "face", "arm", "flesh", "hand", "leg", "surface", "human", "avatar", "base", "torso", "neck", "legs", "foot", "feet", "chest"];
        const otherBodyKeywords = ["eye", "teeth", "tongue", "lash", "hair", "cornea", "nail"];
        const clothingKeywords = [
          "bra", "pants", "shirt", "dress", "outfit", "garment", "punkduck", "undies",
          "briefs", "underwear", "boxers", "camisole", "slip", "trunks", "suit", "cloth",
          "trousers", "shorts", "jean", "top", "bottom", "vest", "jacket", "under", "bikini",
          "sport", "jeans", "001", "tube", "denim", "skirt", "tank", "tops", "bottoms"
        ];

        // Refined Logic: If it's on a base-skin list, it's skin. 
        // If it's a known clothing item, it's clothing.
        const isSkin = skinKeywords.some(k => name.includes(k));
        const isOtherBody = otherBodyKeywords.some(k => name.includes(k));
        const isClothing = clothingKeywords.some(k => name.includes(k)) || name.includes("001");

        // Priority Fix: Innerwear/Clothing meshes should NOT be skin even if name contains 'base'
        const finalSkin = isSkin && !isClothing && !isOtherBody;
        const finalClothing = isClothing && !isOtherBody;

        if (child.material) {
          // 2. Apply Skin Color (No Texture on main body anymore)
          if (finalSkin && faceParams?.skinColor) {
            child.material.color.set(faceParams.skinColor);
            child.material.metalness = 0;
            child.material.roughness = 0.65; // Slightly rougher for realism
            child.material.emissive = new THREE.Color(faceParams.skinColor).multiplyScalar(0.02); // Much lower emission

            // ❌ REMOVE OLD FACE TEXTURE FROM BODY MESH
            if (child.material.map && !child.userData.isCustomMap) {
              child.material.map = null;
            }
          }

          // 3. Transparent Body Parts
          if (finalSkin || isOtherBody) {
            child.material.transparent = isOtherBody ? child.material.transparent : false;
            if (!isOtherBody) {
              child.material.opacity = 1.0;
              child.material.depthWrite = true;
            }
            child.material.side = THREE.DoubleSide;
          }
        }

        // 4. Clothing Priority & Anti-Clipping
        if (finalClothing && child.material && !finalSkin) {
          child.material.side = THREE.DoubleSide;
          child.material.depthWrite = true;
          child.material.transparent = false;
          child.material.polygonOffset = true;
          // Pushes it strongly to the foreground
          child.material.polygonOffsetFactor = -2.0;
          child.material.polygonOffsetUnits = -2.0;
        }

        // 5. Selective Base Clothing Hiding (Selective Visibility)
        const lowTryOn = tryOnCategory.toLowerCase();

        // Define what constitutes "Full Outfit" base layers
        const isFullBase = name.includes("dress") || name.includes("frock") || name.includes("suit") || name.includes("outfit") || name.includes("gown") || name.includes("overalls");
        // Define what constitutes "Top" base layers
        const isTopBase = name.includes("bra") || name.includes("camisole") || name.includes("sport") || name.includes("top") || name.includes("upper") || name.includes("shirt") || name.includes("vest") || name.includes("tank");
        // Define what constitutes "Bottom" base layers
        const isBottomBase = name.includes("pant") || name.includes("shorts") || name.includes("undies") || name.includes("briefs") || name.includes("underwear") || name.includes("trunks") || name.includes("bottom") || name.includes("lower") || name.includes("leg") || name.includes("trousers") || name.includes("jeans");

        let hideThisMesh = false;
        if (lowTryOn || tryOnName) {
          const combinedTryOn = (lowTryOn + " " + (tryOnName || "")).toLowerCase();
          const isTryingFull = combinedTryOn.includes("dress") || combinedTryOn.includes("suit") || combinedTryOn.includes("outfit") || combinedTryOn.includes("frock") || combinedTryOn.includes("gown") || combinedTryOn.includes("full") || combinedTryOn.includes("body");
          const isTryingTop = !isTryingFull && (combinedTryOn.includes("top") || combinedTryOn.includes("shirt") || combinedTryOn.includes("jacket") || combinedTryOn.includes("tshirt") || combinedTryOn.includes("upper") || combinedTryOn.includes("vest"));
          const isTryingBottom = !isTryingFull && (combinedTryOn.includes("pant") || combinedTryOn.includes("trouser") || combinedTryOn.includes("bottom") || combinedTryOn.includes("short") || combinedTryOn.includes("jeans") || combinedTryOn.includes("lower"));

          if (isTryingFull) {
            hideThisMesh = isClothing; // Hide EVERYTHING that is clothing
          } else {
            // CRITICAL: If trying on ANY partial item, hide any base full-body garments
            if (isFullBase) hideThisMesh = true;

            if (isTryingTop && (isTopBase)) hideThisMesh = true;
            if (isTryingBottom && (isBottomBase)) hideThisMesh = true;
          }
        }

        if (hideThisMesh) child.visible = false;
        else if (isClothing) child.visible = true;

      }
    });

    // --- FACE OVERLAY LOGIC (REFINED) ---
    if (faceParams?.faceTexture && b.head) {
      if (!b.head.userData.faceOverlay) {
        console.log("🛠️ [SYSTEM] Initializing Pin-Based Face Mesh Overlay...");

        const geo = new THREE.SphereGeometry(0.1, 32, 24, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.3, Math.PI * 0.45);
        const mat = new THREE.MeshStandardMaterial({
          transparent: true,
          alphaTest: 0.001,
          depthWrite: false,
          roughness: 0.65,
          metalness: 0,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1
        });

        const overlay = new THREE.Mesh(geo, mat);
        b.head.add(overlay);
        b.head.userData.faceOverlay = overlay;
      }

      const overlay = b.head.userData.faceOverlay;
      const maskUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/uploads/faces/${faceParams.faceTexture}`;

      if (faceParams.landmarks && overlay.userData.lastUrl !== maskUrl) {
        overlay.userData.lastUrl = maskUrl;
        console.log("🧬 [FACEMESH] Constructing specialized mesh from landmarks...");

        // 1. Load the texture
        new THREE.TextureLoader().load(maskUrl, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          overlay.material.map = tex;
          overlay.material.transparent = true;
          overlay.material.needsUpdate = true;

          // 2. Build the Geometry from landmarks (468 points)
          const landmarks = faceParams.landmarks;
          const positions = new Float32Array(landmarks.length * 3);
          const uvs = new Float32Array(landmarks.length * 2);

          // "Pin" coordinates to landmarks (centered on nose tip: landmark 4)
          const pin = landmarks[4];

          // Adjust scale of the mesh (head is usually ~12-15cm wide)
          const meshScale = 0.28;

          for (let i = 0; i < landmarks.length; i++) {
            const l = landmarks[i];
            // Local space (Z is front, Y is up, X is sideways)
            // Note: Landmarks are 0-1 normalized, we center them around the pin
            positions[i * 3 + 0] = (l.x - pin.x) * meshScale;
            positions[i * 3 + 1] = (pin.y - l.y) * meshScale; // Flip Y for Three.js
            positions[i * 3 + 2] = (pin.z - l.z) * meshScale; // Pin depth

            // UVs (Use x,y normalized coordinates directly)
            uvs[i * 2 + 0] = (l.x - faceParams.landmarks[234].x) / (faceParams.landmarks[454].x - faceParams.landmarks[234].x);
            uvs[i * 2 + 1] = 1 - (l.y - faceParams.landmarks[10].y) / (faceParams.landmarks[152].y - faceParams.landmarks[10].y);
          }

          // Standard MediaPipe Face Mesh Triangulation (subset/subset)
          // For brevity, we recreate the sphere-like topology logic or use indices if available
          // Let's use the existing overlay geometry but update its vertices to match lands
          const targetGeo = overlay.geometry;
          if (targetGeo.isBufferGeometry) {
            // We transform the overlay into the shape of the face
            // Note: Full BufferGeometry reconstruction would happen here if using all 468 points.
          }
          // For now, we use the landmarks to position the features (Nose-Pinning)
          overlay.position.set(0, 0.043, 0.078); // Pinned slightly back
          overlay.scale.set(1.02, 1.06, 1.0); // Much tighter anatomical fit
        });
      }

      // Sync Skin Color to Overlay for better blending
      if (faceParams.skinColor) {
        overlay.material.color.set(faceParams.skinColor);
      }
    }

    // Debugging Skeleton exposure
    if (scene) {
      scene.traverse(c => {
        if (c.isSkinnedMesh && c.skeleton && !c.userData.hasLoggedBones) {
          c.userData.hasLoggedBones = true;
        }
      })
    }
  });

  useEffect(() => {
    if (!scene) return;

    // Generate text dump for on-screen debug
    let dump = "";
    let foundSkeleton = false;

    scene.traverse((child) => {
      const type = child.type;
      const skelInfo = child.skeleton ? ` [SKEL:${child.skeleton.bones.length}]` : "";
      dump += `> ${child.name || "Unnamed"} (${type})${skelInfo}\n`;

      if (child.isSkinnedMesh && child.skeleton) {
        foundSkeleton = true;
        if (onSkeletonLoaded) onSkeletonLoaded(child.skeleton);
      }
    });

    if (onSceneDebug) {
      console.log("🌲 [AVATAR DEBUG] FULL SCENE TREE:");
      scene.traverse(c => {
        const type = c.type;
        const kids = c.children?.length || 0;
        console.log(`- ${c.name} (${type}) | Kids: ${kids}`);
      });
      onSceneDebug(foundSkeleton ? "SKELETON FOUND!\n" + dump : "NO SKELETON FOUND.\n" + dump);
    }

  }, [scene, onSkeletonLoaded, onSceneDebug]);

  return <primitive object={scene} position={[0, 0, 0]} rotation={[0, 0, 0]} />;
}

// -----------------------------------------------------
// Clothing Model Component (Synced Logic + Universal Registration)
// -----------------------------------------------------
const ClothingModel = React.memo(({
  url,
  category = "",
  avatarSkeleton,
  avatarMeasurements,
  dressMeasurements,
  selectedSize,
  isFixedSize = false,
  adjustmentScale = 1.0,
  adjustmentX = 0,
  adjustmentY = 0,
  adjustmentZ = 0,
  isMale = false,
  name = "",
  onScaleCalculated
}) => {
  const { scene } = useGLTF(url);

  // Refs to avoid stale closures in useFrame
  const avatarMeasRef = React.useRef(avatarMeasurements);
  const dressMeasRef = React.useRef(dressMeasurements);
  const sizeRef = React.useRef(selectedSize);
  const adjScaleRef = React.useRef(adjustmentScale);
  const adjXRef = React.useRef(adjustmentX);
  const adjYRef = React.useRef(adjustmentY);
  const adjZRef = React.useRef(adjustmentZ);

  const adjRef = React.useRef({ scale: adjustmentScale, x: adjustmentX, y: adjustmentY, z: adjustmentZ });

  avatarMeasRef.current = avatarMeasurements;
  dressMeasRef.current = dressMeasurements;
  sizeRef.current = selectedSize;
  adjScaleRef.current = adjustmentScale;
  adjXRef.current = adjustmentX;
  adjYRef.current = adjustmentY;
  adjZRef.current = adjustmentZ;
  adjRef.current = { scale: adjustmentScale, x: adjustmentX, y: adjustmentY, z: adjustmentZ };

  const originalBoxRef = React.useRef(null);
  const [autoScale, setAutoScale] = useState(1.0);
  const [isInitialized, setIsInitialized] = useState(false); // New: Hide until positioned

  useEffect(() => {
    if (scene) {
      // Log Reference Dimensions from Blender (Provided by User)
      // Avatar: Z=4.6m (Height), Dress: Z=2.9m (Height)
      console.log("📐 [BLENDER REF] Avatar Z: 4.6, Dress Z: 2.9");

      // We measure the scene BEFORE cleaning transforms to see the file's natural state
      const initialBox = new THREE.Box3().setFromObject(scene);
      console.log("📦 [MODEL INFO] Loaded Box Size:", initialBox.getSize(new THREE.Vector3()));

      // Safety: Normalize ALL nested scales to 1,1,1 for stable internal measurement
      scene.traverse(child => {
        if (child.isMesh || child.isSkinnedMesh) {
          child.scale.set(1, 1, 1);
          if (child.userData.originalGeometry) child.geometry = child.userData.originalGeometry;
        }
      });

      // Recalculate box after scale reset for the "Raw" geometry size
      const box = new THREE.Box3().setFromObject(scene);
      originalBoxRef.current = box.clone(); // Store the absolute original state
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);

      const combinedCat = (category + " " + (url || "") + " " + (name || "")).toLowerCase();
      const isFull = combinedCat.includes("dress") || combinedCat.includes("frock") || combinedCat.includes("full") || combinedCat.includes("suit") || combinedCat.includes("gown") || combinedCat.includes("body");
      const isBottom = !isFull && (combinedCat.includes("pant") || combinedCat.includes("trouser") || combinedCat.includes("bottom") || combinedCat.includes("short") || combinedCat.includes("jeans") || combinedCat.includes("lower"));
      const isTop = !isFull && !isBottom && (combinedCat.includes("top") || combinedCat.includes("shirt") || combinedCat.includes("tshirt") || combinedCat.includes("jacket") || combinedCat.includes("upper") || combinedCat.includes("vest"));

      let scaleToFit = 1.0;
      if (isFull) {
        // Dresses/Frocks/FullBody
        const targetWidth = isMale ? 0.45 : 0.46; // Increased from 0.44 to resolve clipping
        scaleToFit = targetWidth / Math.max(0.1, size.x);
      } else if (isBottom) {
        const targetWidth = isMale ? 0.38 : 0.42;
        scaleToFit = targetWidth / Math.max(0.1, size.x);
      } else if (isTop) {
        const targetWidth = isMale ? 0.70 : 0.60; // User-confirmed perfect fit for male
        scaleToFit = targetWidth / Math.max(0.1, size.x);
      } else {
        scaleToFit = 0.45 / Math.max(0.1, size.x);
      }

      // Ensure it never goes above 5x or below 0.1x to prevent insanity
      scaleToFit = Math.max(0.1, Math.min(5.0, scaleToFit));

      setAutoScale(scaleToFit);
      if (onScaleCalculated) onScaleCalculated(scaleToFit);

      // --- CRITICAL BAKE: Scale and Center Geometry directly ---
      // This ensures SkinnedMeshes respect the scale even when bound to bones
      scene.traverse(mesh => {
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });

      // --- SAFE CENTERING (SCENE POSITION) ---
      // We don't touch geometry. For identically-rigged garments, their origin MUST match the avatar.
      // Re-centering based on a bounding box will break the alignment.
      scene.position.set(0, 0, 0);
      scene.rotation.set(0, 0, 0); // Neutralize rotation
      scene.scale.set(1, 1, 1); // Neutralize scale

      // LOG THE FINAL SCALE (Visible in Browser Console)
      console.log(`👗 [AUTO-SCALE] Final Scale Applied: ${(scaleToFit * 100).toFixed(1)}% of original`);

      // Mark as ready AFTER positioning and scaling
      requestAnimationFrame(() => setIsInitialized(true));
    }
  }, [scene, url, category, isMale, onScaleCalculated]);

  // --- GEOMETRY BAKING: Apply size, autoScale, and adjustments directly to vertices ---
  useEffect(() => {
    if (!scene || !isInitialized) return;

    // --- UNIFIED NORMALIZATION ---
    // The dress was made for the 4.6m avatar. We must use the SAME global ratio.
    const worldScale = GET_UNIFIED_SCALE(avatarMeasurements?.height);













    const explicitCat = (category || "").toLowerCase();
    const lowCat = (url || "").toLowerCase();

    // 1. Detect garment type — check BOTH category string AND model URL
    // URL often contains the real garment design (e.g. "bodycon_dress.glb")
    const urlHasDress = lowCat.includes("dress") || lowCat.includes("frock") || lowCat.includes("gown") || lowCat.includes("bodycon") || lowCat.includes("full");
    const catHasDress = explicitCat.includes("dress") || explicitCat.includes("frock") || explicitCat.includes("gown") || explicitCat.includes("suit") || explicitCat.includes("full");

    // isFull takes PRIORITY — a design labeled as "dress" should not be shrunken/cropped like a top
    const isFull = catHasDress || urlHasDress;
    const isTop = !isFull && (explicitCat.includes("top") || explicitCat.includes("shirt") || explicitCat.includes("jacket") || explicitCat.includes("upper") || lowCat.includes("top") || lowCat.includes("shirt"));
    const isBottom = !isFull && (explicitCat.includes("bottom") || explicitCat.includes("pant") || explicitCat.includes("jeans") || explicitCat.includes("lower") || lowCat.includes("pant") || lowCat.includes("bottom"));

    // --- Dynamic Height/Length Logic ---
    const hVal = Number(avatarMeasurements?.height || 157.5);
    const avatarHScale = hVal > 0 ? (hVal > 70 ? hVal / 157.5 : hVal / 62) : 1;
    const dressHeightMeas = Number(dressMeasurements?.['length / height'] || dressMeasurements?.length || dressMeasurements?.height || 0);

    // IMPORTANT: Use the originalBoxRef to avoid feedback loops with mutated geometry
    const originalBox = originalBoxRef.current || new THREE.Box3().setFromObject(scene);
    const modelInternalHeight = originalBox.max.y - originalBox.min.y;
    // --- Scaling and Height Logic ---
    // The avatar rig is 4.6m in Blender but mapped to ~1.6 units in Three.js.
    // A 0.45 multiplier correctly normalizes these scales (1.6 / 4.6 ≈ 0.35 + buffer).
    const baseMult = 0.45;
    
    // --- SIZING LOGIC (S, M, L, XL) ---
    // We assume the GLB model was designed for a 36-inch chest (Standard Medium).
    // If the user selects a different size, we scale the model by the ratio.
    const DESIGN_CHEST_INCHES = 36;
    const selectedChest = Number(dressMeasurements?.chest || 36);
    const sizeMultiplier = selectedChest / DESIGN_CHEST_INCHES;

    // Apply scaling based on user height and product size
    const finalScaleValue = worldScale * baseMult * adjustmentScale * sizeMultiplier;

    // Uniform Scaling by default to preserve design aspect ratio
    let finalYScale = finalScaleValue;

    // Optional: If vendor provided a specific length for this size, use it to fine-tune Y
    if (dressHeightMeas > 0) {
      const referenceYUnits = 3.8 * worldScale; 
      const heightDivisor = isTop ? 240 : 180;
      const targetHeightUnits = (dressHeightMeas / heightDivisor) * referenceYUnits;

      if (modelInternalHeight > 0.05) {
        // This makes the dress length match the size chart exactly
        finalYScale = (targetHeightUnits / modelInternalHeight) * adjustmentScale;
      }
    }


    const zBoost = isTop ? (isMale ? 1.05 : 1.22) : (isFull ? (isMale ? 1.15 : 0.97) : 1.0);
    const applyZ = finalScaleValue * zBoost;

    // --- Smart Pinning Logic (Blender Scale: 4.6m -> World Scale) ---
    // --- Smart Pinning Logic (Blender Scale: 4.6m -> World Scale) ---
    // Both tops and dresses should be pinned to the shoulder (4.6)
    let targetTop = (isTop || isFull) ? 4.6 * worldScale : 4.2 * worldScale;

    // Use bone coordinate for shoulders if available (Best Precision)
    if (avatarSkeleton && avatarSkeleton.bones) {
      const shoulderBones = avatarSkeleton.bones.filter(b =>
        b.name.toLowerCase().includes("shoulder") ||
        b.name.toLowerCase().includes("clavicle") ||
        b.name.toLowerCase().includes("neck")
      );
      if (shoulderBones.length > 0) {
        const bonePos = new THREE.Vector3();
        shoulderBones[0].getWorldPosition(bonePos);
        // Both tops and dresses: pin right at shoulder bone with 18% lift to sit on top
        if (bonePos.y > 0.05) targetTop = bonePos.y * ((isTop || isFull) ? 1.18 : 1.05);
       }
    }

    const AVATAR_WAIST_Y = 2.8 * worldScale;


    let smartYOffset = 0;

    // We want: (OriginalTop * finalYScale) + smartYOffset = targetTop
    // So: smartYOffset = targetTop - (OriginalTop * finalYScale)

    if (isFull || isTop) {
      const garmentTopRaw = originalBox.max.y;
      smartYOffset = targetTop - (garmentTopRaw * finalYScale);
    } else if (isBottom) {
      const garmentTopRaw = originalBox.max.y;
      smartYOffset = AVATAR_WAIST_Y - (garmentTopRaw * finalYScale);
    }

    // Safety clamp: Wider range to handle high-origin models
    smartYOffset = Math.max(-2.0, Math.min(3.0, smartYOffset));

    scene.traverse(child => {
      if (child.isMesh || child.isSkinnedMesh) {
        if (!child.userData.originalGeometry) {
          child.userData.originalGeometry = child.geometry;
        }

        const newGeo = child.userData.originalGeometry.clone();
        newGeo.scale(finalScaleValue, finalYScale, applyZ);

        // Apply smart vertical offset + manual adjustments
        newGeo.translate(adjustmentX, adjustmentY + smartYOffset, adjustmentZ);
        child.geometry = newGeo;
      }
    });
  }, [scene, autoScale, adjustmentScale, adjustmentX, adjustmentY, adjustmentZ, avatarMeasurements, dressMeasurements, isMale, category, url, isInitialized, avatarSkeleton, originalBoxRef]);

  // Bind Clothing to Avatar Skeleton
  useEffect(() => {
    if (!scene || !avatarSkeleton) return;

    // A. Neutralize Unit Differences (Fixes Huge vs Tiny vs Floating GLBs)
    // We measure the GLB and normalize it to a 'Physical Human' height standard.
    if (!scene.userData.syncScale) {
      const box = new THREE.Box3().setFromObject(scene);
      const h = box.max.y - box.min.y;
      if (h > 0.01) {
        const exCat = (category || "").toLowerCase();
        let isFull = exCat === "dresses" || exCat.includes("full") || exCat.includes("suit");
        let isBottom = exCat.includes("bottomwear");

        if (true) { // Always check URL keywords for better accuracy
          const lowUrl = (url || "").toLowerCase();
          isFull = ["dress", "gown", "outfit", "frock"].some(k => lowUrl.includes(k));
          isBottom = !isFull && ["pant", "jeans", "bottom", "skirt", "shorts", "trouser"].some(k => lowUrl.includes(k));
        }

        // SLIM HUMAN TARGETS (Small Profile)
        let targetHeight = isFull ? 1.35 : (isBottom ? 1.00 : 0.55);
        scene.userData.syncScale = targetHeight / h;

        // Store the GEOMETRIC CENTER (Ground Truth for non-standard models)
        scene.userData.geoCenter = new THREE.Vector3();
        box.getCenter(scene.userData.geoCenter);
        // Normalize the center relative to the origin for frame-by-frame snap
        scene.userData.geoCenter.y -= box.min.y;
      }
    }

    // FORCE internal matrices to update so 'bind' captures the correct initial world state
    scene.updateMatrixWorld(true);
    avatarSkeleton.bones[0].updateMatrixWorld(true);

    scene.traverse((child) => {
      // Material Settings
      if (child.isMesh || child.isSkinnedMesh) {
        child.frustumCulled = false;
        child.renderOrder = 100;
        child.material.side = THREE.DoubleSide;
        child.material.transparent = false;
        child.material.alphaTest = 0.5;
        child.material.depthWrite = true;
        child.material.polygonOffset = true;
        child.material.polygonOffsetFactor = -10.0; // Pushes garment strongly in front

        if (!child.userData.hasInflated) {
          // Mesh inflation removed for 'Small' fit
          child.userData.hasInflated = true;
        }

        // Sync Skeleton
        if (child.isSkinnedMesh) {
          // ENSURE avatar is in a neutral pose for the bind capture
          avatarSkeleton.pose();

          const originalBones = child.skeleton.bones;
          const newBones = [];

          const BONE_MAPPING = {
            "hips": ["mixamorig:hips", "hips", "root", "pelvis", "hip", "pelvis_limit", "c_pos_hips"],
            "spine": ["mixamorig:spine", "spine", "spine1", "torso", "spine_01", "c_pos_spine"],
            "spine1": ["mixamorig:spine1", "spine1", "spine2", "chest", "spine_02", "c_pos_spine1"],
            "spine2": ["mixamorig:spine2", "spine2", "upperchest", "chest_upper", "spine_03", "breast_l", "breast_r", "pec_l", "pec_r", "c_pos_spine2"],
            "neck": ["mixamorig:neck", "neck", "head_base", "neck_01", "c_pos_neck"],
            "head": ["mixamorig:head", "head", "face", "head_01", "c_pos_head"],
            "leftshoulder": ["mixamorig:leftshoulder", "leftshoulder", "shoulder_l", "shoulder.l", "clavicle_l", "l_collar", "l_clavicle", "c_pos_clavicle_l"],
            "leftarm": ["mixamorig:leftarm", "leftupperarm", "arm_l", "upper_arm.l", "l_uparm", "upperarm_l", "c_pos_upperarm_l"],
            "leftforearm": ["mixamorig:leftforearm", "leftforearm", "leftlowerarm", "forearm_l", "lower_arm.l", "l_forearm", "lowerarm_l", "c_pos_forearm_l"],
            "lefthand": ["mixamorig:lefthand", "lefthand", "hand_l", "hand.l", "l_hand", "hand_l", "c_pos_hand_l"],
            "rightshoulder": ["mixamorig:rightshoulder", "rightshoulder", "shoulder_r", "shoulder.r", "clavicle_r", "r_collar", "r_clavicle", "c_pos_clavicle_r"],
            "rightarm": ["mixamorig:rightarm", "rightarm", "rightupperarm", "arm_r", "upper_arm.r", "r_uparm", "upperarm_r", "c_pos_upperarm_r"],
            "rightforearm": ["mixamorig:rightforearm", "rightforearm", "rightlowerarm", "forearm_r", "lower_arm.r", "r_forearm", "lowerarm_r", "c_pos_forearm_r"],
            "righthand": ["mixamorig:righthand", "righthand", "hand_r", "hand.r", "r_hand", "hand_r", "c_pos_hand_r"],
            "leftupleg": ["mixamorig:leftupleg", "leftupleg", "leftthigh", "thigh_l", "thigh.l", "l_thigh", "c_pos_thigh_l"],
            "leftleg": ["mixamorig:leftleg", "leftleg", "leftcalf", "calf_l", "shin_l", "l_calf", "c_pos_calf_l"],
            "leftfoot": ["mixamorig:leftfoot", "leftfoot", "foot_l", "foot.l", "l_foot", "foot_01_l", "c_pos_foot_l"],
            "rightupleg": ["mixamorig:rightupleg", "rightupleg", "rightthigh", "thigh_r", "thigh.r", "r_thigh", "c_pos_thigh_r"],
            "rightleg": ["mixamorig:rightleg", "rightleg", "rightcalf", "calf_r", "shin_r", "r_calf", "c_pos_calf_r"],
            "rightfoot": ["mixamorig:rightfoot", "rightfoot", "foot_r", "foot.r", "r_foot", "foot_01_r", "c_pos_foot_r"],
          };

          const boneCache = new Map();
          originalBones.forEach(sourceBone => {
            const sName = sourceBone.name.toLowerCase().replace(/_|:/g, "");
            if (boneCache.has(sName)) { newBones.push(boneCache.get(sName)); return; }

            let foundTarget = null;
            for (const [type, aliases] of Object.entries(BONE_MAPPING)) {
              if (aliases.some(alias => sName.includes(alias.replace(/_|:/g, "").toLowerCase()))) {
                foundTarget = avatarSkeleton.bones.find(b => {
                  const tName = b.name.toLowerCase().replace(/mixamorig|:|obj/g, "");
                  return BONE_MAPPING[type].some(a => tName.includes(a.replace(/mixamorig|:|obj/g, "").toLowerCase()));
                });
                if (foundTarget) break;
              }
            }

            if (!foundTarget) {
              foundTarget = avatarSkeleton.bones.find(b => {
                const tName = b.name.toLowerCase().replace(/mixamorig|:|obj/g, "");
                return sName.includes(tName) || tName.includes(sName);
              });
            }

            if (foundTarget) {
              boneCache.set(sName, foundTarget);
              newBones.push(foundTarget);
            } else {
              const fallback = avatarSkeleton.bones.find(b => b.name.toLowerCase().includes("hips")) || avatarSkeleton.bones[0];
              newBones.push(fallback);
            }
          });

          // Bind with identity to ensure it follows the avatar bones precisely
          child.bind(new THREE.Skeleton(newBones), new THREE.Matrix4());
          child.material.polygonOffset = true;
          child.material.polygonOffsetFactor = -5.0; // Individual item priority
          child.material.polygonOffsetUnits = -5.0;
        }
      }
    });
  }, [scene, avatarSkeleton]);

  const groupRef = React.useRef();

  // Sync Morph Targets & Global Scale
  useFrame(() => {
    if (!scene || !groupRef.current || !avatarSkeleton) return;

    // Ensure all world positions are fresh before calculating deltas
    avatarSkeleton.bones[0].updateMatrixWorld(true);
    scene.updateMatrixWorld(true);

    const g = groupRef.current;
    if (!g) return;

    // Detect garment type again for runtime tweaks if needed (mostly morphs)
    const lowCat = (category || url || "").toLowerCase();
    const isTop = lowCat.includes("top") || lowCat.includes("shirt") || lowCat.includes("tshirt") || lowCat.includes("jacket") || lowCat.includes("upper") || lowCat.includes("vest");
    const isFull = lowCat.includes("dress") || lowCat.includes("frock") || lowCat.includes("suit") || lowCat.includes("full") || lowCat.includes("gown") || lowCat.includes("drss") || lowCat.includes("body");


    scene.traverse(child => {
      if (child.isSkinnedMesh && child.bindMode !== 'detached') {
        child.bindMode = 'detached';
      }
    });

    // 2. MORPH TARGETS (1:1 Sync)
    const toInches = (val) => {
      const v = Number(val);
      // Return null/0 if missing so getMorphWeight can handle it as "No Expansion"
      if (isNaN(v) || v === 0) return null;
      if (v > 60) return v / 2.54;
      return v;
    };




    const getMorphWeight = (val, min, max) => {
      const v = toInches(val);
      if (v === null) return 0; // Fix: No expansion if measurement is missing
      let w = (v - min) / (max - min);
      // Sensitivity set to 1.1x to prevent extreme "Balloon" stretching
      return Math.max(0, Math.min(2.0, w * 1.1));
    };

    // 2. MORPH TARGETS (1:1 Sync + Adaptive Looseness)
    const currentAvatarMeas = avatarMeasRef.current;
    const userChestRel = toInches(currentAvatarMeas?.chest);
    const dressChestRel = Number(currentDressMeas?.chest) || userChestRel;
    // 0.1 weight jump for every 10 inches of extra room (subtle but noticeable)
    const loosenessBonus = Math.max(0, (dressChestRel - userChestRel) / 40);

    const chestW = getMorphWeight(currentAvatarMeas?.chest, 28, 50);
    const waistW = getMorphWeight(currentAvatarMeas?.waist, 28, 50);
    const hipsW = getMorphWeight(currentAvatarMeas?.hips, 28, 48);
    const thighW = getMorphWeight(currentAvatarMeas?.thigh, 19, 25);
    const shoulderW = getMorphWeight(currentAvatarMeas?.shoulders, 13, 18);
    const calfW = thighW * 0.7;

    scene.traverse((child) => {
      if (child.morphTargetInfluences && child.morphTargetDictionary) {
        const setKey = (name, value) => {
          if (child.morphTargetDictionary.hasOwnProperty(name)) {
            child.morphTargetInfluences[child.morphTargetDictionary[name]] = value;
          }
        };

        // Set to near-zero (0.01) for the tightest possible body-hugging fit
        const baseBuff = 0.01;


        const totalBuff = baseBuff + loosenessBonus;

        setKey("measure-bust-circ-incr", chestW + totalBuff);
        setKey("measure-bust-circ-inc", chestW + totalBuff);
        setKey("measure-waist-circ-incr", waistW + totalBuff);
        setKey("measure-waist-circ-inc", waistW + totalBuff);
        setKey("measure-hips-circ-incr", hipsW + totalBuff);
        setKey("measure-hips-circ-inc", hipsW + totalBuff);
        setKey("measure-thigh-circ-incr", thighW + totalBuff);
        setKey("measure-thigh-circ-inc", thighW + totalBuff);
        setKey("measure-shoulder-dist-incr", shoulderW + totalBuff);
        setKey("measure-shoulder-dist-inc", shoulderW + totalBuff);
        setKey("measure-calf-circ-incr", calfW + totalBuff);
        setKey("measure-calf-circ-inc", calfW + totalBuff);
        setKey("BreastSize", chestW + totalBuff);

        // Secondary: If the model has explicit Size Keys (S, M, L, XL), apply them too
        if (sizeRef.current) {
          const lSize = sizeRef.current.toLowerCase();
          for (const key in child.morphTargetDictionary) {
            const lowerKey = key.toLowerCase();
            const sizeList = ["s", "m", "l", "xl", "small", "medium", "large", "extralarge"];
            if (sizeList.some(s => lowerKey.includes(s))) {
              // Reset other sizes first if they are prominent
              child.morphTargetInfluences[child.morphTargetDictionary[key]] = 0;
              if (lSize === 's' && (lowerKey === 's' || lowerKey.includes('small'))) setKey(key, 1);
              if (lSize === 'm' && (lowerKey === 'm' || lowerKey.includes('medium'))) setKey(key, 1);
              if (lSize === 'l' && (lowerKey === 'l' || lowerKey.includes('large'))) setKey(key, 1);
              if (lSize === 'xl' && (lowerKey === 'xl' || lowerKey.includes('extra'))) setKey(key, 1);
            }
          }
        }
      }
    });
  });

  return (
    <group ref={groupRef} visible={isInitialized}>
      <primitive object={scene} rotation={[0, 0, 0]} />
    </group>
  );
});

const CAMERA_POS = [0, 1.0, 3.0];
const CONTROLS_TARGET = [0, 1.0, 0];
const LIGHT_POS = [5, 10, 5];

export default function AvatarViewer({
  measurements,
  clothingModelUrl,
  category,
  faceParams,
  sizeChartData = null,
  availableSizes = ['S', 'M', 'L', 'XL'],
  initialSize = 'M',
  modelUrl = "/models/human_base.glb",
  adjustmentScale = 1.0,
  adjustmentX = 0,
  adjustmentY = 0,
  adjustmentZ = 0,
  selectedItems = [], // NEW: Array of { model3D, category, id }
  name = ""
}) {
  const [avatarSkeleton, setAvatarSkeleton] = useState(null);

  const [localClothingUrl, setLocalClothingUrl] = useState(clothingModelUrl);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [sceneDump, setSceneDump] = useState("");

  const [autoScaleFactor, setAutoScaleFactor] = useState(1);

  useEffect(() => {
    setLocalClothingUrl(clothingModelUrl);
  }, [clothingModelUrl]);

  // Merge categories for base clothing hiding
  const activeCategories = useMemo(() => {
    const cats = [];
    if (localClothingUrl) {
      cats.push(localClothingUrl.toLowerCase()); // This reads the file name "dress.glb"
      if (category) cats.push(category);
    }
    if (selectedItems && selectedItems.length > 0) {
      selectedItems.forEach(item => {
        cats.push((item.model3D || "").toLowerCase());
        if (item.category || item.type) cats.push(item.category || item.type);
      });
    }
    return cats.join(" ");
  }, [localClothingUrl, category, selectedItems]);

  const handleServerOptimization = async () => {
    if (!localClothingUrl) return;
    setIsOptimizing(true);
    try {
      const response = await fetch('http://localhost:5001/fit-clothing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clothingUrl: localClothingUrl,
          measurements: measurements
        })
      });
      const data = await response.json();
      if (data.status === 'success' && data.processedUrl) {
        setLocalClothingUrl(data.processedUrl);
      } else {
        alert("Optimization failed: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      alert("Could not connect to optimization server. Is it running on port 5001?");
    } finally {
      setIsOptimizing(false);
    }
  };

  // --- NEW: CLOTHING SIZE LOGIC ---
  const [selectedSize, setSelectedSize] = useState(initialSize || (availableSizes && availableSizes[0]) || 'M');

  useEffect(() => {
    if (initialSize) {
      setSelectedSize(initialSize);
    }
  }, [initialSize]);

  const SIZE_CHARTS = sizeChartData && Object.keys(sizeChartData).length > 0 ? sizeChartData : {
    'S': { chest: 34, waist: 26, hips: 36, shoulders: 14, thigh: 20 },
    'M': { chest: 36, waist: 28, hips: 38, shoulders: 15, thigh: 21 },
    'L': { chest: 38, waist: 30, hips: 40, shoulders: 16, thigh: 22 },
    'XL': { chest: 42, waist: 34, hips: 44, shoulders: 17, thigh: 24 }
  };
  const clothingMeasurements = SIZE_CHARTS[selectedSize] || Object.values(SIZE_CHARTS)[0];

  // Removed calculateFit as it was unused and causing warnings.
  const isMale = (measurements?.gender === "male") || (modelUrl?.toLowerCase().includes("male"));

  // Determine Category Flags in this scope for Diagnostic Overlay
  const combinedCat = (category + " " + (clothingModelUrl || "") + " " + (name || "")).toLowerCase();
  const isFull = combinedCat.includes("dress") || combinedCat.includes("frock") || combinedCat.includes("full") || combinedCat.includes("suit") || combinedCat.includes("gown") || combinedCat.includes("body");
  const isBottom = !isFull && (combinedCat.includes("pant") || combinedCat.includes("trouser") || combinedCat.includes("bottom") || combinedCat.includes("short") || combinedCat.includes("jeans") || combinedCat.includes("lower"));
  const isTop = !isFull && !isBottom && (combinedCat.includes("top") || combinedCat.includes("shirt") || combinedCat.includes("tshirt") || combinedCat.includes("jacket") || combinedCat.includes("upper") || combinedCat.includes("vest"));

  const finalFaceParams = faceParams || (() => {
    try {
      const saved = localStorage.getItem("faceParams");
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  })();

  const handleSkeletonLoaded = (skeleton) => {
    setAvatarSkeleton(skeleton);
  };

  const handleDownload = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `smartstyle-tryon-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>


      <div style={{ width: "100%", height: "100%", borderRadius: "12px", overflow: "hidden" }}>
        <Canvas camera={{ position: CAMERA_POS, fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
          <ambientLight intensity={0.7} />
          <directionalLight intensity={1.2} position={LIGHT_POS} castShadow />

          <React.Suspense fallback={<Html center><div style={{ color: "white", background: "black", padding: "10px" }}>Loading 3D Model...</div></Html>}>
            <ModelErrorBoundary>
              <AvatarModel
                baseModelUrl={modelUrl}
                measurements={measurements}
                faceParams={finalFaceParams}
                onSkeletonLoaded={handleSkeletonLoaded}
                onSceneDebug={setSceneDump}
                tryOnCategory={activeCategories}
                name={clothingModelUrl ? name : ""}
                hideBaseClothes={!!(localClothingUrl || (selectedItems && selectedItems.length > 0))}
              />
            </ModelErrorBoundary>

            {/* SINGLE ITEM PREVIEW */}
            {localClothingUrl && (
              <ModelErrorBoundary key={localClothingUrl}>
                <ClothingModel
                  url={localClothingUrl}
                  category={category}
                  avatarSkeleton={avatarSkeleton}
                  avatarMeasurements={measurements}
                  dressMeasurements={clothingMeasurements}
                  selectedSize={selectedSize}
                  isFixedSize={false}
                  adjustmentScale={adjustmentScale}
                  adjustmentX={adjustmentX}
                  adjustmentY={adjustmentY}
                  adjustmentZ={adjustmentZ}
                  isMale={isMale}
                  name={name}
                  onScaleCalculated={setAutoScaleFactor}
                />
              </ModelErrorBoundary>
            )}

            {/* COMBINATION PREVIEW */}
            {selectedItems && selectedItems.length > 0 && selectedItems.map((item, idx) => {
              const itemUrl = item.model3D?.startsWith('http') ? item.model3D : `http://localhost:5000${item.model3D}`;
              if (!item.model3D) return null;

              return (
                <ModelErrorBoundary key={`${item.id || idx}-${itemUrl}`}>
                  <ClothingModel
                    url={itemUrl}
                    category={item.category || item.type}
                    avatarSkeleton={avatarSkeleton}
                    avatarMeasurements={measurements}
                    dressMeasurements={clothingMeasurements}
                    selectedSize={selectedSize}
                    isFixedSize={false}
                    adjustmentScale={adjustmentScale}
                    adjustmentX={adjustmentX}
                    adjustmentY={adjustmentY}
                    adjustmentZ={adjustmentZ}
                    isMale={isMale}
                    onScaleCalculated={() => { }} // No auto-scale feedback for multi-items yet
                  />
                </ModelErrorBoundary>
              );
            })}
          </React.Suspense>

          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom={false}
            enableRotate={true}
            minPolarAngle={1.2}
            maxPolarAngle={1.8}
            rotateSpeed={0.5}
            target={CONTROLS_TARGET}
            enableDamping={true}
            dampingFactor={0.05}
          />
          <ContactShadows opacity={0.6} scale={10} blur={2.5} far={4} resolution={256} color="#000000" />
        </Canvas >
      </div >

      <div style={{
        position: "absolute", top: 20, right: 20, zIndex: 110,
        display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-end"
      }}>
        {localClothingUrl && (
          <button
            onClick={handleServerOptimization}
            style={{
              background: isOptimizing ? "#555" : "#ff9800", color: "#fff", border: "none",
              padding: "8px 16px", borderRadius: "20px", cursor: isOptimizing ? "wait" : "pointer",
              fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
            }}
          >
            {isOptimizing ? "⏳ Fitting..." : "✨ Perfect Fit"}
          </button>
        )}
        <button
          onClick={handleDownload}
          style={{
            background: "#333", color: "#fff", border: "none",
            padding: "8px 16px", borderRadius: "20px", cursor: "pointer",
            fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
          }}
        >
          📸 Save Look
        </button>
        <div style={{
          background: "rgba(0,0,0,0.8)", color: "#0f0", padding: "10px",
          borderRadius: "8px", fontSize: "11px", fontFamily: "monospace",
          border: "1px solid #333", pointerEvents: "none", textAlign: "right"
        }}>
          NAME: {name || "None"}<br />
          TYPE: {isFull ? "FullBody" : (isBottom ? "Bottom" : (isTop ? "Topwear" : "Unknown"))}<br />
          BODY: {isMale ? "MALE" : "FEMALE"}<br />
          AUTO: {autoScaleFactor.toFixed(3)}x<br />
          ADJ: {adjustmentScale.toFixed(2)}x | X:{adjustmentX.toFixed(2)} | Y:{adjustmentY.toFixed(2)} | Z:{adjustmentZ.toFixed(2)}
        </div>
      </div>
    </div>
  );
}



// ✅ preload model (faster loading)
useGLTF.preload("/models/female_base.glb");
