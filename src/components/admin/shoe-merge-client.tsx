"use client";

/**
 * Admin Shoe Merge Client (quick/260411-deo).
 *
 * UI for the shoe-scan merge + grading pipeline. Admin users upload:
 *   - a Revopoint interior partial mesh
 *   - an alginate cast exterior mesh
 *   - a scanId (UUID, auto-generated on mount)
 *
 * Posts multipart/form-data to /api/admin/shoe-scan/merge, renders:
 *   - alignment_rmse / overlap_percentage / discrepancy_count with color badges
 *   - resolved_dimensions table (Korean labels, null → '—')
 *   - resolution_report table (method / confidence)
 *   - warnings alert list
 *
 * After a successful merge, exposes a grading block that posts the resolved
 * dimensions as an anchor to /api/admin/shoe-scan/grade for Korean sizes
 * 230–290mm and renders the prediction table.
 *
 * Layout note: `UploadForm`, `MergeResultCard`, `GradingSection`, and
 * `PredictionsTable` are hoisted to module scope. Declaring them inside the
 * parent function body created a fresh component identity on every render,
 * which unmounted the `scanId` text input mid-keystroke (dropping focus) and
 * cleared file-input state on any sibling state change.
 *
 * No new npm dependencies — uses shadcn/ui primitives, sonner, lucide-react.
 */

import { useMemo, useRef, useState } from "react";
import type { FormEvent, MutableRefObject } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Loader2,
  RefreshCcw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** File extensions accepted by /api/admin/shoe-scan/merge. */
const ACCEPTED_EXTENSIONS = [".stl", ".obj", ".ply", ".gltf", ".glb"] as const;

/** 100MB per-file ceiling — keeps server multipart parsing well-behaved. */
const MAX_FILE_BYTES = 100 * 1024 * 1024;

/** Target sizes (mm) that get passed to the grading API. */
const DEFAULT_TARGET_SIZES = [
  230, 235, 240, 245, 250, 255, 260, 265, 270, 275, 280, 285, 290,
] as const;

/**
 * Known dimension keys → Korean labels. Unknown keys render the raw key.
 *
 * NOTE: The Python backend (services/measurement/app/shoe_scan/models.py)
 * emits snake_case keys in `resolved_dimensions` and `resolution_report`,
 * so this map must key on snake_case to resolve labels correctly.
 */
const DIMENSION_LABELS: Record<string, string> = {
  internal_length: "내부 길이",
  internal_width: "내부 너비",
  heel_cup_depth: "힐컵 깊이",
  arch_support_x: "아치 지지점 X",
  toe_box_volume: "토박스 부피",
  instep_clearance: "발등 여유",
};

/**
 * Sensible default thresholds for the color badges. These are NOT research-
 * grade hard limits — adjust them in sync with the SOP quality-gate table.
 */
const RMSE_THRESHOLDS = { good: 1.0, warn: 2.0 } as const; // mm
const OVERLAP_THRESHOLDS = { good: 70, warn: 50 } as const; // %
const DISCREPANCY_THRESHOLDS = { good: 0, warn: 2 } as const; // count

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QualityBand = "good" | "warn" | "bad";

type DimensionValue = number | null | undefined;
type DimensionMap = Record<string, DimensionValue>;

interface ResolutionReportEntry {
  confidence: number;
  method: string;
}

interface MergeResponse {
  success: boolean;
  alignment_rmse: number;
  overlap_percentage: number;
  discrepancy_count: number;
  resolved_dimensions: DimensionMap;
  resolution_report: Record<string, ResolutionReportEntry>;
  warnings: string[];
}

interface GradeResponse {
  anchors_used: number;
  predictions: Record<string, DimensionMap>;
  validation_warnings: string[];
  used_piecewise: boolean;
}

interface ApiErrorResponse {
  error?: string;
  detail?: string;
}

interface DimensionRow {
  key: string;
  label: string;
  value: DimensionValue;
}

interface ResolutionRow {
  key: string;
  label: string;
  method: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function qualityClass(band: QualityBand): string {
  switch (band) {
    case "good":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "warn":
      return "bg-amber-100 text-amber-900 border-amber-300";
    case "bad":
      return "bg-rose-100 text-rose-800 border-rose-300";
  }
}

function qualityLabel(band: QualityBand): string {
  switch (band) {
    case "good":
      return "우수";
    case "warn":
      return "보통";
    case "bad":
      return "재스캔 권장";
  }
}

function rmseBand(mm: number): QualityBand {
  if (mm < RMSE_THRESHOLDS.good) return "good";
  if (mm < RMSE_THRESHOLDS.warn) return "warn";
  return "bad";
}

function overlapBand(pct: number): QualityBand {
  if (pct > OVERLAP_THRESHOLDS.good) return "good";
  if (pct > OVERLAP_THRESHOLDS.warn) return "warn";
  return "bad";
}

function discrepancyBand(count: number): QualityBand {
  if (count <= DISCREPANCY_THRESHOLDS.good) return "good";
  if (count <= DISCREPANCY_THRESHOLDS.warn) return "warn";
  return "bad";
}

function formatNumber(value: DimensionValue, decimals = 2): string {
  if (value === null || value === undefined) return "—";
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toFixed(decimals);
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

function validateFile(
  file: File | null,
  label: string,
): { ok: true } | { ok: false; error: string } {
  if (!file) return { ok: false, error: `${label} 파일을 선택해주세요` };
  const ext = getExtension(file.name);
  if (!ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])) {
    return {
      ok: false,
      error: `${label}: 지원하지 않는 형식입니다 (${ext || "확장자 없음"}). 허용: ${ACCEPTED_EXTENSIONS.join(", ")}`,
    };
  }
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      error: `${label}: 파일 크기(${mb}MB)가 100MB 제한을 초과했습니다`,
    };
  }
  return { ok: true };
}

function generateScanId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback — non-secure but deterministic for the form flow.
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildDimensionRows(dims: DimensionMap | undefined): DimensionRow[] {
  if (!dims) return [];
  return Object.entries(dims).map(([key, value]) => ({
    key,
    label: DIMENSION_LABELS[key] ?? key,
    value,
  }));
}

function sortedSizeKeys(predictions: Record<string, DimensionMap>): string[] {
  return Object.keys(predictions).sort((a, b) => Number(a) - Number(b));
}

// Safely parses a response into either the success payload or an error.
async function parseJsonSafely<T>(res: Response): Promise<T | ApiErrorResponse> {
  try {
    return (await res.json()) as T | ApiErrorResponse;
  } catch {
    return { error: "서버 응답을 해석할 수 없습니다" };
  }
}

// ---------------------------------------------------------------------------
// Sub-components (module-scope so they keep a stable identity across renders
// — declaring them inside the parent dropped focus from the scanId input on
// every keystroke and cleared file inputs on sibling state changes)
// ---------------------------------------------------------------------------

interface UploadFormProps {
  scanId: string;
  setScanId: (v: string) => void;
  revopointFile: File | null;
  castFile: File | null;
  setRevopointFile: (f: File | null) => void;
  setCastFile: (f: File | null) => void;
  isSubmitting: boolean;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  handleReset: () => void;
  revopointInputRef: MutableRefObject<HTMLInputElement | null>;
  castInputRef: MutableRefObject<HTMLInputElement | null>;
}

function UploadForm({
  scanId,
  setScanId,
  revopointFile,
  castFile,
  setRevopointFile,
  setCastFile,
  isSubmitting,
  handleSubmit,
  handleReset,
  revopointInputRef,
  castInputRef,
}: UploadFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-slate-900">
          <Upload className="h-4 w-4" />
          스캔 파일 업로드
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          aria-busy={isSubmitting}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="scanId" className="text-sm font-medium">
              scanId (UUID 권장)
            </Label>
            <Input
              id="scanId"
              type="text"
              value={scanId}
              onChange={(e) => setScanId(e.target.value)}
              placeholder="scanId (자동 생성됨)"
              className="font-mono text-xs"
            />
            <p className="text-xs text-slate-500">
              기본값은 mount 시점에 자동 생성됩니다. 필요 시 덮어쓸 수 있습니다.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="revopoint_mesh" className="text-sm font-medium">
                Revopoint 내부 스캔 (.stl / .obj / .ply / .gltf / .glb)
              </Label>
              <Input
                id="revopoint_mesh"
                ref={revopointInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(",")}
                onChange={(e) =>
                  setRevopointFile(e.target.files?.[0] ?? null)
                }
              />
              {revopointFile && (
                <p className="text-xs text-slate-600">
                  <FileUp className="mr-1 inline h-3 w-3" />
                  {revopointFile.name} ·{" "}
                  {(revopointFile.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cast_mesh" className="text-sm font-medium">
                알지네이트 캐스트 스캔 (.stl / .obj / .ply / .gltf / .glb)
              </Label>
              <Input
                id="cast_mesh"
                ref={castInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(",")}
                onChange={(e) => setCastFile(e.target.files?.[0] ?? null)}
              />
              {castFile && (
                <p className="text-xs text-slate-600">
                  <FileUp className="mr-1 inline h-3 w-3" />
                  {castFile.name} ·{" "}
                  {(castFile.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  병합 중...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  병합 실행
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              다시 업로드
            </Button>
          </div>

          <p className="text-xs text-slate-500">
            파일당 최대 100MB. 지원 포맷: .stl, .obj, .ply, .gltf, .glb.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

interface MergeResultCardProps {
  result: MergeResponse;
  resolvedDimensionRows: DimensionRow[];
  resolutionReportEntries: ResolutionRow[];
}

function MergeResultCard({
  result,
  resolvedDimensionRows,
  resolutionReportEntries,
}: MergeResultCardProps) {
  const rmse = rmseBand(result.alignment_rmse);
  const overlap = overlapBand(result.overlap_percentage);
  const discrepancy = discrepancyBand(result.discrepancy_count);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-slate-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          병합 결과
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quality badges */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500">
              Alignment RMSE
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
              {formatNumber(result.alignment_rmse, 3)}{" "}
              <span className="text-sm text-slate-500">mm</span>
            </p>
            <Badge
              variant="outline"
              className={`mt-2 ${qualityClass(rmse)}`}
            >
              {qualityLabel(rmse)}
            </Badge>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500">
              Overlap Percentage
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
              {formatNumber(result.overlap_percentage, 1)}
              <span className="text-sm text-slate-500">%</span>
            </p>
            <Badge
              variant="outline"
              className={`mt-2 ${qualityClass(overlap)}`}
            >
              {qualityLabel(overlap)}
            </Badge>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500">
              Discrepancy Count
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
              {result.discrepancy_count}
            </p>
            <Badge
              variant="outline"
              className={`mt-2 ${qualityClass(discrepancy)}`}
            >
              {qualityLabel(discrepancy)}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Resolved dimensions */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">
            통합 치수 (resolved_dimensions)
          </h3>
          {resolvedDimensionRows.length === 0 ? (
            <p className="text-sm text-slate-500">치수 데이터가 없습니다</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>항목</TableHead>
                    <TableHead className="text-right">값</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvedDimensionRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium text-slate-700">
                        {row.label}
                        <span className="ml-2 text-xs text-slate-400">
                          ({row.key})
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-900">
                        {formatNumber(row.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Resolution report */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Resolution Report
          </h3>
          {resolutionReportEntries.length === 0 ? (
            <p className="text-sm text-slate-500">
              resolution_report가 비어 있습니다
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>항목</TableHead>
                    <TableHead>해결 방법</TableHead>
                    <TableHead className="text-right">신뢰도</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolutionReportEntries.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium text-slate-700">
                        {row.label}
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {row.method}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-900">
                        {row.confidence.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>경고 ({result.warnings.length})</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

interface GradingSectionProps {
  result: MergeResponse;
  anchorSize: number;
  setAnchorSize: (n: number) => void;
  isGrading: boolean;
  handleGrade: () => void;
  gradeResult: GradeResponse | null;
}

function GradingSection({
  result,
  anchorSize,
  setAnchorSize,
  isGrading,
  handleGrade,
  gradeResult,
}: GradingSectionProps) {
  const anchorSummary = buildDimensionRows(result.resolved_dimensions);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-slate-900">
          사이즈 그레이딩
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="anchorSize" className="text-sm font-medium">
              앵커 사이즈 (mm)
            </Label>
            <Input
              id="anchorSize"
              type="number"
              min={200}
              max={320}
              step={5}
              value={anchorSize}
              onChange={(e) => {
                // Snap to the nearest 5mm so the field respects its own
                // step attribute. Without this, paste/programmatic entry
                // admits decimals (e.g. 273) that never match the
                // DEFAULT_TARGET_SIZES filter and the server is then asked
                // to re-predict the anchor itself.
                const raw = Number(e.target.value);
                setAnchorSize(
                  Number.isFinite(raw) ? Math.round(raw / 5) * 5 : 0,
                );
              }}
            />
            <p className="text-xs text-slate-500">
              기본값 270mm. 한국 사이즈 230~290mm 범위에서 하나의 앵커를
              지정합니다.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              앵커로 사용될 치수
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              {anchorSummary.length === 0 ? (
                <span className="text-slate-500">치수 없음</span>
              ) : (
                <ul className="space-y-1">
                  {anchorSummary.map((row) => (
                    <li
                      key={row.key}
                      className="flex items-center justify-between tabular-nums"
                    >
                      <span className="text-slate-600">{row.label}</span>
                      <span className="font-semibold text-slate-900">
                        {formatNumber(row.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <Button type="button" onClick={handleGrade} disabled={isGrading}>
          {isGrading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              그레이딩 중...
            </>
          ) : (
            "사이즈 그레이딩 실행"
          )}
        </Button>

        {gradeResult && (
          <PredictionsTable
            gradeResult={gradeResult}
            dimensionKeys={Object.keys(result.resolved_dimensions)}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface PredictionsTableProps {
  gradeResult: GradeResponse;
  dimensionKeys: string[];
}

function PredictionsTable({
  gradeResult,
  dimensionKeys,
}: PredictionsTableProps) {
  const sizes = sortedSizeKeys(gradeResult.predictions);

  // Prefer the merge result dimension key order; fall back to keys found on
  // the first prediction row if any are missing.
  const firstRow = sizes[0] ? gradeResult.predictions[sizes[0]] : undefined;
  const keysFromPrediction = firstRow ? Object.keys(firstRow) : [];
  const mergedKeys = Array.from(
    new Set<string>([...dimensionKeys, ...keysFromPrediction]),
  );

  return (
    <div className="space-y-4">
      <Separator />
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <Badge variant="outline">
          사용된 앵커: {gradeResult.anchors_used}
        </Badge>
        <Badge variant="outline">
          구간별 보간 사용 여부:{" "}
          {gradeResult.used_piecewise ? "예" : "아니오"}
        </Badge>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>사이즈 (mm)</TableHead>
              {mergedKeys.map((k) => (
                <TableHead key={k} className="text-right">
                  {DIMENSION_LABELS[k] ?? k}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sizes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={mergedKeys.length + 1}
                  className="text-center text-slate-500"
                >
                  예측 결과 없음
                </TableCell>
              </TableRow>
            ) : (
              sizes.map((size) => {
                const row = gradeResult.predictions[size] ?? {};
                return (
                  <TableRow key={size}>
                    <TableCell className="font-medium tabular-nums text-slate-700">
                      {size}
                    </TableCell>
                    {mergedKeys.map((k) => (
                      <TableCell
                        key={k}
                        className="text-right tabular-nums text-slate-900"
                      >
                        {formatNumber(row[k])}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {gradeResult.validation_warnings.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            Validation Warnings ({gradeResult.validation_warnings.length})
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
              {gradeResult.validation_warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShoeMergeClient() {
  // Form state
  const [revopointFile, setRevopointFile] = useState<File | null>(null);
  const [castFile, setCastFile] = useState<File | null>(null);
  const [scanId, setScanId] = useState<string>(() => generateScanId());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Merge result state
  const [mergeResult, setMergeResult] = useState<MergeResponse | null>(null);

  // Grading state
  const [anchorSize, setAnchorSize] = useState<number>(270);
  const [isGrading, setIsGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResponse | null>(null);

  // Refs so we can reset file inputs via the DOM (controlled file inputs are
  // awkward in React).
  const revopointInputRef = useRef<HTMLInputElement | null>(null);
  const castInputRef = useRef<HTMLInputElement | null>(null);

  const resolvedDimensionRows = useMemo(
    () => buildDimensionRows(mergeResult?.resolved_dimensions),
    [mergeResult],
  );

  const resolutionReportEntries = useMemo<ResolutionRow[]>(() => {
    if (!mergeResult?.resolution_report) return [];
    return Object.entries(mergeResult.resolution_report).map(([key, entry]) => ({
      key,
      label: DIMENSION_LABELS[key] ?? key,
      method: entry.method,
      confidence: entry.confidence,
    }));
  }, [mergeResult]);

  // -------------------------------------------------------------------------
  // Submit handlers
  // -------------------------------------------------------------------------

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedScanId = scanId.trim();
    if (!trimmedScanId) {
      toast.error("scanId를 입력해주세요");
      return;
    }

    const revopointCheck = validateFile(revopointFile, "Revopoint 스캔");
    if (!revopointCheck.ok) {
      toast.error(revopointCheck.error);
      return;
    }
    const castCheck = validateFile(castFile, "알지네이트 캐스트 스캔");
    if (!castCheck.ok) {
      toast.error(castCheck.error);
      return;
    }

    setIsSubmitting(true);
    setGradeResult(null);

    try {
      const formData = new FormData();
      formData.append("revopoint_mesh", revopointFile as File);
      formData.append("cast_mesh", castFile as File);
      formData.append("scanId", trimmedScanId);

      const res = await fetch("/api/admin/shoe-scan/merge", {
        method: "POST",
        body: formData,
      });

      const json = await parseJsonSafely<MergeResponse>(res);

      if (!res.ok || !("success" in json) || json.success !== true) {
        const err = (json as ApiErrorResponse).error ?? "병합에 실패했습니다";
        const detail = (json as ApiErrorResponse).detail;
        toast.error(detail ? `${err}: ${detail}` : err);
        return;
      }

      setMergeResult(json as MergeResponse);
      toast.success("병합이 완료되었습니다");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "네트워크 오류가 발생했습니다";
      toast.error(`병합 요청 실패: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGrade() {
    if (!mergeResult) return;

    // Strip undefined — API expects concrete numeric/null values.
    const cleanedDimensions: DimensionMap = {};
    for (const [key, value] of Object.entries(mergeResult.resolved_dimensions)) {
      if (value !== undefined) cleanedDimensions[key] = value;
    }

    const anchorBase = Number(anchorSize);
    if (!Number.isFinite(anchorBase) || anchorBase < 200 || anchorBase > 320) {
      toast.error("앵커 사이즈는 200~320 mm 범위여야 합니다");
      return;
    }

    // Filter the anchor size out of the target list — the server should not
    // re-predict the exact anchor position.
    const targetSizes = DEFAULT_TARGET_SIZES.filter((s) => s !== anchorBase);

    setIsGrading(true);

    try {
      const res = await fetch("/api/admin/shoe-scan/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchors: [{ size_base: anchorBase, dimensions: cleanedDimensions }],
          target_sizes: targetSizes,
        }),
      });

      const json = await parseJsonSafely<GradeResponse>(res);

      if (!res.ok || !("predictions" in json)) {
        const err =
          (json as ApiErrorResponse).error ?? "사이즈 그레이딩에 실패했습니다";
        const detail = (json as ApiErrorResponse).detail;
        toast.error(detail ? `${err}: ${detail}` : err);
        return;
      }

      setGradeResult(json as GradeResponse);
      toast.success("사이즈 그레이딩이 완료되었습니다");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "네트워크 오류가 발생했습니다";
      toast.error(`그레이딩 요청 실패: ${message}`);
    } finally {
      setIsGrading(false);
    }
  }

  function handleReset() {
    setRevopointFile(null);
    setCastFile(null);
    setMergeResult(null);
    setGradeResult(null);
    setScanId(generateScanId());
    if (revopointInputRef.current) revopointInputRef.current.value = "";
    if (castInputRef.current) castInputRef.current.value = "";
  }

  // -------------------------------------------------------------------------
  // Top-level render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <UploadForm
        scanId={scanId}
        setScanId={setScanId}
        revopointFile={revopointFile}
        castFile={castFile}
        setRevopointFile={setRevopointFile}
        setCastFile={setCastFile}
        isSubmitting={isSubmitting}
        handleSubmit={handleSubmit}
        handleReset={handleReset}
        revopointInputRef={revopointInputRef}
        castInputRef={castInputRef}
      />
      {mergeResult && (
        <MergeResultCard
          result={mergeResult}
          resolvedDimensionRows={resolvedDimensionRows}
          resolutionReportEntries={resolutionReportEntries}
        />
      )}
      {mergeResult && (
        <GradingSection
          result={mergeResult}
          anchorSize={anchorSize}
          setAnchorSize={setAnchorSize}
          isGrading={isGrading}
          handleGrade={handleGrade}
          gradeResult={gradeResult}
        />
      )}
    </div>
  );
}
