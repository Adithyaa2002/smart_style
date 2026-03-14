import * as THREE from "three";
import React, { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, ContactShadows, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

function clamp01(val) {
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

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

  // Debug throttling
  const lastLog = React.useRef(0);

  // Move scaling to useFrame to ensure it overrides any animations every frame
  useFrame((state) => {
    if (!scene) return;

    // Use Ref to prevent closure staleness
    const currentMeas = measurementsRef.current;

    // Default Measurements
    const standardChest = 34;
    const standardWaist = 28;
    const standardHips = 38;
    // Standard Weight ~ 60kg.
    const standardWeight = 60;


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

    const hVal = Number(measurements?.height || 170);
    const weightVal = Number(measurements?.weight || 60);

    const heightScale = hVal > 0 ? hVal / 170 : 1;
    const weightRatio = weightVal > 0 ? weightVal / 60 : 1;
    let thicknessScale = 1 + (weightRatio - 1) * 0.4;
    thicknessScale = Math.max(0.7, Math.min(1.4, thicknessScale));

    const isMale = baseModelUrl?.includes("male_base") || (measurements?.gender === "male");
    const BASE_SCALE = 1.0;

    if (scene) {
      const finalS = BASE_SCALE * heightScale;
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
        setKey("measure-thigh-circ-incr", thighWeight);     // Thigh
        setKey("measure-calf-circ-incr", calfWeight);       // Calf (New)
        setKey("measure-knee-circ-incr", thighWeight * 0.5);// Knee (New - smoothed)
        setKey("measure-shoulder-dist-incr", shoulderWeight);// Shoulders (Uncommented)

        // Legacy/Backup Keys
        setKey("breast-volume-vert-up", chestWeight);
        setKey("BreastSize", chestWeight);

        if (weightVal > 80) {
          const stomachVal = clamp01((weightVal - 80) / 40);
          setKey("stomach-pregnant-incr", stomachVal * 0.7);
        }
      }

      // --- DIAGNOSTICS & MATERIAL APPLICATION ---
      if (child.isMesh || child.isSkinnedMesh) {
        const name = (child.name || "").toLowerCase();

        // 1. Identifying Parts (More robust keywords)
        const skinKeywords = ["body", "skin", "head", "face", "arm", "flesh", "hand", "leg", "surface", "human", "avatar", "base", "torso", "neck", "legs", "foot", "feet", "chest"];
        const otherBodyKeywords = ["eye", "teeth", "tongue", "lash", "hair", "cornea", "nail"];
        const clothingKeywords = [
          "bra", "pants", "shirt", "dress", "outfit", "garment", "punkduck", "undies",
          "briefs", "underwear", "boxers", "camisole", "slip", "trunks", "suit", "cloth",
          "trousers", "shorts", "jean", "top", "bottom", "vest", "jacket"
        ]; // Added back common clothing types

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

        // 4. Clothing Priority
        if (finalClothing && child.material && !finalSkin) {
          child.material.side = THREE.DoubleSide;
          child.material.depthWrite = true;
          child.material.transparent = false;
          child.material.polygonOffset = true;
          child.material.polygonOffsetFactor = -4.0;
          child.material.polygonOffsetUnits = -4.0;
        }

        // 5. Selective Base Clothing Hiding (Selective Visibility)
        const lowTryOn = tryOnCategory.toLowerCase();
        const isTopBase = name.includes("bra") || name.includes("camisole") || name.includes("sport") || name.includes("top");
        const isBottomBase = name.includes("pant") || name.includes("shorts") || name.includes("undies") || name.includes("briefs") || name.includes("underwear") || name.includes("trunks");

        let hideThisMesh = false;
        if (tryOnCategory || tryOnName) {
          const combinedTryOn = (tryOnCategory + " " + (tryOnName || "")).toLowerCase();
          const isTryingFull = combinedTryOn.includes("dress") || combinedTryOn.includes("suit") || combinedTryOn.includes("outfit") || combinedTryOn.includes("frock") || combinedTryOn.includes("gown") || combinedTryOn.includes("body");
          const isTryingTop = !isTryingFull && (combinedTryOn.includes("top") || combinedTryOn.includes("shirt") || combinedTryOn.includes("jacket") || combinedTryOn.includes("tshirt"));
          const isTryingBottom = !isTryingFull && (combinedTryOn.includes("pant") || combinedTryOn.includes("trouser") || combinedTryOn.includes("bottom") || combinedTryOn.includes("short"));

          if (isTryingFull) {
            hideThisMesh = isClothing; // Hide all innerwear
          } else if (isTryingTop) {
            hideThisMesh = isTopBase; // Hide only top inner
          } else if (isTryingBottom) {
            hideThisMesh = isBottomBase; // Hide only bottom inner
          }
        }

        if (hideThisMesh) child.visible = false;
        else child.visible = true;
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

  }, [scene, onSkeletonLoaded]);

  return <primitive object={scene} position={[0, 0, 0]} rotation={[0, 0, 0]} />;
}

// -----------------------------------------------------
// Clothing Model Component (Synced Logic)
// -----------------------------------------------------
const ClothingModel = ({ url, avatarSkeleton, measurements, category = "",
  isFixedSize = false,
  adjustmentScale = 1.0,
  adjustmentX = 0,
  adjustmentY = 0,
  adjustmentZ = 0,
  isMale = true,
  name = "",
  onScaleCalculated // New diagnostic callback
}) => {
  const { scene } = useGLTF(url);

  // Standardized to 1.0 to match avatar
  const BASE_SCALE = 1.0;

  const groupRef = React.useRef();
  const measurementsRef = React.useRef(measurements);
  const adjRef = React.useRef({ scale: adjustmentScale, x: adjustmentX, y: adjustmentY, z: adjustmentZ });

  useEffect(() => {
    measurementsRef.current = measurements;
  }, [measurements]);

  useEffect(() => {
    adjRef.current = { scale: adjustmentScale, x: adjustmentX, y: adjustmentY, z: adjustmentZ };
  }, [adjustmentScale, adjustmentX, adjustmentY, adjustmentZ]);

  const [autoScale, setAutoScale] = React.useState(1.0);
  const [isInitialized, setIsInitialized] = React.useState(false); // New: Hide until positioned

  useEffect(() => {
    if (scene) {
      // Safety: Reset ALL nested scales before measuring size
      scene.traverse(child => {
        if (child.scale) child.scale.set(1, 1, 1);
      });

      const box = new THREE.Box3().setFromObject(scene);
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
      // We don't touch geometry. We move the scene so its visual center is at 0,0,0
      const boxCentered = new THREE.Box3().setFromObject(scene); // Re-calculate after potential mesh scaling
      const centerCentered = new THREE.Vector3();
      boxCentered.getCenter(centerCentered);

      scene.position.set(-centerCentered.x, -centerCentered.y, -centerCentered.z);
      scene.rotation.set(0, 0, 0); // Neutralize rotation
      scene.scale.set(1, 1, 1); // Neutralize scale

      // LOG THE FINAL SCALE (Visible in Browser Console)
      console.log(`👗 [AUTO-SCALE] Final Scale Applied: ${(scaleToFit * 100).toFixed(1)}% of original`);

      // Mark as ready AFTER positioning and scaling
      requestAnimationFrame(() => setIsInitialized(true));
    }
  }, [scene, url, category, isMale, onScaleCalculated]);

  // Bind Clothing to Avatar Skeleton
  useEffect(() => {
    if (!scene || !avatarSkeleton) return;

    scene.traverse((child) => {
      // Material Settings
      if (child.isMesh) {
        child.renderOrder = 100; // Force on top
        child.material.side = THREE.DoubleSide;
        child.material.depthWrite = true;
        child.material.polygonOffset = true;
        child.material.polygonOffsetFactor = -2.0; // Reduced offset slightly
        child.userData.hasInflated = true; // Prevent internal double-scaling

        // Sync Skeleton
        if (child.isSkinnedMesh && child.skeleton) {
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
            "lefttoe": ["mixamorig:lefttoebase", "lefttoe", "toe_l", "toe.l", "l_toe", "c_pos_toe_l"],
            "righttoe": ["mixamorig:righttoebase", "righttoe", "toe_r", "toe.r", "r_toe", "c_pos_toe_r"],
            "leftthumb1": ["mixamorig:leftthumb1", "thumb_l_01", "c_pos_thumb_l_01"],
            "leftthumb2": ["mixamorig:leftthumb2", "thumb_l_02", "c_pos_thumb_l_02"],
            "leftthumb3": ["mixamorig:leftthumb3", "thumb_l_03", "c_pos_thumb_l_03"],
            "leftindex1": ["mixamorig:leftindex1", "index_l_01", "c_pos_index_l_01"],
            "leftindex2": ["mixamorig:leftindex2", "index_l_02", "c_pos_index_l_02"],
            "leftindex3": ["mixamorig:leftindex3", "index_l_03", "c_pos_index_l_03"],
            "leftmiddle1": ["mixamorig:leftmiddle1", "middle_l_01", "c_pos_middle_l_01"],
            "leftmiddle2": ["mixamorig:leftmiddle2", "middle_l_02", "c_pos_middle_l_02"],
            "leftmiddle3": ["mixamorig:leftmiddle3", "middle_l_03", "c_pos_middle_l_03"],
            "leftring1": ["mixamorig:leftring1", "ring_l_01", "c_pos_ring_l_01"],
            "leftring2": ["mixamorig:leftring2", "ring_l_02", "c_pos_ring_l_02"],
            "leftring3": ["mixamorig:leftring3", "ring_l_03", "c_pos_ring_l_03"],
            "leftpinky1": ["mixamorig:leftpinky1", "pinky_l_01", "c_pos_pinky_l_01"],
            "leftpinky2": ["mixamorig:leftpinky2", "pinky_l_02", "c_pos_pinky_l_02"],
            "leftpinky3": ["mixamorig:leftpinky3", "pinky_l_03", "c_pos_pinky_l_03"],
            "rightthumb1": ["mixamorig:rightthumb1", "thumb_r_01", "c_pos_thumb_r_01"],
            "rightthumb2": ["mixamorig:rightthumb2", "thumb_r_02", "c_pos_thumb_r_02"],
            "rightthumb3": ["mixamorig:rightthumb3", "thumb_r_03", "c_pos_thumb_r_03"],
            "rightindex1": ["mixamorig:rightindex1", "index_r_01", "c_pos_index_r_01"],
            "rightindex2": ["mixamorig:rightindex2", "index_r_02", "c_pos_index_r_02"],
            "rightindex3": ["mixamorig:rightindex3", "index_r_03", "c_pos_index_r_03"],
            "rightmiddle1": ["mixamorig:rightmiddle1", "middle_r_01", "c_pos_middle_r_01"],
            "rightmiddle2": ["mixamorig:rightmiddle2", "middle_r_02", "c_pos_middle_r_02"],
            "rightmiddle3": ["mixamorig:rightmiddle3", "middle_r_03", "c_pos_middle_r_03"],
            "rightring1": ["mixamorig:rightring1", "ring_r_01", "c_pos_ring_r_01"],
            "rightring2": ["mixamorig:rightring2", "ring_r_02", "c_pos_ring_r_02"],
            "rightring3": ["mixamorig:rightring3", "ring_r_03", "c_pos_ring_r_03"],
            "rightpinky1": ["mixamorig:rightpinky1", "pinky_r_01", "c_pos_pinky_r_01"],
            "rightpinky2": ["mixamorig:rightpinky2", "pinky_r_02", "c_pos_pinky_r_02"],
            "rightpinky3": ["mixamorig:rightpinky3", "pinky_r_03", "c_pos_pinky_r_03"],
          };

          originalBones.forEach(sourceBone => {
            const sName = sourceBone.name.toLowerCase().replace(/_/g, "");
            let targetBone = null;
            let detectedType = null;
            for (const [type, aliases] of Object.entries(BONE_MAPPING)) {
              if (aliases.some(alias => sName.includes(alias.replace(/_|:/g, "")))) {
                detectedType = type;
                break;
              }
            }
            if (detectedType) {
              const targetAliases = BONE_MAPPING[detectedType];
              targetBone = avatarSkeleton.bones.find(b => {
                const tName = b.name.toLowerCase().replace(/mixamorig|:|obj/g, "");
                return targetAliases.some(alias => tName.includes(alias.replace(/mixamorig|:|obj/g, "")));
              });
            }
            if (!targetBone) {
              targetBone = avatarSkeleton.bones.find(b => {
                const tName = b.name.toLowerCase().replace(/mixamorig|:|obj/g, "");
                return sName.includes(tName) || tName.includes(sName);
              });
            }
            newBones.push(targetBone || avatarSkeleton.bones[0]);
          });
          child.skeleton = new THREE.Skeleton(newBones);
        }
      }
    });
  }, [scene, avatarSkeleton]);

  // Sync Morph Targets & Global Scale
  useFrame(() => {
    if (!groupRef.current || !scene || !avatarSkeleton) return;
    const meas = measurementsRef.current;

    // Auto-detect Vertical Offset based on Category & Gender
    const combinedCat = (category + " " + (url || "") + " " + (name || "")).toLowerCase();
    const isFull = combinedCat.includes("dress") || combinedCat.includes("frock") || combinedCat.includes("full") || combinedCat.includes("suit") || combinedCat.includes("gown") || combinedCat.includes("body");
    const isBottom = !isFull && (combinedCat.includes("pant") || combinedCat.includes("trouser") || combinedCat.includes("bottom") || combinedCat.includes("short") || combinedCat.includes("jeans") || combinedCat.includes("lower"));
    const isTop = !isFull && !isBottom && (combinedCat.includes("top") || combinedCat.includes("shirt") || combinedCat.includes("tshirt") || combinedCat.includes("jacket") || combinedCat.includes("upper") || combinedCat.includes("vest"));

    let baseAutoY = 1.05; // Default for Male Tops
    let baseAutoX = isMale ? -0.01 : 0.0; // Reduced left nudge

    if (isFull) {
      baseAutoY = isMale ? 0.85 : 0.14; // Isolate Male vs Female FullBody
    } else if (isBottom) {
      baseAutoY = isMale ? 0.45 : 0.38;
    } else if (isTop) {
      baseAutoY = isMale ? -0.11 : -0.01; // Final precision user-found height
    }

    // 1. GLOBAL & ADJUSTMENT SCALE
    const { scale: aScale, x: aX, y: aY, z: aZ } = adjRef.current;

    const g = groupRef.current;

    // Cross-gender/Body-type Depth Boost
    // - Women (Tops): 1.22x depth for bust. (Dresses balanced for back fit vs clipping)
    // - Men (Tops/Full): 1.05-1.15x depth
    const zBoost = isFull ? (isMale ? 1.15 : 0.96) : (isTop ? (isMale ? 1.05 : 1.22) : 1.0);
    const finalScale = BASE_SCALE * autoScale * (aScale || 1.0);
    g.scale.set(finalScale, finalScale, finalScale * zBoost);

    // Auto-snap to correct vertical level
    g.position.set(baseAutoX + (aX || 0), baseAutoY + (aY || 0), (aZ || 0));

    scene.traverse(child => {
      if (child.isSkinnedMesh && child.bindMode !== 'detached') {
        child.bindMode = 'detached';
      }
    });

    // 2. MORPH TARGETS (1:1 Sync)
    const toInches = (val) => {
      const v = Number(val);
      if (isNaN(v) || v === 0) return 0;
      if (v > 60) return v / 2.54;
      return v;
    };

    const getMorphWeight = (val, min, max) => {
      const v = toInches(val);
      if (v === 0) return 0;
      let w = (v - min) / (max - min);
      return Math.max(0, Math.min(2.0, w * 1.5));
    };

    const chestW = getMorphWeight(meas?.chest, 28, 50);
    const waistW = getMorphWeight(meas?.waist, 28, 50);
    const hipsW = getMorphWeight(meas?.hips, 28, 48);
    const thighW = getMorphWeight(meas?.thigh, 19, 25);
    const shoulderW = getMorphWeight(meas?.shoulders, 13, 18);
    const calfW = thighW * 0.7;

    scene.traverse((child) => {
      if (child.morphTargetInfluences && child.morphTargetDictionary) {
        const setKey = (name, value) => {
          if (child.morphTargetDictionary.hasOwnProperty(name)) {
            child.morphTargetInfluences[child.morphTargetDictionary[name]] = value;
          }
        };

        // Apply buffer: 0.06 for men tops (tighter), 0.18 for female tops
        const clothBuff = isFull ? (isMale ? 0.12 : 0.10) : (isTop ? (isMale ? 0.06 : 0.18) : 0.05);
        setKey("measure-bust-circ-incr", chestW + clothBuff);
        setKey("measure-bust-circ-incr.001", chestW + clothBuff);
        setKey("measure-waist-circ-incr", waistW + clothBuff);
        setKey("measure-hips-circ-incr", hipsW + clothBuff);
        setKey("measure-thigh-circ-incr", thighW + clothBuff);
        setKey("measure-calf-circ-incr", (thighW + clothBuff) * 0.7);
        setKey("measure-knee-circ-incr", (thighW + clothBuff) * 0.5);
        setKey("measure-shoulder-dist-incr", shoulderW + clothBuff);
        setKey("measure-upperarm-circ-incr", (chestW + clothBuff) * 0.5);
        setKey("breast-volume-vert-up", chestW + clothBuff);
        setKey("BreastSize", chestW + clothBuff);
      }
    });
  });

  return (
    <group ref={groupRef} visible={isInitialized}>
      <primitive object={scene} />
    </group>
  );
};

const CAMERA_POS = [0, 1.0, 3.0];
const CONTROLS_TARGET = [0, 1.0, 0];
const LIGHT_POS = [5, 10, 5];

export default function AvatarViewer({
  measurements,
  clothingModelUrl,
  category = "", // Passed for auto-alignment
  faceParams,
  modelUrl = "/models/human_base.glb",
  adjustmentScale = 1.0,
  adjustmentX = 0,
  adjustmentY = 0,
  adjustmentZ = 0,
  name = ""
}) {
  const [avatarSkeleton, setAvatarSkeleton] = React.useState(null);
  const [autoScaleFactor, setAutoScaleFactor] = React.useState(1.0); // Diagnostic state

  // Determine Gender for Layout/Logic (Strict check)
  const isMale = (measurements?.gender === "male") || (modelUrl?.toLowerCase().includes("/male_"));

  // Determine Category Flags in this scope for Diagnostic Overlay
  const combinedCat = (category + " " + (clothingModelUrl || "") + " " + (name || "")).toLowerCase();
  const isFull = combinedCat.includes("dress") || combinedCat.includes("frock") || combinedCat.includes("full") || combinedCat.includes("suit") || combinedCat.includes("gown") || combinedCat.includes("body");
  const isBottom = !isFull && (combinedCat.includes("pant") || combinedCat.includes("trouser") || combinedCat.includes("bottom") || combinedCat.includes("short") || combinedCat.includes("jeans") || combinedCat.includes("lower"));
  const isTop = !isFull && !isBottom && (combinedCat.includes("top") || combinedCat.includes("shirt") || combinedCat.includes("tshirt") || combinedCat.includes("jacket") || combinedCat.includes("upper") || combinedCat.includes("vest"));

  // Persistence Fallback: If no faceParams passed, try to load from localStorage
  const finalFaceParams = faceParams || (() => {
    try {
      const saved = localStorage.getItem("faceParams");
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  })();



  // Capture skeleton (backwards compat)
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
      {/* 3D Canvas */}
      <div style={{ width: "100%", height: "100%", borderRadius: "12px", overflow: "hidden" }}>
        <Canvas camera={{ position: CAMERA_POS, fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
          {/* <Environment preset="city" />  <-- Causing Download Error */}
          <ambientLight intensity={0.7} />
          <directionalLight intensity={1.2} position={LIGHT_POS} castShadow />

          <React.Suspense fallback={<Html center><div style={{ color: "white", background: "black", padding: "10px" }}>Loading 3D Model...</div></Html>}>
            <ModelErrorBoundary>
              <AvatarModel
                baseModelUrl={modelUrl}
                measurements={measurements}
                faceParams={finalFaceParams}
                onSkeletonLoaded={handleSkeletonLoaded}
                tryOnCategory={clothingModelUrl ? category : ""}
                name={clothingModelUrl ? name : ""}
              />
            </ModelErrorBoundary>

            {clothingModelUrl && (
              <ModelErrorBoundary key={clothingModelUrl}>
                <ClothingModel
                  key={clothingModelUrl}
                  url={clothingModelUrl}
                  category={category}
                  avatarSkeleton={avatarSkeleton}
                  measurements={measurements}
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
        </Canvas>
      </div>

      {/* OVERLAYS AT THE BOTTOM OF JSX TO ENSURE THEY ARE ON TOP */}
      <div style={{
        position: "absolute", top: 20, right: 20, zIndex: 110,
        display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-end"
      }}>
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
