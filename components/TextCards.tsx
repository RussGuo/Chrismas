import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { TreeMode } from '../types';

interface TextCardsProps {
  mode: TreeMode;
  texts: string[];
  handPosition?: { x: number; y: number; detected: boolean };
}

interface TextData {
  id: number;
  text: string;
  chaosPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  speed: number;
}

const TextCardItem: React.FC<{
  data: TextData;
  mode: TreeMode;
  handPosition?: { x: number; y: number; detected: boolean };
}> = ({ data, mode, handPosition }) => {
  const groupRef = useRef<THREE.Group>(null);
  const swayOffset = useMemo(() => Math.random() * 100, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const isFormed = mode === TreeMode.FORMED;
    const time = state.clock.elapsedTime;
    const camera = state.camera;

    const targetPos = isFormed ? data.targetPos : data.chaosPos;
    const step = delta * data.speed;
    groupRef.current.position.lerp(targetPos, step);

    if (isFormed) {
      // Align to tree surface and sway gently
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
      // CHAOS mode - free floating, no magnet
      const cameraWorldPos = camera.getWorldPosition(new THREE.Vector3());
      const cameraDir = camera.getWorldDirection(new THREE.Vector3());

      const worldPos = groupRef.current.getWorldPosition(new THREE.Vector3());
      const dummy = new THREE.Object3D();
      dummy.position.copy(worldPos);
      dummy.lookAt(cameraWorldPos);
      dummy.rotateY(Math.PI);

      groupRef.current.quaternion.slerp(dummy.quaternion, delta * 3);

      const wobbleX = Math.sin(time * 1.5 + swayOffset) * 0.04;
      const wobbleZ = Math.cos(time * 1.2 + swayOffset) * 0.04;

      const currentRot = new THREE.Euler().setFromQuaternion(
        groupRef.current.quaternion
      );
      groupRef.current.rotation.x = currentRot.x + wobbleX;
      groupRef.current.rotation.z = currentRot.z + wobbleZ;

      const currentScale = groupRef.current.scale.x || 1;
      const newScale = THREE.MathUtils.lerp(currentScale, 1, delta * 3);
      groupRef.current.scale.setScalar(newScale);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 1.2, -0.1]}>
        <cylinderGeometry args={[0.005, 0.005, 1.5]} />
        <meshStandardMaterial
          color="#D4AF37"
          metalness={1}
          roughness={0.2}
          transparent
          opacity={0.6}
        />
      </mesh>

      <group position={[0, 0, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.2, 1.5, 0.02]} />
          <meshStandardMaterial color="#fdfdfd" roughness={0.8} />
        </mesh>

        <mesh position={[0, 0.15, 0.025]}>
          <planeGeometry args={[1.0, 1.0]} />
          <meshStandardMaterial color="#00150c" />
        </mesh>

        <Text
          position={[0, 0.15, 0.05]}
          fontSize={0.15}
          color="#F5E6BF"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.9}
          lineHeight={1.3}
        >
          {data.text}
        </Text>

        <mesh position={[0, 0.7, 0.025]}>
          <boxGeometry args={[0.1, 0.05, 0.05]} />
          <meshStandardMaterial
            color="#D4AF37"
            metalness={1}
            roughness={0.2}
          />
        </mesh>

        <Text
          position={[0, -0.55, 0.03]}
          fontSize={0.11}
          color="#333"
          anchorX="center"
          anchorY="middle"
        >
          Secret Note
        </Text>
      </group>
    </group>
  );
};

export const TextCards: React.FC<TextCardsProps> = ({
  mode,
  texts,
  handPosition,
}) => {
  const textData = useMemo(() => {
    if (texts.length === 0) {
      return [];
    }

    const data: TextData[] = [];
    const height = 9;
    const maxRadius = 5.3;
    const count = texts.length;

    for (let i = 0; i < count; i++) {
      const yNorm = 0.25 + (i / count) * 0.5;
      const y = yNorm * height;
      const r = maxRadius * (1 - yNorm) + 0.9;
      const theta = i * 2.39996 + Math.PI / 3;

      const targetPos = new THREE.Vector3(
        r * Math.cos(theta),
        y,
        r * Math.sin(theta)
      );

      // Evenly distributed chaos positions around the tree, offset ring
      const chaosRadius = 12;
      const chaosHeightMin = 2.5;
      const chaosHeightMax = 9.5;
      const yNormChaos = (i + 0.5) / count;
      const chaosY = chaosHeightMin + (chaosHeightMax - chaosHeightMin) * yNormChaos;
      const chaosAngle = i * 2.39996 + Math.PI / 3; // Offset from photo ring

      const chaosPos = new THREE.Vector3(
        chaosRadius * Math.cos(chaosAngle),
        chaosY,
        chaosRadius * Math.sin(chaosAngle)
      );

      data.push({
        id: i,
        text: texts[i],
        chaosPos,
        targetPos,
        speed: 0.9 + Math.random() * 1.2,
      });
    }

    return data;
  }, [texts]);

  return (
    <group>
      {textData.map((data) => (
        <TextCardItem
          key={data.id}
          data={data}
          mode={mode}
          handPosition={handPosition}
        />
      ))}
    </group>
  );
};
