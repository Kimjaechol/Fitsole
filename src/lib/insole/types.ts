// Insole design types for Line 1 (General) and Line 2 (Professional)
// Covers D-01 through D-04: design parameters, Varioshore TPU zones, hardness mapping

import type { FootSide } from '@/lib/scan/types';

/**
 * Varioshore TPU zone specifications per D-03
 * Temperature controls Shore A hardness via foaming density
 */
export const VARIOSHORE_ZONES = {
  archCore: { tempC: 190, shoreA: 92, color: '#ef4444' },
  heelCupWall: { tempC: 195, shoreA: 85, color: '#f97316' },
  heelCupFloor: { tempC: 200, shoreA: 75, color: '#eab308' },
  forefoot: { tempC: 210, shoreA: 65, color: '#22c55e' },
  toeArea: { tempC: 220, shoreA: 55, color: '#3b82f6' },
} as const;

/** A single Varioshore TPU zone with print parameters */
export interface VarioshoreTpuZone {
  tempC: number;
  shoreA: number;
  flowPct: number;
  color: string;
}

/** Zone name identifier — keys of the VARIOSHORE_ZONES constant */
export type HardnessZone = keyof typeof VARIOSHORE_ZONES;

/**
 * Parametric insole design dimensions per D-01/D-02
 * All linear values in millimeters
 */
export interface DesignParams {
  archHeight: number;           // mm, 25-60
  heelCupDepth: number;         // mm, 15-35
  evaCushionThickness: number;  // mm
  footLength: number;           // mm
  footWidth: number;            // mm
  heelWidth: number;            // mm
  forefootFlex: number;         // 0-1 ratio
  medialPostH: number;          // mm
  lateralPostH: number;         // mm
}

/**
 * Complete insole design record
 */
export interface InsoleDesign {
  id: string;
  userId: string;
  scanId: string;
  footSide: FootSide;
  lineType: 'general' | 'professional';
  designParams: DesignParams;
  hardnessMap: Record<HardnessZone, VarioshoreTpuZone>;
  stlUrl: string | null;
  slicerProfileUrl: string | null;
  designParamsJson: string | null;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
}

/**
 * Input for requesting an insole design generation
 */
export interface InsoleDesignInput {
  scanId: string;
  footSide: FootSide;
  lineType: 'general' | 'professional';
  bodyWeight: number;     // kg
  age: number;
  activityType: 'daily' | 'running' | 'standing';
}
