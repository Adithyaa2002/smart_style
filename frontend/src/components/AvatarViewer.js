import * as THREE from "three";
import React, { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, ContactShadows } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

function clamp01(val) {
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

function AvatarModel({ measurements, onSkeletonLoaded, onSceneDebug }) {
  // FORCE REFRESH: User renamed file to human_base.glb
  const { scene } = useGLTF("/models/human_base.glb");

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

    // TUNED FORMULA:
    // We shift the base DOWN so that "Standard" measurements still show some volume.
    const getMorphWeight = (val, standardVal, range = 20) => {
      const v = toInches(val);
      if (v === 0) return 0;

      // "Zero" morph is 6 inches below standard (e.g. 28 for chest)
      const zeroPoint = standardVal - 6;

      // Allow up to 1.5 for dramatic effect, don't hard map to 0-1
      let w = (v - zeroPoint) / range;
      return Math.max(0, Math.min(1.5, w));
    };

    const hVal = Number(measurements?.height || 170);
    const weightVal = Number(measurements?.weight || 60);

    const heightScale = hVal > 0 ? hVal / 170 : 1;
    const weightRatio = weightVal > 0 ? weightVal / 60 : 1;
    let thicknessScale = 1 + (weightRatio - 1) * 0.6;
    thicknessScale = Math.max(0.8, Math.min(1.5, thicknessScale));

    const BASE_SCALE = 1.6;
    if (scene) {
      scene.scale.set(
        BASE_SCALE * heightScale * thicknessScale,
        BASE_SCALE * heightScale,
        BASE_SCALE * heightScale * thicknessScale
      );
    }

    // --- BONE FINDING ---
    // Scan every frame until we have all the bones we need.
    const b = bones.current;
    if (!b.hips || !b.waist || !b.chest || !b.leftShoulder || !b.rightShoulder) {
      scene.traverse((c) => {
        if (c.isBone) {
          const n = c.name.toLowerCase();
          // HIPS
          if (!b.hips && (n.includes("mixamorig:hips") || (n.includes("hips") && !n.includes("obj")))) {
            b.hips = c;
            console.log("Found Hips Bone:", c.name);
          }
          // WAIST (Spine - Lower Back)
          if (!b.waist && ((n.includes("mixamorig:spine") || n === "spine") && !n.includes("1") && !n.includes("2"))) {
            b.waist = c;
            console.log("Found Waist Bone:", c.name);
          }
          // CHEST (Spine1 - Main Ribcage)
          // We moved from Spine2 to Spine1 because Spine2 is often too high (clavicles)
          // Spine1 controls the main volume of the chest/bust area.
          if (!b.chest && (n.includes("spine1") || (n.includes("chest") && !n.includes("upper")))) {
            b.chest = c;
            console.log("Found Chest Bone:", c.name);
          }
          // UPPER CHEST (Spine2) - Needed to stop chest scale propagation
          if (!b.upperChest && (n.includes("spine2") || n.includes("upperchest"))) {
            b.upperChest = c;
            console.log("Found Upper Chest:", c.name);
          }
          // ARMS (Upper Arm)
          if (!b.leftArm && (n.includes("leftarm") || n.includes("leftupperarm"))) {
            b.leftArm = c;
            console.log("Found Left Arm:", c.name);
          }
          if (!b.rightArm && (n.includes("rightarm") || n.includes("rightupperarm"))) {
            b.rightArm = c;
            console.log("Found Right Arm:", c.name);
          }
          // SHOULDERS (Clavicle/Collar)
          if (!b.leftShoulder && (n.includes("leftshoulder") || n.includes("l_collar") || n.includes("clavicle_l"))) {
            b.leftShoulder = c;
            console.log("Found Left Shoulder:", c.name);
          }
          if (!b.rightShoulder && (n.includes("rightshoulder") || n.includes("r_collar") || n.includes("clavicle_r"))) {
            b.rightShoulder = c;
            console.log("Found Right Shoulder:", c.name);
          }
        }
      });
    }

    const mChest = toInches(currentMeas?.chest) || standardChest;
    const mWaist = toInches(currentMeas?.waist) || standardWaist;
    const mHips = toInches(currentMeas?.hips) || standardHips;
    const mShoulders = toInches(currentMeas?.shoulders) || 14;

    // --- VISUAL BOOOST ---
    // User wants "obvious" changes. We act like the mesh is "stiffer" than math implies.
    // Calculate raw ratio, then boost its deviation from 1.0.
    const boost = (ratio, factor = 1.2) => {
      if (ratio === 1) return 1;
      return 1 + (ratio - 1) * factor;
    };

    const chestRatio = boost(mChest / standardChest, 1.5); // 50% extra effect
    const waistRatio = boost(mWaist / standardWaist, 1.2);
    const hipsRatio = boost(mHips / standardHips, 1.2);
    const shoulderRatio = boost(mShoulders / 14, 0.6); // Reduced effect (Subtle change)

    // --- DEBUG LOG ---
    if (state.clock.elapsedTime - lastLog.current > 3) {
      lastLog.current = state.clock.elapsedTime;
      console.log("--- BONE SCALING ISOLATION ---");
      console.log("Ratios:", { chestRatio, waistRatio, hipsRatio, shoulderRatio });
    }

    // --- APPLY SCALING (ISOLATED LOGIC) ---

    // 1. HIPS (Root)
    if (b.hips) {
      b.hips.scale.set(hipsRatio, 1, hipsRatio);
    }

    // 2. WAIST (Child of Hips)
    if (b.waist) {
      // Compensate for Hips
      const localWaist = Math.max(0.5, waistRatio / hipsRatio);
      b.waist.scale.set(localWaist, 1, localWaist);
    }

    // 3. CHEST (Spine1 - Child of Waist)
    let appliedChestX = 1;
    let appliedChestZ = 1;
    if (b.chest) {
      // Compensate for Waist
      const localChest = Math.max(0.5, chestRatio / waistRatio);

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


    // Morph Weights
    const chestWeight = getMorphWeight(currentMeas?.chest, standardChest, 22);
    const waistWeight = getMorphWeight(currentMeas?.waist, standardWaist, 20);
    const hipWeight = getMorphWeight(currentMeas?.hips, standardHips, 22);
    const shoulderWeight = getMorphWeight(currentMeas?.shoulders, 14, 12);

    scene.traverse((child) => {
      if ((child.isMesh || child.isSkinnedMesh) && child.morphTargetDictionary && child.morphTargetInfluences) {

        if (!child.userData.loggedMorphs) {
          // Log only once per session to avoid spam
          // console.log(`[AvatarViewer] Found Morphs on ${child.name}`);
          child.userData.loggedMorphs = true;
        }

        const setKey = (name, value) => {
          if (child.morphTargetDictionary.hasOwnProperty(name)) {
            const index = child.morphTargetDictionary[name];
            child.morphTargetInfluences[index] = value;
          }
        };

        setKey("measure-bust-circ-incr", chestWeight);
        setKey("breast-volume-vert-up", chestWeight);
        setKey("BreastSize", chestWeight);
        setKey("measure-waist-circ-incr", waistWeight);
        setKey("hip-scale-horiz-incr", hipWeight);
        setKey("buttocks-volume-incr", hipWeight);
        setKey("measure-shoulder-dist-incr", shoulderWeight);

        if (weightVal > 80) {
          const stomachVal = clamp01((weightVal - 80) / 40);
          setKey("stomach-pregnant-incr", stomachVal * 0.7);
        }
      }

      // --- APPLY DEFAULT MATERIALS (If untextured) ---
      if (child.isMesh || child.isSkinnedMesh) {
        // No console.log here (too spammy!)

        const name = (child.name || "").toLowerCase();

        // IDENTIFY PARTS
        const clothingKeywords = ["bra", "pant", "cloth", "dress", "under", "bikini", "sport", "shirt", "jeans", "trousers", "001", "outfit"];
        const isClothing = clothingKeywords.some(k => name.includes(k));
        const isBodyPart = ["eye", "teeth", "tongue", "lash", "human", "body", "skin"].some(k => name.includes(k));

        // GLOBAL FIX: Force OPAQUE on Body Parts (even if they have a texture!)
        if (isBodyPart && child.material) {
          child.material.transparent = false;
          child.material.opacity = 1.0;
          child.material.depthWrite = true;
          child.material.side = THREE.DoubleSide;
        }

        // --- CRITICAL FIX: Z-FIGHTING & CLIPPING ---

        // 1. INFLATION: Physically scale clothing larger to sit OUTSIDE the body
        // We use 1.05 (5% larger) which is necessary for the severe clipping seen in screenshots.
        if (isClothing && !isBodyPart) {
          if (!child.userData.hasInflated) {
            child.scale.multiplyScalar(1.05);
            child.userData.hasInflated = true;
            console.log("Auto-Inflated Clothing Mesh:", name);
          }
        }

        // 2. POLYGON OFFSET (Rendering Priority)
        if (isClothing && child.material && !isBodyPart) {
          child.material.side = THREE.DoubleSide;
          child.material.depthWrite = true;
          child.material.transparent = false; // FORCE OPAQUE
          child.material.alphaTest = 0;
          child.material.polygonOffset = true;
          child.material.polygonOffsetFactor = -4.0; // Aggressive priority
          child.material.polygonOffsetUnits = -4.0;
        }

        // --- MATERIAL FALLBACK ---
        // Only override if the material is COMPLETELY MISSING.
        // We removed the (!child.material.map) check so your Blender Colors are preserved.
        if (!child.material) {
          if (isClothing && !isBodyPart) {
            child.material = new THREE.MeshStandardMaterial({
              color: "#DDDDDD",
              roughness: 0.7,
              side: THREE.DoubleSide,
              transparent: false,
              polygonOffset: true,
              polygonOffsetFactor: -4,
              polygonOffsetUnits: -4
            });
          } else {
            // Default Skin
            child.material = new THREE.MeshStandardMaterial({
              color: "#F5C392",
              roughness: 0.5,
              side: THREE.DoubleSide
            });
          }
        }
      }
    });

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
      onSceneDebug(foundSkeleton ? "SKELETON FOUND!\n" + dump : "NO SKELETON FOUND.\n" + dump);
    }

  }, [scene, onSkeletonLoaded]);

  return <primitive object={scene} position={[0, -0.6, 0]} rotation={[0, 0, 0]} />;
}

// -----------------------------------------------------
// Clothing Model Component (Dictionary Mapped Version)
// -----------------------------------------------------
// -----------------------------------------------------
// Clothing Model Component (Dictionary Mapped Version)
// -----------------------------------------------------
const ClothingModel = ({ url, avatarSkeleton, measurements, isFixedSize = true, adjustmentScale = 1, adjustmentY = 0, adjustmentZ = 0 }) => {
  const { scene } = useGLTF(url);

  useFrame(() => {
    if (!scene) return;

    const hVal = Number(measurements?.height || 170);
    const weightVal = Number(measurements?.weight || 60);

    // Scaling Logic
    let heightScale = 1.0;
    let thicknessScale = 1.0;

    // 1. HEIGHT SCALING: proper coordinate system match
    // Regardless of "Fixed Size", the dress must exist in the same vertical coordinate space 
    // as the Avatar (which is scaled by height). 
    // Otherwise, the bones will pull the mesh, but the local transform will conflict.
    heightScale = hVal > 0 ? hVal / 170 : 1;

    // 2. THICKNESS SCALING: Only if NOT fixed size
    // If Fixed Size (standard dress), we DO NOT scale thickness. 
    // This ensures tight/loose fit is visually apparent.
    if (!isFixedSize) {
      const weightRatio = weightVal > 0 ? weightVal / 60 : 1;
      let tS = 1 + (weightRatio - 1) * 0.6;
      thicknessScale = Math.max(0.8, Math.min(1.5, tS));
    }

    // BASE PARAMS
    const BASE_SCALE = 1.6 * adjustmentScale; // Mult by user adjustment
    const INFLATION = 1.08; // Increased from 1.05 to reduce clipping

    // Apply Uniform Height Scaling to X/Z to maintain dress proportions,
    // Multiplied by Thickness Scale (which is 1.0 for Fixed Size)
    // Multiplied by Inflation
    scene.scale.set(
      BASE_SCALE * heightScale * thicknessScale * INFLATION,
      BASE_SCALE * heightScale,
      BASE_SCALE * heightScale * thicknessScale * INFLATION
    );

    // Position Update
    // We add the adjustmentY to the default -0.6
    scene.position.set(0, -0.6 + adjustmentY, adjustmentZ);
  });

  useEffect(() => {
    if (!scene || !avatarSkeleton) return;

    scene.traverse((child) => {
      // ... (existing material and morph logic same as before)
      if (child.isMesh) {
        child.material.side = THREE.DoubleSide;
        child.material.depthWrite = true;
        child.material.polygonOffset = true;
        child.material.polygonOffsetFactor = -4; // Aggressive priority (was -1)

        // --- APPLY SHAPE KEYS (Sync with Avatar) ---
        // ONLY apply morphs if it's NOT a fixed-size garment.
        if (!isFixedSize && (child.isMesh || child.isSkinnedMesh) && child.morphTargetDictionary && child.morphTargetInfluences) {

          if (!child.userData.loggedMorphs) {
            console.log("[Clothing] Morphs:", child.name, Object.keys(child.morphTargetDictionary));
            child.userData.loggedMorphs = true;
          }

          const toInches = (val) => {
            const v = Number(val);
            if (isNaN(v) || v === 0) return 0;
            if (v > 60) return v / 2.54;
            return v;
          };

          const getWeight = (val, standardVal, range = 20) => {
            const v = toInches(val);
            if (v === 0) return 0;
            const zeroPoint = standardVal - 6;
            return clamp01((v - zeroPoint) / range);
          };

          const standardChest = 34; const standardWaist = 28; const standardHips = 38;

          const chestW = getWeight(measurements?.chest, standardChest, 22);
          const waistW = getWeight(measurements?.waist, standardWaist, 20);
          const hipsW = getWeight(measurements?.hips, standardHips, 22);
          const shoulderW = getWeight(measurements?.shoulders, 14, 12);

          const weightVal = Number(measurements?.weight || 60);

          const setKey = (name, value) => {
            if (child.morphTargetDictionary.hasOwnProperty(name)) {
              child.morphTargetInfluences[child.morphTargetDictionary[name]] = value;
            }
          };

          setKey("measure-bust-circ-incr", chestW);
          setKey("breast-volume-vert-up", chestW);
          setKey("BreastSize", chestW);
          setKey("measure-waist-circ-incr", waistW);
          setKey("hip-scale-horiz-incr", hipsW);
          setKey("buttocks-volume-incr", hipsW);
          setKey("measure-shoulder-dist-incr", shoulderW);

          if (weightVal > 80) {
            const stomachVal = clamp01((weightVal - 80) / 40);
            setKey("stomach-pregnant-incr", stomachVal * 0.7);
          }

          if (child.updateMorphTargets) child.updateMorphTargets();
        }
      }

      if (child.isSkinnedMesh && child.skeleton) {

        const originalBones = child.skeleton.bones;
        const newBones = [];

        // Dictionary of Standard Bone Names -> List of Aliases to Search For
        const BONE_MAPPING = {
          "hips": ["mixamorig:hips", "hips", "root", "pelvis", "hip"],
          "spine": ["mixamorig:spine", "spine", "spine1", "torso"],
          "spine1": ["mixamorig:spine1", "spine1", "spine2", "chest"],
          "spine2": ["mixamorig:spine2", "spine2", "chest", "upperchest", "neck"],
          "neck": ["mixamorig:neck", "neck", "head"],
          "head": ["mixamorig:head", "head"],

          "leftshoulder": ["mixamorig:leftshoulder", "leftshoulder", "shoulder_l", "shoulder.l"],
          "leftarm": ["mixamorig:leftarm", "leftarm", "leftupperarm", "arm_l", "upper_arm.l"],
          "leftforearm": ["mixamorig:leftforearm", "leftforearm", "leftlowerarm", "forearm_l", "lower_arm.l"],
          "lefthand": ["mixamorig:lefthand", "lefthand", "hand_l", "hand.l"],

          "rightshoulder": ["mixamorig:rightshoulder", "rightshoulder", "shoulder_r", "shoulder.r"],
          "rightarm": ["mixamorig:rightarm", "rightarm", "rightupperarm", "arm_r", "upper_arm.r"],
          "rightforearm": ["mixamorig:rightforearm", "rightforearm", "rightlowerarm", "forearm_r", "lower_arm.r"],
          "righthand": ["mixamorig:righthand", "righthand", "hand_r", "hand.r"],

          "leftupleg": ["mixamorig:leftupleg", "leftupleg", "leftthigh", "thigh_l", "thigh.l"],
          "leftleg": ["mixamorig:leftleg", "leftleg", "leftcalf", "calf_l", "shin_l"],
          "leftfoot": ["mixamorig:leftfoot", "leftfoot", "foot_l", "foot.l"],

          "rightupleg": ["mixamorig:rightupleg", "rightupleg", "rightthigh", "thigh_r", "thigh.r"],
          "rightleg": ["mixamorig:rightleg", "rightleg", "rightcalf", "calf_r", "shin_r"],
          "rightfoot": ["mixamorig:rightfoot", "rightfoot", "foot_r", "foot.r"],
        };

        originalBones.forEach((sourceBone) => {
          let targetBone = null;
          const sName = sourceBone.name.toLowerCase().replace(/_/g, ""); // Flatten source name

          // 1. Try to guess the "Type" of the source bone
          let detectedType = null;
          for (const [type, aliases] of Object.entries(BONE_MAPPING)) {
            if (aliases.some(alias => sName.includes(alias.replace(/_|:/g, "")))) {
              detectedType = type;
              break;
            }
          }

          // 2. If type detected, find matching bone in Avatar
          if (detectedType) {
            const targetAliases = BONE_MAPPING[detectedType];
            targetBone = avatarSkeleton.bones.find(b => {
              const tName = b.name.toLowerCase().replace(/mixamorig|:|obj/g, "");
              return targetAliases.some(alias => tName.includes(alias.replace(/mixamorig|:|obj/g, "")));
            });
          }

          // 3. Fallback: Fuzzy Name Match
          if (!targetBone) {
            targetBone = avatarSkeleton.bones.find(b => {
              const tName = b.name.toLowerCase().replace(/mixamorig|:|obj/g, "");
              return sName.includes(tName) || tName.includes(sName);
            });
          }

          // 4. Last Resort: Pin to Root
          if (!targetBone) {
            // console.warn(`Mapping failed for ${sourceBone.name}, pinning to root.`);
            targetBone = avatarSkeleton.bones[0];
          }

          newBones.push(targetBone);
        });

        child.skeleton = new THREE.Skeleton(newBones);
      }
    });

  }, [scene, avatarSkeleton]);

  return (
    <primitive
      object={scene}
      position={[0, -0.6 + adjustmentY, adjustmentZ]} /* UPDATED POSITION */
      rotation={[0, 0, 0]}
    />
  );
}

const CAMERA_POS = [0, 3.0, 11.0]; // Panning UP further (Y=3.0) to push avatar to bottom
const CONTROLS_TARGET = [0, 3.0, 0]; // Look at space well above head
const LIGHT_POS = [5, 10, 5];

export default function AvatarViewer({ measurements, clothingModelUrl }) {
  const [avatarSkeleton, setAvatarSkeleton] = React.useState(null);
  const [sceneDump, setSceneDump] = React.useState("Analyzing...");
  const [showDebug, setShowDebug] = React.useState(false);

  // ADJUSTMENT STATES
  const [scaleMult, setScaleMult] = React.useState(1.0);
  const [offsetY, setOffsetY] = React.useState(0);
  const [offsetZ, setOffsetZ] = React.useState(0);

  // NEW: Size Selection for Fit Analysis
  const [selectedSize, setSelectedSize] = React.useState("M");

  // Capture skeleton (backwards compat)
  const handleSkeletonLoaded = (skeleton) => {
    setAvatarSkeleton(skeleton);
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Helper Toggle */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
        <button
          onClick={() => setShowDebug(!showDebug)}
          style={{ padding: '5px 10px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {showDebug ? "Hide Debug" : "Fix Alignment"}
        </button>

        {showDebug && (
          <div style={{ background: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: '8px', color: 'white', width: '220px' }}>
            <div style={{ marginBottom: '10px' }}>
              <label>Scale: {scaleMult.toFixed(2)}</label>
              <input type="range" min="0.1" max="100.0" step="0.1" value={scaleMult} onChange={e => setScaleMult(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Height (Y): {offsetY.toFixed(2)}</label>
              <input type="range" min="-2.0" max="2.0" step="0.05" value={offsetY} onChange={e => setOffsetY(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Depth (Z): {offsetZ.toFixed(2)}</label>
              <input type="range" min="-1.0" max="1.0" step="0.05" value={offsetZ} onChange={e => setOffsetZ(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
            <small>Adjust these if dress is floating or tiny.</small>
          </div>
        )}
      </div>

      {showDebug && (
        <div style={{
          position: "absolute", top: 250, right: 10, width: "300px", height: "200px",
          background: "rgba(0,0,0,0.8)", color: "#0f0", fontSize: "10px",
          overflow: "auto", zIndex: 999, padding: "10px", whiteSpace: "pre-wrap"
        }}>
          {sceneDump}
        </div>
      )}

      {/* 3D Canvas */}
      <div style={{ width: "100%", height: "100%", borderRadius: "12px", overflow: "hidden" }}>
        <Canvas camera={{ position: CAMERA_POS, fov: 45 }}>
          {/* <Environment preset="city" />  <-- Causing Download Error */}
          <ambientLight intensity={0.7} />
          <directionalLight intensity={1.2} position={LIGHT_POS} castShadow />

          <AvatarModel
            measurements={measurements}
            onSkeletonLoaded={handleSkeletonLoaded}
            onSceneDebug={setSceneDump}
          />

          {clothingModelUrl && (
            <ClothingModel
              url={clothingModelUrl}
              avatarSkeleton={avatarSkeleton}
              measurements={measurements}
              adjustmentScale={scaleMult}
              adjustmentY={offsetY}
              adjustmentZ={offsetZ}
            />
          )}

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


        {/* FIT CALCULATOR OVERLAY */}
        {clothingModelUrl && (
          <FitStatusOverlay
            measurements={measurements}
            selectedSize={selectedSize}
            onSelectSize={setSelectedSize}
          />
        )}
      </div>
    </div>
  );
}

// Simple Fit Calculator Component
function FitStatusOverlay({ measurements, selectedSize, onSelectSize }) {

  const dressSizes = {
    S: { chest: 34, waist: 26, hips: 36 },
    M: { chest: 38, waist: 30, hips: 40 },
    L: { chest: 42, waist: 34, hips: 44 },
    XL: { chest: 46, waist: 38, hips: 48 },
  };

  const targetStats = dressSizes[selectedSize] || dressSizes.M;

  const getStatus = (userVal, dressVal) => {
    const u = Number(userVal) || 0;
    const d = Number(dressVal) || 0;

    // Logic: 
    // If User > Dress + 2 -> Tight (Red)
    // If User < Dress - 3 -> Loose (Yellow)
    // Else -> Perfect (Green)

    if (u > d + 2) return { label: "Tight 🔴", color: "#ff4444" };
    if (u < d - 3) return { label: "Loose 🟡", color: "#ffbb33" };
    return { label: "Perfect 🟢", color: "#00C851" };
  };

  const normalize = (v) => {
    let val = Number(v);
    if (isNaN(val)) return 0;
    if (val > 60) return val / 2.54; // Convert CM to Inches
    return val;
  };

  const chestStat = getStatus(normalize(measurements?.chest), targetStats.chest);
  const waistStat = getStatus(normalize(measurements?.waist), targetStats.waist);
  const hipsStat = getStatus(normalize(measurements?.hips), targetStats.hips);

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      padding: '15px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      fontFamily: 'sans-serif',
      minWidth: '220px',
      pointerEvents: 'auto' // Allow clicking buttons
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{ margin: 0, color: '#333' }}>Fit Analysis</h4>
        <div style={{ display: 'flex', gap: '5px' }}>
          {Object.keys(dressSizes).map(s => (
            <button
              key={s}
              onClick={() => onSelectSize(s)}
              style={{
                background: selectedSize === s ? '#333' : '#ddd',
                color: selectedSize === s ? '#fff' : '#333',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px'
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
        <span>Chest ({targetStats.chest}"):</span>
        <strong style={{ color: chestStat.color }}>{chestStat.label}</strong>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
        <span>Waist ({targetStats.waist}"):</span>
        <strong style={{ color: waistStat.color }}>{waistStat.label}</strong>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
        <span>Hips ({targetStats.hips}"):</span>
        <strong style={{ color: hipsStat.color }}>{hipsStat.label}</strong>
      </div>
    </div>
  );
}

// ✅ preload model (faster loading)
useGLTF.preload("/models/human_base.glb");