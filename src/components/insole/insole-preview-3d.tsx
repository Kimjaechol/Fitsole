'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  VARIOSHORE_ZONES,
  type DesignParams,
  type HardnessZone,
  type VarioshoreTpuZone,
} from '@/lib/insole/types';

interface InsolePreview3DProps {
  designParams: DesignParams;
  hardnessMap: Record<HardnessZone, VarioshoreTpuZone>;
  showPressureOverlay: boolean;
  onToggleOverlay?: () => void;
}

/**
 * Generate a foot-shaped outline as a 2D Shape.
 * Uses simplified bezier curves approximating a foot sole.
 */
function createFootShape(
  footLength: number,
  footWidth: number,
): THREE.Shape {
  // Normalize dimensions (render in scene units, ~0.3m)
  const len = (footLength / 1000) * 1.2; // mm -> scene units, slightly scaled
  const wid = (footWidth / 1000) * 1.2;
  const halfW = wid / 2;

  const shape = new THREE.Shape();

  // Start at heel center-bottom
  shape.moveTo(0, -len * 0.02);

  // Heel curve (rounded)
  shape.bezierCurveTo(
    -halfW * 0.7, -len * 0.02,
    -halfW * 0.8, len * 0.05,
    -halfW * 0.75, len * 0.15,
  );

  // Lateral midfoot arch (concave)
  shape.bezierCurveTo(
    -halfW * 0.65, len * 0.25,
    -halfW * 0.55, len * 0.35,
    -halfW * 0.7, len * 0.5,
  );

  // Ball of foot (widest point)
  shape.bezierCurveTo(
    -halfW * 0.85, len * 0.6,
    -halfW * 0.9, len * 0.7,
    -halfW * 0.6, len * 0.85,
  );

  // Toe area
  shape.bezierCurveTo(
    -halfW * 0.3, len * 0.95,
    halfW * 0.1, len * 0.98,
    halfW * 0.2, len * 0.9,
  );

  // Medial forefoot
  shape.bezierCurveTo(
    halfW * 0.5, len * 0.8,
    halfW * 0.85, len * 0.7,
    halfW * 0.9, len * 0.55,
  );

  // Medial arch (higher curve)
  shape.bezierCurveTo(
    halfW * 0.85, len * 0.4,
    halfW * 0.8, len * 0.25,
    halfW * 0.75, len * 0.15,
  );

  // Back to heel
  shape.bezierCurveTo(
    halfW * 0.7, len * 0.05,
    halfW * 0.6, -len * 0.02,
    0, -len * 0.02,
  );

  return shape;
}

/**
 * Zone boundary definitions as relative Y positions along the foot length.
 * Values represent the fraction of total foot length.
 */
const ZONE_BOUNDARIES = {
  toeArea: { yMin: 0.75, yMax: 1.0 },
  forefoot: { yMin: 0.55, yMax: 0.75 },
  archCore: { yMin: 0.3, yMax: 0.55 },
  heelCupFloor: { yMin: 0.08, yMax: 0.3 },
  heelCupWall: { yMin: 0.0, yMax: 0.08 },
} as const;

interface ZoneMeshProps {
  zone: HardnessZone;
  color: string;
  footLength: number;
  footWidth: number;
  archHeight: number;
  heelCupDepth: number;
}

function ZoneMesh({ zone, color, footLength, footWidth, archHeight, heelCupDepth }: ZoneMeshProps) {
  const geometry = useMemo(() => {
    const len = (footLength / 1000) * 1.2;
    const wid = (footWidth / 1000) * 1.2;
    const halfW = wid / 2;
    const bounds = ZONE_BOUNDARIES[zone];

    const yStart = bounds.yMin * len - len * 0.02;
    const yEnd = bounds.yMax * len - len * 0.02;
    const height = yEnd - yStart;

    // Base thickness varies by zone
    let thickness = 0.003;
    if (zone === 'archCore') thickness = (archHeight / 1000) * 0.3;
    else if (zone === 'heelCupFloor' || zone === 'heelCupWall')
      thickness = (heelCupDepth / 1000) * 0.3;

    // Simple box approximation for each zone, slightly narrower for toe/heel
    let zoneWidth = halfW * 2;
    if (zone === 'toeArea') zoneWidth *= 0.7;
    if (zone === 'heelCupWall' || zone === 'heelCupFloor') zoneWidth *= 0.8;

    const geo = new THREE.BoxGeometry(zoneWidth, thickness, height);
    geo.translate(0, thickness / 2, yStart + height / 2);

    return geo;
  }, [zone, footLength, footWidth, archHeight, heelCupDepth]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function InsoleScene({
  designParams,
  hardnessMap,
}: {
  designParams: DesignParams;
  hardnessMap: Record<HardnessZone, VarioshoreTpuZone>;
}) {
  const footShape = useMemo(
    () => createFootShape(designParams.footLength, designParams.footWidth),
    [designParams.footLength, designParams.footWidth],
  );

  // Thin base plate from foot shape
  const baseGeometry = useMemo(() => {
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.002,
      bevelEnabled: false,
    };
    const geo = new THREE.ExtrudeGeometry(footShape, extrudeSettings);
    // Rotate so the insole lies flat (XZ plane)
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [footShape]);

  const zones = Object.keys(VARIOSHORE_ZONES) as HardnessZone[];

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={0.8} />
      <directionalLight position={[-2, 3, -3]} intensity={0.3} />

      {/* Base insole shape */}
      <mesh geometry={baseGeometry}>
        <meshStandardMaterial
          color="#e5e7eb"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Zone meshes */}
      {zones.map((zone) => (
        <ZoneMesh
          key={zone}
          zone={zone}
          color={hardnessMap[zone]?.color ?? VARIOSHORE_ZONES[zone].color}
          footLength={designParams.footLength}
          footWidth={designParams.footWidth}
          archHeight={designParams.archHeight}
          heelCupDepth={designParams.heelCupDepth}
        />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={0.1}
        maxDistance={0.6}
        target={[0, 0.01, 0.1]}
      />
    </>
  );
}

export function InsolePreview3D({
  designParams,
  hardnessMap,
  showPressureOverlay,
  onToggleOverlay,
}: InsolePreview3DProps) {
  return (
    <div className="space-y-2">
      <div
        className="relative h-[360px] w-full rounded-lg bg-slate-50 md:h-[480px]"
        aria-label="3D 인솔 미리보기 - 드래그하여 회전, 핀치하여 확대"
      >
        <Suspense
          fallback={
            <Skeleton className="h-[360px] w-full rounded-lg md:h-[480px]" />
          }
        >
          <Canvas
            camera={{ position: [0, 0.25, 0.35], fov: 45 }}
            style={{ width: '100%', height: '100%' }}
          >
            <InsoleScene
              designParams={designParams}
              hardnessMap={hardnessMap}
            />
          </Canvas>
        </Suspense>
      </div>

      {/* Toggle overlay button */}
      {onToggleOverlay && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleOverlay}
          >
            {showPressureOverlay ? '영역별 경도 보기' : '압력 분포 보기'}
          </Button>
        </div>
      )}
    </div>
  );
}
