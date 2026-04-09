// SALTED smart insole kit types per D-05 through D-09
// BLE connection, pressure frame streaming, biomechanical analysis

/** BLE connection state machine for SALTED insole kit */
export type BleConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'streaming'
  | 'error';

/**
 * Single pressure frame from SALTED insole sensor
 * Streamed at ~100Hz via BLE
 */
export interface SaltedPressureFrame {
  timestamp: number;         // ms since session start
  pressureArray: number[];   // sensor grid values
  imuData: {
    accelX: number;
    accelY: number;
    accelZ: number;
    gyroX: number;
    gyroY: number;
    gyroZ: number;
  } | null;
}

/**
 * Biomechanical analysis derived from SALTED session data per D-07
 */
export interface BiomechanicalAnalysis {
  landingPattern: 'heel_strike' | 'midfoot_strike' | 'forefoot_strike';
  pronationDegree: number;   // degrees
  copTrajectory: { x: number; y: number; t: number }[];
  archFlexibility: {
    staticIndex: number;
    dynamicIndex: number;
  };
  weightDistribution: {
    forefoot: number;   // percentage
    midfoot: number;    // percentage
    hindfoot: number;   // percentage
  };
}

/**
 * SALTED measurement session record
 */
export interface SaltedSession {
  id: string;
  userId: string;
  scanId: string | null;
  sessionType: 'initial' | 'verification';
  frames: SaltedPressureFrame[];
  analysis: BiomechanicalAnalysis | null;
  durationSeconds: number;
  dataPointCount: number;
  createdAt: string;
}

/**
 * Before/after verification report comparing initial vs post-insole sessions
 */
export interface VerificationReport {
  initialSessionId: string;
  verificationSessionId: string;
  peakPressureReduction: number;     // percentage
  contactAreaIncrease: number;       // percentage
  zoneComparisons: {
    zone: string;
    before: number;
    after: number;
    improvement: number;             // percentage
  }[];
}
