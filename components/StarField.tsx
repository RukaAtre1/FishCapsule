"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const StarParticles = ({ count = 5000 }) => {
  const mesh = useRef<THREE.Points>(null);
  const { viewport, mouse } = useThree();

  const particles = useMemo(() => {
    const temp = new Float32Array(count * 3);
    const original = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Spread particles across a wide area to simulate depth and space
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 10;
      temp[i * 3] = x;
      temp[i * 3 + 1] = y;
      temp[i * 3 + 2] = z;

      original[i * 3] = x;
      original[i * 3 + 1] = y;
      original[i * 3 + 2] = z;
    }
    return { positions: temp, originalPositions: original };
  }, [count]);

  useFrame((state, delta) => {
    if (!mesh.current) return;

    // Slow rotation of the entire galaxy
    mesh.current.rotation.x -= delta / 100;
    mesh.current.rotation.y -= delta / 150;

    const positions = mesh.current.geometry.attributes.position.array as Float32Array;
    const originals = particles.originalPositions;

    // Convert normalized mouse coordinates (-1 to 1) to world coordinates roughly
    // This is an approximation. For exact raycasting, we'd use the raycaster, 
    // but for a background effect, this is efficient and sufficient.
    const mouseX = mouse.x * viewport.width / 2;
    const mouseY = mouse.y * viewport.height / 2;

    for (let i = 0; i < count; i++) {
      const px = positions[i * 3];
      const py = positions[i * 3 + 1];
      const pz = positions[i * 3 + 2];

      const ox = originals[i * 3];
      const oy = originals[i * 3 + 1];
      const oz = originals[i * 3 + 2];

      const dx = mouseX - px;
      const dy = mouseY - py;

      // Calculate distance from interacting point
      const dist = Math.sqrt(dx * dx + dy * dy);
      const repulseRadius = 2.0;

      if (dist < repulseRadius) {
        // Repulsion force
        const force = (repulseRadius - dist) / repulseRadius;
        const angle = Math.atan2(dy, dx);

        // Push away
        positions[i * 3] -= Math.cos(angle) * force * 0.1;
        positions[i * 3 + 1] -= Math.sin(angle) * force * 0.1;

        // Add some Z movement for 3D feel
        positions[i * 3 + 2] += force * 0.1;
      } else {
        // Return to original position (spring back)
        positions[i * 3] += (ox - px) * 0.02;
        positions[i * 3 + 1] += (oy - py) * 0.02;
        positions[i * 3 + 2] += (oz - pz) * 0.02;
      }
    }

    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#ffffff" // White stars
        sizeAttenuation={true}
        transparent={true}
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default function StarField() {
  return (
    <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-[#0B0B15] to-[#12122A]">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        dpr={[1, 2]} // Handle high DPI screens
        gl={{ antialias: false }}
      >
        <StarParticles />
      </Canvas>
    </div>
  );
}
