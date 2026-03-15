import bpy  # type: ignore[import-unresolved]
import sys
import json
import id_map  # type: ignore[import-unresolved]
import os

# --- Argument Parsing ---
# Blender ignores everything before "--"
argv: list[str] = list(sys.argv)  # explicit list[str] so slicing is well-typed
if "--" in argv:
    sep = argv.index("--")
    args: list[str] = [s for i, s in enumerate(argv) if i > sep]
else:
    args = []

if len(args) < 4:
    print("Usage: blender -b -P process_avatar.py -- <clothing_path> <output_path> <measurements_json> <base_avatar_path>")
    sys.exit(1)

clothing_path = args[0]
output_path = args[1]
measurements_json = args[2]
base_avatar_path = args[3]

measurements = json.loads(measurements_json)

print(f"Starting fitting process with measurements: {measurements}")

# --- Helper Functions ---
def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def import_glb(filepath):
    bpy.ops.import_scene.gltf(filepath=filepath)
    # The last imported object is usually the selected one, but let's be safe.
    # Return the imported objects or the primary mesh.
    return bpy.context.selected_objects

def export_glb(filepath, objects):
    # Select only the objects to export
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    
    bpy.ops.export_scene.gltf(filepath=filepath, use_selection=True)

def find_mesh_object(objects):
    for obj in objects:
        if obj.type == 'MESH':
            return obj
    return None

def apply_modifiers(obj):
    bpy.context.view_layer.objects.active = obj
    for mod in obj.modifiers:
        bpy.ops.object.modifier_apply(modifier=mod.name)

# --- Configuration ---
# Morph Target Names (Match your Avatar GLB)
MORPH_MAP = {
    "chest": "measure-bust-circ-incr",
    "waist": "measure-waist-circ-incr",
    "hips": "measure-hips-circ-incr",
    "thigh": "measure-thigh-circ-incr",
    "shoulders": "measure-shoulder-dist-incr"
}

# --- Main Process ---

clear_scene()

# 1. Import Base Avatar
print(f"Importing Base Avatar from: {base_avatar_path}")
try:
    imported_avatar = import_glb(base_avatar_path)
    avatar_obj = find_mesh_object(imported_avatar)
    if not avatar_obj:
        print("Error: Could not find mesh object in base avatar.")
        sys.exit(1)
    
    assert avatar_obj is not None  # guarded by sys.exit above
    avatar_obj.name = "AvatarBody"
except Exception as e:
    print(f"Error importing avatar: {e}")
    sys.exit(1)

# 2. Apply Morphs to Avatar
# Logic from AvatarViewer.js
# const getMorphWeight = (val, min, max) => { ... }
def get_morph_weight(val, min_val, max_val):
    if val is None: return 0
    v = float(val)
    if v == 0: return 0
    # Convert inches if needed (assuming input is inches or cm)
    # JS logic: if v > 60 -> v / 2.54 (cm to inches?? Or huge number check)
    # Assuming input is reasonable. JS was: v > 60 ? v/2.54 : v
    if v > 60: v = v / 2.54
    
    w = (v - min_val) / (max_val - min_val)
    return max(0.0, min(2.0, w * 1.5))

# Calculate weights
chest_w = get_morph_weight(measurements.get('chest'), 28, 50)
waist_w = get_morph_weight(measurements.get('waist'), 28, 50)
hips_w = get_morph_weight(measurements.get('hips'), 28, 48)
thigh_w = get_morph_weight(measurements.get('thigh'), 19, 25)
shoulder_w = get_morph_weight(measurements.get('shoulders'), 13, 18)

print(f"Applying Morphs: Chest={chest_w}, Waist={waist_w}, Hips={hips_w}")

# Set Shape Keys on Avatar
assert avatar_obj is not None  # guarded by sys.exit above
if avatar_obj.data.shape_keys:
    key_blocks = avatar_obj.data.shape_keys.key_blocks
    
    def set_key(name, value):
        if name in key_blocks:
            key_blocks[name].value = value
            key_blocks[name].mute = False # Ensure it's active
    
    set_key(MORPH_MAP['chest'], chest_w)
    set_key(MORPH_MAP['waist'], waist_w)
    set_key(MORPH_MAP['hips'], hips_w)
    set_key(MORPH_MAP['thigh'], thigh_w)
    set_key(MORPH_MAP['shoulders'], shoulder_w)
    # Add others as needed

# 3. Import Clothing
print(f"Importing Clothing from: {clothing_path}")
try:
    imported_clothing = import_glb(clothing_path)
    clothing_obj = find_mesh_object(imported_clothing)
    if not clothing_obj:
        print("Error: Could not find mesh object in clothing file.")
        sys.exit(1)
    
    assert clothing_obj is not None  # guarded by sys.exit above
    clothing_obj.name = "ClothingItem"
except Exception as e:
    print(f"Error importing clothing: {e}")
    sys.exit(1)

# 4. Apply Shrinkwrap Modifier
# We want the clothing to wrap onto the avatar.
print("Applying Shrinkwrap Modifier...")

assert clothing_obj is not None  # guarded by sys.exit above
mod = clothing_obj.modifiers.new(name="SmartShrink", type='SHRINKWRAP')
mod.target = avatar_obj
mod.wrap_method = 'PROJECT' # Or 'NEAREST_SURFACEPOINT' depending on topology
mod.use_negative_direction = True
mod.use_positive_direction = True
mod.offset = 0.002 # Slight offset to prevent z-fighting (2mm)

# Use vertex group if available? Ideally we shrinkwrap the whole approved area.
# For better results, you might want to use Data Transfer to transfer weights first, 
# but for "fitting", shrinkwrap is the direct approach.

# Apply the modifier immediately to "bake" the shape
apply_modifiers(clothing_obj)

# 5. Export the process clothing
print(f"Exporting result to: {output_path}")

# We only want to export the clothing, not the avatar again.
# Unless the frontend wants both combined. Usually just the fitted cloth.
# Select only clothing object
bpy.ops.object.select_all(action='DESELECT')
assert clothing_obj is not None  # guarded by sys.exit above
clothing_obj.select_set(True)

bpy.ops.export_scene.gltf(filepath=output_path, use_selection=True)

print("Done.")
