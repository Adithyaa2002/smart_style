const { NodeIO } = require('@gltf-transform/core');
const fs = require('fs');
const path = require('path');

const io = new NodeIO();
const uploadsDir = path.join(__dirname, 'uploads');

async function main() {
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.glb'));
    for (const file of files) {
        console.log("-------------------");
        console.log("File:", file);
        try {
            const document = await io.read(path.join(uploadsDir, file));
            const root = document.getRoot();
            const meshes = root.listMeshes();
            for (const mesh of meshes) {
                console.log("  Mesh:", mesh.getName());
                const primitives = mesh.listPrimitives();
                for (const prim of primitives) {
                    const targets = prim.listTargets();
                    if (targets.length > 0) {
                        const targetNames = mesh.listExtras()?.targetNames || mesh.getExtras()?.targetNames;
                        console.log("    Targets length:", targets.length);
                        console.log("    Target Names (if any):", targetNames);

                        // Check gltf extras or nodes for names if mesh extras don't have it
                        for (let i = 0; i < targets.length; i++) {
                            // in gltf transform, target names might be stored differently
                            const name = prim.listTargets()[i].getName() || `target_${i}`;
                            console.log(`      ${i}: ${name}`);
                        }
                    }
                }
            }
        } catch (e) {
            console.error("  Error reading file", e.message);
        }
    }
}
main();
