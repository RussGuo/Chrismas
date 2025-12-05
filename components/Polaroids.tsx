
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { TreeMode } from '../types';

/**
 * ==================================================================================
 *  INSTRUCTIONS FOR LOCAL PHOTOS
 * ==================================================================================
 * 1. Create a folder named "photos" inside your "public" directory.
 *    (e.g., public/photos/)
 * 
 * 2. Place your JPG images in there.
 * 
 * 3. Rename them sequentially:
 *    1.jpg, 2.jpg, 3.jpg ... up to 13.jpg
 * 
 *    If a file is missing (e.g., you only have 5 photos), the frame will 
 *    display a placeholder instead of crashing the app.
 * ==================================================================================
 */

const PHOTO_COUNT = 22; // How many polaroid frames to generate

interface PolaroidsProps {
  mode: TreeMode;
  uploadedPhotos: string[];
  handPosition?: { x: number; y: number; detected: boolean };
}

interface PhotoData {
  id: number;
  url: string;
  chaosPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  speed: number;
}

const PolaroidItem: React.FC<{
  data: PhotoData;
  mode: TreeMode;
  handPosition?: { x: number; y: number; detected: boolean };
}> = ({ data, mode, handPosition }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [error, setError] = useState(false);

  // Safe texture loading that won't crash the app if a file is missing
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      data.url,
      (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        setTexture(loadedTex);
        setError(false);
      },
      undefined, // onProgress
      (err) => {
        console.warn(`Failed to load image: ${data.url}`, err);
        setError(true);
      }
    );
  }, [data.url]);
  
  // Random sway offset
  const swayOffset = useMemo(() => Math.random() * 100, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const isFormed = mode === TreeMode.FORMED;
    const time = state.clock.elapsedTime;
    const camera = state.camera;
    
    // 1. Position Interpolation
    const targetPos = isFormed ? data.targetPos : data.chaosPos;
    const step = delta * data.speed;
    
    // Smooth lerp to target position
    groupRef.current.position.lerp(targetPos, step);

    // 2. Rotation & Sway Logic
    if (isFormed) {
      // Look at center but face outward
      const dummy = new THREE.Object3D();
      dummy.position.copy(groupRef.current.position);
      dummy.lookAt(0, groupRef.current.position.y, 0);
      dummy.rotateY(Math.PI);

      groupRef.current.quaternion.slerp(dummy.quaternion, step);

      const swayAngle = Math.sin(time * 2.0 + swayOffset) * 0.08;
      const tiltAngle = Math.cos(time * 1.5 + swayOffset) * 0.05;

      const currentRot = new THREE.Euler().setFromQuaternion(
        groupRef.current.quaternion
      );
      groupRef.current.rotation.z = currentRot.z + swayAngle * 0.05;
      groupRef.current.rotation.x = currentRot.x + tiltAngle * 0.05;

      const currentScale = groupRef.current.scale.x || 1;
      const newScale = THREE.MathUtils.lerp(currentScale, 1, delta * 3);
      groupRef.current.scale.setScalar(newScale);
    } else {
      // CHAOS mode - free-floating like particles, no absorption / scaling
      const cameraPos = camera.getWorldPosition(new THREE.Vector3());
      const dummy = new THREE.Object3D();
      dummy.position.copy(groupRef.current.position);
      dummy.lookAt(cameraPos);

      groupRef.current.quaternion.slerp(dummy.quaternion, delta * 3);

      const wobbleX = Math.sin(time * 1.5 + swayOffset) * 0.04;
      const wobbleZ = Math.cos(time * 1.2 + swayOffset) * 0.04;

      const currentRot = new THREE.Euler().setFromQuaternion(
        groupRef.current.quaternion
      );
      groupRef.current.rotation.x = currentRot.x + wobbleX;
      groupRef.current.rotation.z = currentRot.z + wobbleZ;

      groupRef.current.scale.setScalar(1);
    }
  });

  return (
    <group ref={groupRef}>
      
      {/* The Hanging String (Visual only) - fades out at top */}
      <mesh position={[0, 1.2, -0.1]}>
        <cylinderGeometry args={[0.005, 0.005, 1.5]} />
        <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.2} transparent opacity={0.6} />
      </mesh>

      {/* Frame Group (Offset slightly so string connects to top center) */}
      <group position={[0, 0, 0]}>
        
        {/* White Paper Backing */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.2, 1.5, 0.02]} />
          <meshStandardMaterial color="#fdfdfd" roughness={0.8} />
        </mesh>

        {/* The Photo Area */}
        <mesh position={[0, 0.15, 0.025]}>
          <planeGeometry args={[1.0, 1.0]} />
          {texture && !error ? (
            <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
          ) : (
            // Fallback Material (Red for error, Grey for loading)
            <meshStandardMaterial color={error ? "#550000" : "#cccccc"} />
          )}
        </mesh>
        
        {/* "Tape" or Gold Clip */}
        <mesh position={[0, 0.7, 0.025]} rotation={[0,0,0]}>
           <boxGeometry args={[0.1, 0.05, 0.05]} />
           <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.2} />
        </mesh>

        {/* Text Label */}
        <Text
          position={[0, -0.55, 0.03]}
          fontSize={0.12}
          color="#333"
          anchorX="center"
          anchorY="middle"
        >
          {error ? "Image not found" : "Happy Memories"}
        </Text>
      </group>
    </group>
  );
};

export const Polaroids: React.FC<PolaroidsProps> = ({ mode, uploadedPhotos, handPosition }) => {
  const photoData = useMemo(() => {
    // Don't render any photos if none are uploaded
    if (uploadedPhotos.length === 0) {
      return [];
    }

    const data: PhotoData[] = [];
    const height = 9; // Range of height on tree
    const maxRadius = 5.0; // Slightly outside the foliage radius (which is approx 5 at bottom)
    
    const count = uploadedPhotos.length;

    for (let i = 0; i < count; i++) {
      // 1. Target Position
      // Distributed nicely on the cone surface
      const yNorm = 0.2 + (i / count) * 0.6; // Keep between 20% and 80% height
      const y = yNorm * height;
      
      // Radius decreases as we go up
      const r = maxRadius * (1 - yNorm) + 0.8; // +0.8 to ensure it floats OUTSIDE leaves
      
      // Golden Angle Spiral for even distribution
      const theta = i * 2.39996; // Golden angle in radians
      
      const targetPos = new THREE.Vector3(
        r * Math.cos(theta),
        y,
        r * Math.sin(theta)
      );

      // 2. Chaos Position - Evenly distributed ring around the tree
      const chaosRadius = 11;
      const chaosHeightMin = 2;
      const chaosHeightMax = 10;
      const yNormChaos = (i + 0.5) / count;
      const chaosY = chaosHeightMin + (chaosHeightMax - chaosHeightMin) * yNormChaos;
      const chaosAngle = i * 2.39996; // Golden angle for even spread

      const chaosPos = new THREE.Vector3(
        chaosRadius * Math.cos(chaosAngle),
        chaosY,
        chaosRadius * Math.sin(chaosAngle)
      );

      data.push({
        id: i,
        url: uploadedPhotos[i],
        chaosPos,
        targetPos,
        speed: 0.8 + Math.random() * 1.5 // Variable speed
      });
    }
    return data;
  }, [uploadedPhotos]);

  return (
    <group>
      {photoData.map((data, i) => (
        <PolaroidItem key={i} data={data} mode={mode} handPosition={handPosition} />
      ))}
    </group>
  );
};
