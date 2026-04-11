/**
 * Shoe model types for internal dimension database.
 *
 * Based on smartphone photogrammetry research:
 * - Hernandez & Lemaire 2017 (±2.6mm accuracy)
 * - Tandfonline 2025 (sub-millimeter accuracy with video + patterned targets)
 * - Springer BioMedical Engineering OnLine 2026 (clinically accepted thresholds)
 *
 * Workflow:
 * 1. Wholesale partner/admin scans shoe interior with patterned target
 * 2. Python SfM pipeline reconstructs 3D cavity mesh
 * 3. Measurement extractor derives internal dimensions
 * 4. Record saved with scanStatus='draft'
 * 5. Admin verifies and sets scanStatus='verified'
 * 6. Insole order flow queries verified records for accurate fit
 */

export type ShoeFitType = "narrow" | "standard" | "wide";

export type ShoeScanStatus = "draft" | "processing" | "verified" | "failed";

export type ShoeCategory =
  | "running"
  | "casual"
  | "dress"
  | "boots"
  | "sandals"
  | "sports";

export type ContributorType =
  | "admin"
  | "wholesale_partner"
  | "user_crowdsource";

/**
 * Core shoe model record — represents one specific shoe in one specific size.
 * (Same model in different sizes = separate records with shared brand/modelName.)
 */
export interface ShoeModel {
  id: string;

  // Identification
  brand: string;
  modelName: string;
  variant: string | null;
  sizeBase: number;

  // Internal dimensions (mm)
  internalLength: number;
  internalWidth: number;
  heelCupDepth: number | null;
  archSupportX: number | null;
  toeBoxVolume: number | null;
  instepClearance: number | null;

  // Classification
  fitType: ShoeFitType;
  shoeCategory: ShoeCategory | null;

  // Data provenance
  scanStatus: ShoeScanStatus;
  scanVideoUrl: string | null;
  scanModelUrl: string | null;
  scanQualityScore: number | null;
  scanAccuracy: number | null;
  contributorId: string | null;
  contributorType: ContributorType | null;

  // Verification
  verifiedAt: Date | null;
  verifiedBy: string | null;
  verificationNotes: string | null;

  // Metadata
  imageUrl: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Shoe scan request payload (admin/partner scanning tool).
 */
export interface ShoeScanRequest {
  brand: string;
  modelName: string;
  variant?: string;
  sizeBase: number;
  shoeCategory?: ShoeCategory;
  fitType?: ShoeFitType;
  contributorType: ContributorType;
  notes?: string;
}

/**
 * Shoe scan result returned by the Python measurement service.
 */
export interface ShoeScanResult {
  scanId: string;
  status: "success" | "failed";
  measurements: {
    internalLength: number;
    internalWidth: number;
    heelCupDepth: number;
    archSupportX: number;
    toeBoxVolume: number;
    instepClearance: number;
  } | null;
  qualityScore: number;
  accuracy: number;
  modelUrl: string | null;
  errorMessage: string | null;
}

/**
 * Summary of a shoe model for listing/selection UI.
 */
export interface ShoeModelSummary {
  id: string;
  brand: string;
  modelName: string;
  sizeBase: number;
  variant: string | null;
  fitType: ShoeFitType;
  shoeCategory: ShoeCategory | null;
  internalLength: number;
  internalWidth: number;
  imageUrl: string | null;
  scanStatus: ShoeScanStatus;
}

/**
 * Insole fit mode — determines how the insole is sized relative to the user's foot.
 * - 'shoe_specific': Insole sized to match a specific shoe's internal dimensions
 *                    (high precision, requires shoe model DB lookup)
 * - 'trim_to_fit': Insole sized slightly larger than foot with trim lines
 *                  (universal fallback when shoe model unknown)
 */
export type InsoleFitMode = "shoe_specific" | "trim_to_fit";
