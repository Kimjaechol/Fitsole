'use client';

import { Html } from '@react-three/drei';
import type { FootMeasurement } from '@/lib/scan/types';

interface MeasurementOverlayProps {
  measurements: FootMeasurement;
}

function DimensionLine({
  start,
  end,
  label,
  value,
  unit = 'mm',
}: {
  start: [number, number, number];
  end: [number, number, number];
  label: string;
  value: number;
  unit?: string;
}) {
  const midpoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];

  const points = [start, end].flatMap((p) => p);

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(points), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#2563EB" linewidth={2} />
      </line>
      <Html position={midpoint} center distanceFactor={0.5}>
        <div className="whitespace-nowrap rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-slate-700 shadow-sm">
          {label}: {value.toFixed(1)} {unit}
        </div>
      </Html>
    </group>
  );
}

export function MeasurementOverlay({ measurements }: MeasurementOverlayProps) {
  return (
    <group>
      {/* Foot length: vertical line along Z axis */}
      <DimensionLine
        start={[0.05, 0, -0.15]}
        end={[0.05, 0, 0.15]}
        label="길이"
        value={measurements.footLength}
      />
      {/* Ball width: horizontal line at widest point */}
      <DimensionLine
        start={[-0.05, 0, 0.02]}
        end={[0.05, 0, 0.02]}
        label="볼 넓이"
        value={measurements.ballWidth}
      />
      {/* Arch height: vertical line at arch */}
      <DimensionLine
        start={[0.02, 0, -0.03]}
        end={[0.02, 0.05, -0.03]}
        label="아치"
        value={measurements.archHeight}
      />
    </group>
  );
}
