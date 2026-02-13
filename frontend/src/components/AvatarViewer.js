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

// ✅ Added hideBaseClothes prop
function AvatarModel({ measurements, faceParams, onSkeletonLoaded, onSceneDebug, baseModelUrl, hideBaseClothes }) {
  // Configurable Base Model
  const { scene } = useGLTF(baseModelUrl || "/models/human_base.glb");

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

    const heightScale = 1;
    const thicknessScale = 1;

    const isMale = baseModelUrl?.includes("male_base") && !baseModelUrl?.includes("female");
    const BASE_SCALE = isMale ? 3.8 : 3.5; // Male increased to 3.8, Female increased to 3.5

    if (scene) {
      scene.scale.set(
        BASE_SCALE * heightScale * thicknessScale,
        BASE_SCALE * heightScale,
        BASE_SCALE * heightScale * thicknessScale
      );
    }

    const weightVal = Number(measurements?.weight || 60);

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
    if (faceParams && b.head) {
      if (!b.head.userData.hasLoggedFace) {
        console.log("👤 Applying Face Params (SCALER ACTIVE):", faceParams);
        console.log("💀 Head Bone:", b.head.name);
        b.head.userData.hasLoggedFace = true;
      }

      // 1. Face Width -> Scale X
      // INCREASE SENSITIVITY: 0.8 - 1.4
      const faceWidthScale = 0.8 + (faceParams.faceWidth || 0.5) * 0.6;

      // 2. Chin/Face Height -> Scale Y
      // INCREASE SENSITIVITY: 0.8 - 1.3
      const faceHeightScale = 0.8 + (faceParams.chinHeight || 0.5) * 0.5;

      // Apply Head Scaling
      b.head.scale.set(faceWidthScale, faceHeightScale, faceWidthScale * 0.95);

      // If we have a separate Jaw bone
      if (b.jaw && faceParams.jawWidth) {
        if (!b.jaw.userData.hasLoggedFace) {
          console.log("🦷 Applying Jaw Params:", faceParams.jawWidth);
          b.jaw.userData.hasLoggedFace = true;
        }
        // INCREASE SENSITIVITY: 0.7 - 1.5
        const jawScale = 0.7 + (faceParams.jawWidth || 0.5) * 0.8;
        b.jaw.scale.set(jawScale, 1, 1);
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

      // --- APPLY DEFAULT MATERIALS (If untextured) ---
      if (child.isMesh || child.isSkinnedMesh) {
        // No console.log here (too spammy!)

        const name = (child.name || "").toLowerCase();

        // IDENTIFY PARTS
        // ✅ Expanded keywords to catch more clothing types
        const clothingKeywords = ["bra", "pant", "cloth", "dress", "under", "bikini", "sport", "shirt", "jeans", "trousers", "001", "outfit", "top", "shorts"];
        const isClothing = clothingKeywords.some(k => name.includes(k));
        const isBodyPart = ["eye", "teeth", "tongue", "lash", "human", "body", "skin"].some(k => name.includes(k));

        // ✅ HIDE BASE CLOTHES LOGIC RESTORED
        if (hideBaseClothes && isClothing && !isBodyPart) {
          child.visible = false;
        } else {
          // Ensure visibility is reset if not hidden (e.g. if loaded without dress later)
          child.visible = true;
        }

        // GLOBAL FIX: Force OPAQUE on Body Parts (even if they have a texture!)
        if (isBodyPart && child.material) {
          child.material.transparent = false;
          child.material.opacity = 1.0;
          child.material.depthWrite = true;
          child.material.side = THREE.DoubleSide;
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
// Clothing Model Component (Synced Logic)
// -----------------------------------------------------
const ClothingModel = ({ url, avatarSkeleton, measurements, isFixedSize = true, adjustmentScale = 1, adjustmentY = 0, adjustmentZ = 0, isMale = false }) => {
  const { scene } = useGLTF(url);

  // Ref to avoid stale closures in useFrame
  const measurementsRef = React.useRef(measurements);
  useEffect(() => {
    measurementsRef.current = measurements;
  }, [measurements]);

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

          // DICTIONARY MAPPING FOR ROBUSTNESS
          // (Standard Mixamo names -> Synonyms)
          // Keys are the "Target Type" we want to find in the Avatar.
          const BONE_MAPPING = {
            "hips": ["mixamorig:hips", "hips", "root", "pelvis", "hip", "pelvis_limit"],
            "spine": ["mixamorig:spine", "spine", "spine1", "torso", "spine_01"],
            "spine1": ["mixamorig:spine1", "spine1", "spine2", "chest", "spine_02"],
            "spine2": ["mixamorig:spine2", "spine2", "upperchest", "chest_upper", "spine_03", "breast_l", "breast_r", "pec_l", "pec_r"], // Map Breasts to Upper Chest
            "neck": ["mixamorig:neck", "neck", "head_base", "neck_01"],
            "head": ["mixamorig:head", "head", "face", "head_01"],

            "leftshoulder": ["mixamorig:leftshoulder", "leftshoulder", "shoulder_l", "shoulder.l", "clavicle_l", "l_collar", "l_clavicle"],
            "leftarm": ["mixamorig:leftarm", "leftarm", "leftupperarm", "arm_l", "upper_arm.l", "l_uparm", "upperarm_l"],
            "leftforearm": ["mixamorig:leftforearm", "leftforearm", "leftlowerarm", "forearm_l", "lower_arm.l", "l_forearm", "lowerarm_l"],
            "lefthand": ["mixamorig:lefthand", "lefthand", "hand_l", "hand.l", "l_hand", "hand_l"],

            // FINGERS (Left) - Extended Segments
            "leftthumb": ["mixamorig:lefthandthumb1", "thumb_01_l", "thumb.l", "l_thumb"],
            "leftthumb2": ["mixamorig:lefthandthumb2", "thumb_02_l"],
            "leftthumb3": ["mixamorig:lefthandthumb3", "thumb_03_l"],

            "leftindex": ["mixamorig:lefthandindex1", "index_01_l", "index.l", "l_index"],
            "leftindex2": ["mixamorig:lefthandindex2", "index_02_l"],
            "leftindex3": ["mixamorig:lefthandindex3", "index_03_l"],

            "leftmiddle": ["mixamorig:lefthandmiddle1", "middle_01_l", "middle.l", "l_middle"],
            "leftmiddle2": ["mixamorig:lefthandmiddle2", "middle_02_l"],
            "leftmiddle3": ["mixamorig:lefthandmiddle3", "middle_03_l"],

            "leftring": ["mixamorig:lefthandring1", "ring_01_l", "ring.l", "l_ring"],
            "leftring2": ["mixamorig:lefthandring2", "ring_02_l"],
            "leftring3": ["mixamorig:lefthandring3", "ring_03_l"],

            "leftpinky": ["mixamorig:lefthandpinky1", "pinky_01_l", "pinky.l", "l_pinky"],
            "leftpinky2": ["mixamorig:lefthandpinky2", "pinky_02_l"],
            "leftpinky3": ["mixamorig:lefthandpinky3", "pinky_03_l"],

            "rightshoulder": ["mixamorig:rightshoulder", "rightshoulder", "shoulder_r", "shoulder.r", "clavicle_r", "r_collar", "r_clavicle"],
            "rightarm": ["mixamorig:rightarm", "rightarm", "rightupperarm", "arm_r", "upper_arm.r", "r_uparm", "upperarm_r"],
            "rightforearm": ["mixamorig:rightforearm", "rightforearm", "rightlowerarm", "forearm_r", "lower_arm.r", "r_forearm", "lowerarm_r"],
            "righthand": ["mixamorig:righthand", "righthand", "hand_r", "hand.r", "r_hand", "hand_r"],

            // FINGERS (Right) - Extended Segments
            "rightthumb": ["mixamorig:righthandthumb1", "thumb_01_r", "thumb.r", "r_thumb"],
            "rightthumb2": ["mixamorig:righthandthumb2", "thumb_02_r"],
            "rightthumb3": ["mixamorig:righthandthumb3", "thumb_03_r"],

            "rightindex": ["mixamorig:righthandindex1", "index_01_r", "index.r", "r_index"],
            "rightindex2": ["mixamorig:righthandindex2", "index_02_r"],
            "rightindex3": ["mixamorig:righthandindex3", "index_03_r"],

            "rightmiddle": ["mixamorig:righthandmiddle1", "middle_01_r", "middle.r", "r_middle"],
            "rightmiddle2": ["mixamorig:righthandmiddle2", "middle_02_r"],
            "rightmiddle3": ["mixamorig:righthandmiddle3", "middle_03_r"],

            "rightring": ["mixamorig:righthandring1", "ring_01_r", "ring.r", "r_ring"],
            "rightring2": ["mixamorig:righthandring2", "ring_02_r"],
            "rightring3": ["mixamorig:righthandring3", "ring_03_r"],

            "rightpinky": ["mixamorig:righthandpinky1", "pinky_01_r", "pinky.r", "r_pinky"],
            "rightpinky2": ["mixamorig:righthandpinky2", "pinky_02_r"],
            "rightpinky3": ["mixamorig:righthandpinky3", "pinky_03_r"],

            "leftupleg": ["mixamorig:leftupleg", "leftupleg", "leftthigh", "thigh_l", "thigh.l", "l_thigh"],
            "leftleg": ["mixamorig:leftleg", "leftleg", "leftcalf", "calf_l", "shin_l", "l_calf"],
            "leftfoot": ["mixamorig:leftfoot", "leftfoot", "foot_l", "foot.l", "l_foot", "foot_01_l"],

            "rightupleg": ["mixamorig:rightupleg", "rightupleg", "rightthigh", "thigh_r", "thigh.r", "r_thigh"],
            "rightleg": ["mixamorig:rightleg", "rightleg", "rightcalf", "calf_r", "shin_r", "r_calf"],
            "rightfoot": ["mixamorig:rightfoot", "rightfoot", "foot_r", "foot.r", "r_foot", "foot_01_r"],
          };

          originalBones.forEach(sourceBone => {
            const sName = sourceBone.name.toLowerCase().replace(/_/g, "");
            let targetBone = null;

            // 1. Precise Name Matching
            // Try to find what "Type" this source bone is
            let detectedType = null;
            for (const [type, aliases] of Object.entries(BONE_MAPPING)) {
              if (aliases.some(alias => sName.includes(alias.replace(/_|:/g, "")))) {
                detectedType = type;
                break;
              }
            }

            // 2. If Type found, map to Avatar Bone of that Type
            // (We need to search Avatar skeleton for that type too)
            if (detectedType) {
              const targetAliases = BONE_MAPPING[detectedType];
              targetBone = avatarSkeleton.bones.find(b => {
                const tName = b.name.toLowerCase().replace(/mixamorig|:|obj/g, "");
                return targetAliases.some(alias => tName.includes(alias.replace(/mixamorig|:|obj/g, "")));
              });
            }

            // 3. Fallback: Direct Name Match
            if (!targetBone) {
              targetBone = avatarSkeleton.bones.find(b => {
                const tName = b.name.toLowerCase().replace(/mixamorig|:|obj/g, "");
                return sName.includes(tName) || tName.includes(sName);
              });
            }

            if (targetBone) {
              // console.log(`Mapped ${sourceBone.name} -> ${targetBone.name}`);
              newBones.push(targetBone);
            } else {
              console.warn("⚠️ Could not map bone (Floating):", sourceBone.name);
              newBones.push(avatarSkeleton.bones[0]); // Fallback to root
            }
          });

          // Apply the avatar's skeleton to the clothing mesh
          // This means the clothing will now move/scale EXACTLY with the body bones!
          child.skeleton = new THREE.Skeleton(newBones);
        }
      }
    });
  }, [scene, avatarSkeleton]);

  // Sync Morph Targets & Global Scale
  useFrame(() => {
    if (!scene) return;
    const meas = measurementsRef.current;

    // 1. GLOBAL SCALE
    // Must match AvatarModel's base scale exactly.
    // AvatarModel uses: isMale ? 3.8 : 3.5
    const BASE_SCALE = isMale ? 3.8 : 3.5;

    // We apply this scale to the clothing root so it matches the avatar root size.
    // We DO NOT add extra "widthFactor" or "bulkFactor" here because the bones (which we bound to)
    // are ALREADY scaled by the AvatarModel logic (hipsRatio, waistRatio, etc).
    scene.scale.set(BASE_SCALE, BASE_SCALE, BASE_SCALE);

    // 2. MORPH TARGETS (1:1 Sync)
    // Calculate weights exactly like AvatarModel
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
      return Math.max(0, Math.min(2.0, w * 1.5)); // Same formula as AvatarModel
    };

    // Calculate standard weights
    const chestW = getMorphWeight(meas?.chest, 28, 50);
    const waistW = getMorphWeight(meas?.waist, 28, 50);
    const hipsW = getMorphWeight(meas?.hips, 28, 48);
    const thighW = getMorphWeight(meas?.thigh, 19, 25);
    const shoulderW = getMorphWeight(meas?.shoulders, 13, 18);
    const calfW = thighW * 0.7;

    scene.traverse((child) => {
      if (child.morphTargetInfluences && child.morphTargetDictionary) {

        // Helper to set morph
        const setKey = (name, value) => {
          if (child.morphTargetDictionary.hasOwnProperty(name)) {
            child.morphTargetInfluences[child.morphTargetDictionary[name]] = value;
          }
        };

        // Apply SAME keys as AvatarModel
        setKey("measure-bust-circ-incr", chestW);
        setKey("measure-waist-circ-incr", waistW);
        setKey("measure-hips-circ-incr", hipsW);
        setKey("measure-thigh-circ-incr", thighW);
        setKey("measure-calf-circ-incr", calfW);
        setKey("measure-knee-circ-incr", thighW * 0.5);
        setKey("measure-shoulder-dist-incr", shoulderW);

        // Legacy / Backup
        setKey("breast-volume-vert-up", chestW);
        setKey("BreastSize", chestW);
      }
    });
  });

  return (
    <primitive
      object={scene}
      position={[0, -0.6, 0]} // Match AvatarModel position
      rotation={[0, 0, 0]}
    />
  );
}

const CAMERA_POS = [0, 3.0, 11.0]; // Panning UP further (Y=3.0) to push avatar to bottom
const CONTROLS_TARGET = [0, 3.0, 0]; // Look at space well above head
const LIGHT_POS = [5, 10, 5];

export default function AvatarViewer({ measurements, clothingModelUrl, faceParams, modelUrl = "/models/human_base.glb" }) {
  const [avatarSkeleton, setAvatarSkeleton] = React.useState(null);
  const [sceneDump, setSceneDump] = React.useState("Analyzing...");
  const [showDebug, setShowDebug] = React.useState(false);

  // ADJUSTMENT STATES
  const [scaleMult, setScaleMult] = React.useState(1.25);
  const [offsetY, setOffsetY] = React.useState(0);
  const [offsetZ, setOffsetZ] = React.useState(0);

  // Determine Gender for Layout/Logic
  const isMale = (measurements?.gender === "male") || (modelUrl?.toLowerCase().includes("male"));



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
      {/* Helper Toggle */}

      {/* DOWNLOAD BUTTON */}
      <button
        onClick={handleDownload}
        style={{
          position: "absolute", top: 20, right: 20, zIndex: 110,
          background: "#333", color: "#fff", border: "none",
          padding: "8px 16px", borderRadius: "20px", cursor: "pointer",
          fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
        }}
      >
        📸 Save Look
      </button>

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
        <Canvas camera={{ position: CAMERA_POS, fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
          {/* <Environment preset="city" />  <-- Causing Download Error */}
          <ambientLight intensity={0.7} />
          <directionalLight intensity={1.2} position={LIGHT_POS} castShadow />

          <React.Suspense fallback={<Html center><div style={{ color: "white", background: "black", padding: "10px" }}>Loading 3D Model...</div></Html>}>
            <AvatarModel
              baseModelUrl={modelUrl}
              measurements={measurements}
              faceParams={faceParams} // ✅ Pass Face Params
              onSkeletonLoaded={handleSkeletonLoaded}
              onSceneDebug={setSceneDump}
              // ✅ Pass hideBaseClothes prop
              hideBaseClothes={!!clothingModelUrl}
            />

            {clothingModelUrl && (
              <ClothingModel
                url={clothingModelUrl}
                avatarSkeleton={avatarSkeleton}
                measurements={measurements}
                isFixedSize={false}
                adjustmentScale={scaleMult}
                adjustmentY={offsetY}
                adjustmentZ={offsetZ}
                isMale={isMale}
              />
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
    </div>
  );
}



// ✅ preload model (faster loading)
useGLTF.preload("/models/human_base.glb");
