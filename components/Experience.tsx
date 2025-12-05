
import React, { useRef, useEffect } from 'react';
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { Polaroids } from './Polaroids';
import { TextCards } from './TextCards';
import { AudioCards } from './AudioCards';
import { TreeStar } from './TreeStar';
import { TreeMode } from '../types';

interface ExperienceProps {
  mode: TreeMode;
  handPosition: { x: number; y: number; detected: boolean };
  uploadedPhotos: string[];
  uploadedTexts: string[];
  uploadedAudios: string[];
}

export const Experience: React.FC<ExperienceProps> = ({
  mode,
  handPosition,
  uploadedPhotos,
  uploadedTexts,
  uploadedAudios,
}) => {
  const controlsRef = useRef<any>(null);
  const sceneGroupRef = useRef<THREE.Group>(null);
  const spinSpeedRef = useRef(0);
  const smoothHandRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (mode === TreeMode.FORMED) {
      (window as any).__memoryMagnet__ = undefined;
    }
  }, [mode]);

  useFrame((state, delta) => {
    const controls = controlsRef.current;
    if (controls) {
      const minPolar = Math.PI / 4;
      const maxPolar = Math.PI / 1.8;
      const radius = controls.getDistance();
      const targetY = 4;

      const hasHand = handPosition.detected && mode === TreeMode.CHAOS;

      if (hasHand) {
        // Smooth hand input to remove jitter
        const alpha = 0.18; // smoothing factor
        smoothHandRef.current.x = THREE.MathUtils.lerp(
          smoothHandRef.current.x,
          handPosition.x,
          alpha
        );
        smoothHandRef.current.y = THREE.MathUtils.lerp(
          smoothHandRef.current.y,
          handPosition.y,
          alpha
        );

        const sx = smoothHandRef.current.x;
        const sy = smoothHandRef.current.y;

        // Hand directly controls camera orbit in CHAOS mode
        const targetAzimuth = (sx - 0.5) * Math.PI * 3;

        const adjustedY = (sy - 0.2) * 2.0;
        const clampedY = Math.max(0, Math.min(1, adjustedY));
        const targetPolar = minPolar + clampedY * (maxPolar - minPolar);

        const currentAzimuth = controls.getAzimuthalAngle();
        const currentPolar = controls.getPolarAngle();

        let azimuthDiff = targetAzimuth - currentAzimuth;
        if (azimuthDiff > Math.PI) azimuthDiff -= Math.PI * 2;
        if (azimuthDiff < -Math.PI) azimuthDiff += Math.PI * 2;

        const lerpSpeed = 8;
        const newAzimuth = currentAzimuth + azimuthDiff * delta * lerpSpeed;
        const newPolar =
          currentPolar + (targetPolar - currentPolar) * delta * lerpSpeed;

        const x = radius * Math.sin(newPolar) * Math.sin(newAzimuth);
        const y = targetY + radius * Math.cos(newPolar);
        const z = radius * Math.sin(newPolar) * Math.cos(newAzimuth);

        controls.object.position.set(x, y, z);
        controls.target.set(0, targetY, 0);
        controls.update();
      } else {
        // Auto orbit when there is no usable hand input
        const currentAzimuth = controls.getAzimuthalAngle();
        const currentPolar = controls.getPolarAngle();

        const autoSpeed = mode === TreeMode.CHAOS ? 0.35 : 0.15;
        const newAzimuth = currentAzimuth + autoSpeed * delta;

        const targetPolar = (minPolar + maxPolar) / 2;
        const smoothedPolar = THREE.MathUtils.lerp(
          currentPolar,
          targetPolar,
          delta * 1.5
        );

        const x = radius * Math.sin(smoothedPolar) * Math.sin(newAzimuth);
        const y = targetY + radius * Math.cos(smoothedPolar);
        const z = radius * Math.sin(smoothedPolar) * Math.cos(newAzimuth);

        controls.object.position.set(x, y, z);
        controls.target.set(0, targetY, 0);
        controls.update();
      }
    }

    // Global slow spin when in CHAOS mode
    const targetSpin = mode === TreeMode.CHAOS ? 0.25 : 0; // radians per second
    spinSpeedRef.current = THREE.MathUtils.lerp(spinSpeedRef.current, targetSpin, delta * 1.5);

    if (sceneGroupRef.current) {
      sceneGroupRef.current.rotation.y += spinSpeedRef.current * delta;
    }
  });
  return (
    <>
      <OrbitControls 
        ref={controlsRef}
        enablePan={false} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 1.8}
        minDistance={10}
        maxDistance={30}
        enableDamping
        dampingFactor={0.05}
        enabled={true}
      />

      {/* Lighting Setup for Maximum Luxury */}
      <Environment preset="lobby" background={false} blur={0.8} />
      
      <ambientLight intensity={0.2} color="#004422" />
      <spotLight 
        position={[10, 20, 10]} 
        angle={0.2} 
        penumbra={1} 
        intensity={2} 
        color="#fff5cc" 
        castShadow 
      />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#D4AF37" />

      <group ref={sceneGroupRef} position={[0, -5, 0]}>
        <Foliage mode={mode} count={12000} />
        <Ornaments mode={mode} count={600} />
        <Polaroids
          mode={mode}
          uploadedPhotos={uploadedPhotos}
          handPosition={handPosition}
        />
        <TextCards
          mode={mode}
          texts={uploadedTexts}
          handPosition={handPosition}
        />
        <AudioCards
          mode={mode}
          audios={uploadedAudios}
          handPosition={handPosition}
        />
        <TreeStar mode={mode} />

        {/* Subtle base platform, matching emerald luxury style */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <circleGeometry args={[7, 64]} />
          <meshStandardMaterial
            color="#02140b"
            metalness={0.4}
            roughness={0.85}
            emissive="#0b2c1c"
            emissiveIntensity={0.15}
          />
        </mesh>
        
        {/* Floor Reflections */}
        <ContactShadows 
          opacity={0.35} 
          scale={40} 
          blur={3.5} 
          far={6} 
          color="#02140b" 
        />
      </group>

      <EffectComposer enableNormalPass={false}>
        <Bloom 
          luminanceThreshold={0.8} 
          mipmapBlur 
          intensity={1.5} 
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.7} />
        <Noise opacity={0.02} blendFunction={BlendFunction.OVERLAY} />
      </EffectComposer>
    </>
  );
};
