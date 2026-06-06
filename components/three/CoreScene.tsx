"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useInterfaceStore } from "@/store/useInterfaceStore";

function seeded(index: number, salt: number) {
  return (Math.sin(index * 91.7 + salt * 37.13) + 1) / 2;
}

function CoreMonolith() {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const scrollProgress = useRef(0);
  const scrollVelocity = useRef(0);

  useEffect(() => {
    let previousY = window.scrollY;
    let frame = 0;

    const updateScrollState = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const currentY = window.scrollY;
      scrollProgress.current = THREE.MathUtils.clamp(currentY / maxScroll, 0, 1);
      scrollVelocity.current = THREE.MathUtils.clamp((currentY - previousY) / 900, -0.24, 0.24);
      previousY = currentY;
      frame = 0;
    };

    const onScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(updateScrollState);
      }
    };

    updateScrollState();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  useFrame(({ pointer, clock }) => {
    if (!group.current) {
      return;
    }
    const scrollAngle = scrollProgress.current * Math.PI * 8;
    const idleDrift = Math.sin(clock.elapsedTime * 0.42) * 0.08;
    const velocityKick = scrollVelocity.current * 2.2;

    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      scrollAngle + idleDrift + pointer.x * 0.22,
      0.065,
    );
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      pointer.y * 0.18 + Math.sin(scrollAngle * 0.32) * 0.12,
      0.05,
    );
    group.current.rotation.z = THREE.MathUtils.lerp(
      group.current.rotation.z,
      -pointer.x * 0.16 + velocityKick,
      0.06,
    );
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, pointer.x * 0.45, 0.04);
    group.current.position.y = THREE.MathUtils.lerp(
      group.current.position.y,
      Math.sin(scrollAngle * 0.22) * 0.18,
      0.045,
    );

    if (material.current) {
      material.current.emissiveIntensity =
        0.65 + Math.sin(clock.elapsedTime * 2.2) * 0.2 + Math.abs(scrollVelocity.current) * 0.9;
    }
  });

  return (
    <group ref={group}>
      <Float speed={1.35} rotationIntensity={0.18} floatIntensity={0.38}>
        <mesh castShadow>
          <boxGeometry args={[1.6, 3.9, 0.72, 6, 16, 6]} />
          <meshStandardMaterial
            ref={material}
            color="#090a0d"
            metalness={0.92}
            roughness={0.23}
            emissive="#45ffd2"
            emissiveIntensity={0.72}
          />
        </mesh>
        <mesh scale={[1.72, 4.03, 0.76]}>
          <boxGeometry args={[1, 1, 1, 4, 12, 4]} />
          <meshBasicMaterial color="#55ffd2" wireframe transparent opacity={0.18} />
        </mesh>
      </Float>
      {Array.from({ length: 10 }).map((_, index) => (
        <Float key={index} speed={1 + index * 0.08} rotationIntensity={1} floatIntensity={1.2}>
          <mesh
            position={[
              Math.sin(index * 1.7) * 3.1,
              Math.cos(index * 0.9) * 1.9,
              Math.sin(index * 2.3) * 1.5,
            ]}
            rotation={[index, index * 0.4, index * 0.2]}
          >
            <octahedronGeometry args={[0.12 + (index % 3) * 0.035, 0]} />
            <meshStandardMaterial color={index % 4 === 0 ? "#ff345d" : "#41a7ff"} emissive="#55ffd2" emissiveIntensity={0.28} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function ParticleField() {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const data = new Float32Array(650 * 3);
    for (let index = 0; index < 650; index += 1) {
      data[index * 3] = (seeded(index, 1) - 0.5) * 14;
      data[index * 3 + 1] = (seeded(index, 2) - 0.5) * 8;
      data[index * 3 + 2] = (seeded(index, 3) - 0.5) * 9;
    }
    return data;
  }, []);

  useFrame(({ clock }) => {
    if (points.current) {
      points.current.rotation.y = clock.elapsedTime * 0.025;
      points.current.rotation.x = Math.sin(clock.elapsedTime * 0.18) * 0.04;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.018} color="#55ffd2" transparent opacity={0.58} depthWrite={false} />
    </points>
  );
}

export function CoreScene() {
  const mode = useInterfaceStore((state) => state.mode);
  const dpr: [number, number] = mode === "chaos" ? [1, 1.8] : [1, 1.45];

  return (
    <div className="hero-canvas" aria-hidden="true">
      <Canvas camera={{ position: [0, 0.1, 7.2], fov: 42 }} dpr={dpr} gl={{ antialias: true, alpha: true }}>
        <color attach="background" args={["#030305"]} />
        <fog attach="fog" args={["#030305", 6, 13]} />
        <ambientLight intensity={0.36} />
        <pointLight position={[3, 4, 3]} color="#55ffd2" intensity={32} />
        <pointLight position={[-4, -2, 2]} color="#ff345d" intensity={18} />
        <spotLight position={[0, 5, 5]} angle={0.3} penumbra={0.8} intensity={80} color="#41a7ff" />
        <CoreMonolith />
        <ParticleField />
        <Stars radius={80} depth={20} count={900} factor={2} saturation={0} fade speed={0.45} />
      </Canvas>
    </div>
  );
}
