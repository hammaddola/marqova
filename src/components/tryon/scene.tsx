"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { useRef } from "react";
import type { Group } from "three";
import type { BodyMeasurements, FitLevel, GarmentKind } from "@/lib/fit";

export const FIT_COLORS: Record<FitLevel, string> = { good: "#1F7A5A", loose: "#C8A24A", tight: "#B3261E" };

export type WornGarment = { kind: GarmentKind; color: string; regions: Partial<Record<"chest" | "waist" | "hips" | "footLength", FitLevel>> };

type Props = { heightCm: number; body: BodyMeasurements; skin: string; garments: WornGarment[]; fitMap: boolean; spin: boolean };

/**
 * Stylised, proportional mannequin. Dimensions come from the fit engine's body
 * estimate, so changing height/weight/shape visibly reshapes the avatar.
 */
function Mannequin({ heightCm, body, skin, garments, fitMap, spin }: Props) {
  const group = useRef<Group>(null);
  useFrame((_, dt) => {
    if (spin && group.current) group.current.rotation.y += dt * 0.8;
  });
  const h = heightCm / 100; // metres
  // Radii from circumferences (r = C / 2π), in metres.
  const r = (c: number) => c / 100 / (2 * Math.PI);
  const chestR = r(body.chest);
  const waistR = r(body.waist);
  const hipR = r(body.hips);
  const legLen = h * 0.47;
  const torsoLen = h * 0.3;
  const hipY = legLen;
  const chestY = hipY + torsoLen * 0.72;
  const headR = h * 0.065;

  const fit = (g: WornGarment, region: keyof WornGarment["regions"]) => (fitMap && g.regions[region] ? FIT_COLORS[g.regions[region]!] : g.color);
  const top = garments.find((g) => g.kind === "TOP");
  const bottom = garments.find((g) => g.kind === "BOTTOM");
  const dress = garments.find((g) => g.kind === "DRESS");
  const shoes = garments.find((g) => g.kind === "SHOES");
  const skinMat = <meshStandardMaterial color={skin} roughness={0.7} />;
  const cloth = (color: string) => <meshStandardMaterial color={color} roughness={0.85} />;

  return (
    <group ref={group} position={[0, -h / 2, 0]}>
      {/* Head & neck */}
      <mesh position={[0, chestY + torsoLen * 0.42 + headR * 1.3, 0]} castShadow>
        <sphereGeometry args={[headR, 32, 32]} />
        {skinMat}
      </mesh>
      <mesh position={[0, chestY + torsoLen * 0.38, 0]}>
        <cylinderGeometry args={[headR * 0.45, headR * 0.5, headR * 0.9, 16]} />
        {skinMat}
      </mesh>
      {/* Torso: chest + waist sections */}
      <mesh position={[0, chestY, 0]} scale={[1, 1, 0.72]} castShadow>
        <cylinderGeometry args={[chestR * 1.02, waistR, torsoLen * 0.55, 32]} />
        {top ? cloth(fit(top, "chest")) : dress ? cloth(fit(dress, "chest")) : skinMat}
      </mesh>
      <mesh position={[0, hipY + torsoLen * 0.2, 0]} scale={[1, 1, 0.75]} castShadow>
        <cylinderGeometry args={[waistR, hipR, torsoLen * 0.42, 32]} />
        {dress ? cloth(fit(dress, "waist")) : top ? cloth(fit(top, "waist")) : bottom ? cloth(fit(bottom, "waist")) : skinMat}
      </mesh>
      {/* Shoulders */}
      <mesh position={[0, chestY + torsoLen * 0.28, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.7]}>
        <capsuleGeometry args={[chestR * 0.32, chestR * 1.5, 8, 16]} />
        {top ? cloth(fit(top, "chest")) : dress ? cloth(dress.color) : skinMat}
      </mesh>
      {/* Arms */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (chestR * 1.2), chestY + torsoLen * 0.18, 0]} rotation={[0, 0, s * 0.12]}>
          <mesh position={[0, -h * 0.13, 0]} castShadow>
            <capsuleGeometry args={[h * 0.028, h * 0.22, 8, 16]} />
            {top ? cloth(top.color) : skinMat}
          </mesh>
          <mesh position={[0, -h * 0.34, 0]} castShadow>
            <capsuleGeometry args={[h * 0.022, h * 0.17, 8, 16]} />
            {skinMat}
          </mesh>
        </group>
      ))}
      {/* Hips & legs */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * hipR * 0.48, hipY, 0]}>
          <mesh position={[0, -legLen * 0.25, 0]} castShadow>
            <capsuleGeometry args={[hipR * 0.42, legLen * 0.38, 8, 16]} />
            {bottom ? cloth(fit(bottom, "hips")) : dress ? cloth(fit(dress, "hips")) : skinMat}
          </mesh>
          <mesh position={[0, -legLen * 0.72, 0]} castShadow>
            <capsuleGeometry args={[hipR * 0.28, legLen * 0.36, 8, 16]} />
            {bottom ? cloth(bottom.color) : skinMat}
          </mesh>
          {/* Feet */}
          <mesh position={[0, 0.03 - legLen + legLen * 0.02, body.footLength / 200 - 0.03]} castShadow>
            <boxGeometry args={[h * 0.055, h * 0.04, body.footLength / 100]} />
            {shoes ? cloth(fit(shoes, "footLength")) : skinMat}
          </mesh>
        </group>
      ))}
      {/* Dress skirt */}
      {dress && (
        <mesh position={[0, hipY - legLen * 0.22, 0]} scale={[1, 1, 0.8]} castShadow>
          <cylinderGeometry args={[hipR * 1.05, hipR * 1.6, legLen * 0.5, 32, 1, true]} />
          <meshStandardMaterial color={fit(dress, "hips")} roughness={0.85} side={2} />
        </mesh>
      )}
    </group>
  );
}

export default function TryOnScene(props: Props) {
  return (
    <Canvas shadows camera={{ position: [0, 0.1, 3.2], fov: 38 }} dpr={[1, 2]} aria-label="3D avatar preview">
      <color attach="background" args={["#0E1A2B"]} />
      <hemisphereLight args={["#ffffff", "#1C2A40", 0.9]} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#C8A24A" />
      <Mannequin {...props} />
      <ContactShadows position={[0, -props.heightCm / 200 - 0.005, 0]} opacity={0.5} scale={4} blur={2.4} far={2} />
      <OrbitControls enablePan={false} minDistance={1.6} maxDistance={5} minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 1.8} />
    </Canvas>
  );
}
