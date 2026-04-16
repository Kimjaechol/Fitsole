'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface PressureHeatmapProps {
  data: number[][];
  highPressureZones: {
    x: number;
    y: number;
    intensity: number;
    label: string;
  }[];
}

/** Heatmap color anchor points per UI-SPEC */
const COLOR_STOPS: [number, string][] = [
  [0.0, '#3B82F6'],  // Low - Blue
  [0.2, '#06B6D4'],  // Medium-low - Cyan
  [0.4, '#22C55E'],  // Medium - Green
  [0.6, '#EAB308'],  // Medium-high - Yellow
  [0.8, '#F97316'],  // High - Orange
  [1.0, '#EF4444'],  // Very high - Red
];

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

function getHeatmapColor(value: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, value));

  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const [t0, hex0] = COLOR_STOPS[i];
    const [t1, hex1] = COLOR_STOPS[i + 1];
    if (clamped >= t0 && clamped <= t1) {
      const t = (clamped - t0) / (t1 - t0);
      const rgb0 = hexToRgb(hex0);
      const rgb1 = hexToRgb(hex1);
      return [
        Math.round(rgb0[0] + t * (rgb1[0] - rgb0[0])),
        Math.round(rgb0[1] + t * (rgb1[1] - rgb0[1])),
        Math.round(rgb0[2] + t * (rgb1[2] - rgb0[2])),
      ];
    }
  }

  const lastRgb = hexToRgb(COLOR_STOPS[COLOR_STOPS.length - 1][1]);
  return lastRgb;
}

function createHeatmapTexture(data: number[][]): THREE.CanvasTexture {
  const rows = data.length;
  const cols = data[0]?.length ?? 1;
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d')!;

  // Find max for normalization
  let maxVal = 0;
  for (const row of data) {
    for (const val of row) {
      if (val > maxVal) maxVal = val;
    }
  }

  const normalizer = maxVal > 0 ? maxVal : 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const normalized = data[r][c] / normalizer;
      const [red, green, blue] = getHeatmapColor(normalized);
      ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
      ctx.fillRect(c, r, 1, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export function PressureHeatmap({ data, highPressureZones }: PressureHeatmapProps) {
  const texture = useMemo(() => createHeatmapTexture(data), [data]);

  return (
    <group>
      {/* Pressure heatmap plane mapped to foot sole */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[0.12, 0.3]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* High pressure zone labels for accessibility (not color-only) */}
      {highPressureZones.map((zone, i) => (
        <Html
          key={i}
          position={[
            (zone.x - 0.5) * 0.12,
            0.01,
            (zone.y - 0.5) * 0.3,
          ]}
          center
          distanceFactor={0.5}
        >
          <div className="whitespace-nowrap rounded bg-white/90 px-1 py-0.5 text-xs font-medium text-slate-700 shadow-sm">
            {zone.label} ({Math.round(zone.intensity * 100)}%)
          </div>
        </Html>
      ))}
    </group>
  );
}
