import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { TreeMode } from '../types';

interface AudioCardsProps {
  mode: TreeMode;
  audios: string[];
  handPosition?: { x: number; y: number; detected: boolean };
}

interface AudioData {
  id: number;
  url: string;
  chaosPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  speed: number;
}

const AudioCardItem: React.FC<{
  data: AudioData;
  mode: TreeMode;
  handPosition?: { x: number; y: number; detected: boolean };
}> = ({ data, mode, handPosition }) => {
  const groupRef = useRef<THREE.Group>(null);
  const swayOffset = useMemo(() => Math.random() * 100, []);
  const wasActiveRef = useRef(false);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const isFormed = mode === TreeMode.FORMED;
    const time = state.clock.elapsedTime;
    const camera = state.camera;

    const targetPos = isFormed ? data.targetPos : data.chaosPos;
    const step = delta * data.speed;
    groupRef.current.position.lerp(targetPos, step);

    if (isFormed) {
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
      const cameraWorldPos = camera.getWorldPosition(new THREE.Vector3());

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

        {/* Dark panel background */}
        <mesh position={[0, 0.15, 0.025]}>
          <planeGeometry args={[1.0, 1.0]} />
          <meshStandardMaterial color="#05080d" />
        </mesh>

        {/* Circular "record" style disc */}
        <mesh position={[0, 0.2, 0.06]}>
          <circleGeometry args={[0.32, 32]} />
          <meshStandardMaterial
            color="#0f1928"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>

        {/* Play triangle icon */}
        <mesh position={[0.03, 0.2, 0.08]} rotation={[0, 0, 0]}>
          <coneGeometry args={[0.16, 0.28, 3]} />
          <meshStandardMaterial
            color="#D4AF37"
            metalness={1}
            roughness={0.2}
          />
        </mesh>

        {/* Caption */}
        <Text
          position={[0, -0.55, 0.06]}
          fontSize={0.11}
          color="#333"
          anchorX="center"
          anchorY="middle"
        >
          Voice Memory
        </Text>
      </group>
    </group>
  );
};

export const AudioCards: React.FC<AudioCardsProps> = ({
  mode,
  audios,
  handPosition,
}) => {
  const audioData = useMemo(() => {
    if (audios.length === 0) {
      return [];
    }

    const data: AudioData[] = [];
    const height = 9;
    const maxRadius = 5.6;
    const count = audios.length;

    for (let i = 0; i < count; i++) {
      const yNorm = 0.3 + (i / count) * 0.4;
      const y = yNorm * height;
      const r = maxRadius * (1 - yNorm) + 1.0;
      const theta = i * 2.39996 + (2 * Math.PI) / 3;

      const targetPos = new THREE.Vector3(
        r * Math.cos(theta),
        y,
        r * Math.sin(theta)
      );

      // Evenly distributed chaos positions around the tree, third ring
      const chaosRadius = 13;
      const chaosHeightMin = 3;
      const chaosHeightMax = 9;
      const yNormChaos = (i + 0.5) / count;
      const chaosY = chaosHeightMin + (chaosHeightMax - chaosHeightMin) * yNormChaos;
      const chaosAngle = i * 2.39996 + (2 * Math.PI) / 3;

      const chaosPos = new THREE.Vector3(
        chaosRadius * Math.cos(chaosAngle),
        chaosY,
        chaosRadius * Math.sin(chaosAngle)
      );

      data.push({
        id: i,
        url: audios[i],
        chaosPos,
        targetPos,
        speed: 0.9 + Math.random() * 1.2,
      });
    }

    return data;
  }, [audios]);

  return (
    <group>
      {audioData.map((data) => (
        <AudioCardItem
          key={data.id}
          data={data}
          mode={mode}
          handPosition={handPosition}
        />
      ))}
    </group>
  );
};
