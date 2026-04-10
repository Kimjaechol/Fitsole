// Scan workflow types for foot measurement pipeline
// Covers 9 measurement items: 6 static SfM (D-11) + 3 dynamic gait (D-12) + pressure estimation (D-13)

/** Scan workflow state machine states (per UI-SPEC) */
export type ScanStatus =
  | 'idle'
  | 'onboarding'
  | 'positioning'
  | 'recording_foot'
  | 'recording_gait_side'
  | 'recording_gait_rear'
  | 'uploading'
  | 'processing'
  | 'results'
  | 'error';

/**
 * Gait video view type (D-21 through D-25: 2-phase biomechanically-correct capture).
 * - 'side' = Sagittal plane (camera on user's side at knee height, landscape)
 *           → measures stride, dorsiflexion, arch flex, gait cycle
 * - 'rear' = Frontal plane (camera behind user at hip height, portrait)
 *           → measures pronation/supination, Q-angle, bilateral symmetry
 */
export type GaitViewType = 'side' | 'rear';

/** Which foot is being scanned (D-20: left/right scanned independently) */
export type FootSide = 'left' | 'right';

/** Server-side processing stages for progress tracking */
export type ProcessingStage =
  | 'analyzing_video'
  | 'generating_model'
  | 'calculating_measurements'
  | 'analyzing_gait'
  | 'estimating_pressure'
  | 'complete';

/** Quality warning types from real-time frame assessment (D-19) */
export interface QualityWarning {
  type: 'blur' | 'dark' | 'angle' | 'a4_not_detected' | 'speed';
  message: string; // Korean text per UI-SPEC copywriting contract
}

/**
 * Static foot measurements from SfM 3D reconstruction (D-11)
 * All values in millimeters
 */
export interface FootMeasurement {
  footLength: number;
  ballWidth: number;
  instepHeight: number;
  archHeight: number;
  heelWidth: number;
  toeLength: number;
}

/**
 * Dynamic gait analysis results from walking video AI (D-12)
 */
export interface GaitAnalysisResult {
  gaitPattern: 'normal' | 'overpronation' | 'supination';
  ankleAlignment: 'neutral' | 'pronation' | 'supination';
  archFlexibilityIndex: number; // 0-1 scale
}

/**
 * AI-estimated plantar pressure distribution (D-13)
 * Heatmap data is a 2D grid; high pressure zones are labeled points
 */
export interface PressureData {
  heatmapData: number[][];
  highPressureZones: {
    x: number;
    y: number;
    intensity: number;
    label: string;
  }[];
}

/**
 * Complete scan result for one foot
 */
export interface ScanResult {
  id: string;
  footSide: FootSide;
  status: ScanStatus;
  qualityScore: number; // 0-100
  qualityLabel: 'good' | 'fair' | 'poor';
  measurements: FootMeasurement | null;
  gaitAnalysis: GaitAnalysisResult | null;
  pressureData: PressureData | null;
  modelUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

/**
 * Scan session grouping left and right foot scans
 */
export interface ScanSession {
  id: string;
  userId: string;
  leftFoot: ScanResult | null;
  rightFoot: ScanResult | null;
  currentStep: number; // 1-4
  currentFoot: FootSide;
}
