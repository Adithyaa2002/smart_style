import React, { Suspense, useRef } from 'react';
import { ARButton, XR } from '@react-three/xr';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

function Model({ url }) {
    const { scene } = useGLTF(url);

    // Force materials to render correctly in AR
    scene.traverse((child) => {
        if (child.isMesh || child.isSkinnedMesh) {
            child.frustumCulled = false;
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return (
        <primitive
            object={scene}
            position={[0, 0, 0]} // Center at origin
            scale={[1, 1, 1]}    // Real world 1:1 scale
        />
    );
}

// Draggable/Rotatable container for the model
function InteractiveModel({ url }) {
    const modelRef = useRef();

    // Basic interaction handlers (e.g. if user points AR controller at it)
    const onSelect = (e) => {
        // Simple rotation bump on click/select
        if (modelRef.current) {
            modelRef.current.rotation.y += Math.PI / 4;
        }
    };

    return (
        <group ref={modelRef} position={[0, -1, -2]} onClick={onSelect}>
            {/* Place it 1 meter down, 2 meters in front of the user initially */}
            <Model url={url} />
        </group>
    );
}

const ARViewer = ({ modelUrl, onClose }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#000', // Black background while loading AR
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }}>

            {/* UI Controls overlay */}
            <div style={{
                position: 'absolute',
                top: 20,
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        padding: '10px 20px',
                        background: '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                    }}
                >
                    ✘ Close AR View
                </button>
                <p style={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: '5px 15px', borderRadius: '15px' }}>
                    Tap the AR button below to enter. Look around your floor!
                </p>
            </div>

            {/* The AR Button that requests camera access (must be attached to DOM) */}
            <ARButton
                sessionInit={{ requiredFeatures: ['hit-test'] }}
                style={{
                    position: 'absolute',
                    bottom: '40px',
                    padding: '15px 30px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    borderRadius: '10px',
                    backgroundColor: '#4285F4',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    zIndex: 10001
                }}
            />

            <Canvas>
                <XR>
                    <ambientLight intensity={1} />
                    <directionalLight position={[10, 10, 10]} intensity={1.5} castShadow />

                    <Suspense fallback={null}>
                        {/* We don't render an Environment in AR, let the real world light it ideally, or add a subtle one */}
                        <InteractiveModel url={modelUrl} />
                    </Suspense>
                </XR>
            </Canvas>
        </div>
    );
};

export default ARViewer;
