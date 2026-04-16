"use client";

/**
 * SaltedSessionDetail (D-10, ADMN-05).
 *
 * Client component: renders the biomechanical analysis summary, a pressure
 * timeline chart, and (if available) the before/after verification report.
 *
 * Chart: we render a minimal inline SVG line chart of total pressure over
 * time rather than pulling in a new dep (recharts). rawPressureData is
 * sampled at 1Hz (every ~100 frames @ 100Hz) for rendering performance.
 *
 * The raw shape of rawPressureData / analysisResult is unknown at compile
 * time (jsonb columns), so every field is coerced with safe fallbacks — the
 * viewer must never crash on partial data.
 */

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminSaltedDetail } from "@/app/api/admin/salted/[id]/route";
import type { VerificationReport } from "@/lib/salted/types";

// Dynamic import to avoid SSR issues with 'use client' inside BeforeAfterReport
const BeforeAfterReport = dynamic(
  () =>
    import("@/components/insole/before-after-report").then(
      (m) => m.BeforeAfterReport
    ),
  { ssr: false }
);

const SESSION_TYPE_LABELS: Record<string, string> = {
  initial: "초기 측정",
  verification: "착용 후 검증",
};

const LANDING_LABELS: Record<string, string> = {
  heel_strike: "뒤꿈치 착지",
  rearfoot: "뒤꿈치 착지",
  midfoot_strike: "중족부 착지",
  midfoot: "중족부 착지",
  forefoot_strike: "전족부 착지",
  forefoot: "전족부 착지",
};

/** Format seconds to "Mm Ss" */
function formatDuration(seconds: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}초`;
  return `${m}분 ${s.toString().padStart(2, "0")}초`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Extract analysis fields with safe fallbacks. */
interface CoercedAnalysis {
  landingPattern: string | null;
  pronationDegree: number | null;
  pronationLabel: string | null;
  copSummary: string | null;
  archFlexibility: number | null;
  weightDistribution: {
    forefoot: number;
    midfoot: number;
    hindfoot: number;
  } | null;
  verificationReport: VerificationReport | null;
}

function coerceAnalysis(raw: unknown): CoercedAnalysis {
  if (!raw || typeof raw !== "object") {
    return {
      landingPattern: null,
      pronationDegree: null,
      pronationLabel: null,
      copSummary: null,
      archFlexibility: null,
      weightDistribution: null,
      verificationReport: null,
    };
  }
  const a = raw as Record<string, unknown>;
  const wd = a.weightDistribution as Record<string, unknown> | undefined;
  const af = a.archFlexibility as Record<string, unknown> | undefined;

  const pronationRaw = typeof a.pronationDegree === "number" ? a.pronationDegree : null;
  let pronationLabel: string | null = null;
  if (pronationRaw != null) {
    if (pronationRaw > 4) pronationLabel = "과내전 (overpronation)";
    else if (pronationRaw < -4) pronationLabel = "과외전 (supination)";
    else pronationLabel = "정상 (normal)";
  }

  let copSummary: string | null = null;
  if (Array.isArray(a.copTrajectory)) {
    copSummary = `${a.copTrajectory.length}개 COP 샘플 기록됨`;
  }

  const archIdx =
    (af && typeof af.dynamicIndex === "number" && af.dynamicIndex) ||
    (af && typeof af.staticIndex === "number" && af.staticIndex) ||
    (typeof a.archFlexibilityIndex === "number" ? a.archFlexibilityIndex : null);

  return {
    landingPattern: typeof a.landingPattern === "string" ? a.landingPattern : null,
    pronationDegree: pronationRaw,
    pronationLabel,
    copSummary,
    archFlexibility: typeof archIdx === "number" ? archIdx : null,
    weightDistribution:
      wd &&
      typeof wd.forefoot === "number" &&
      typeof wd.midfoot === "number" &&
      typeof wd.hindfoot === "number"
        ? {
            forefoot: wd.forefoot,
            midfoot: wd.midfoot,
            hindfoot: wd.hindfoot,
          }
        : null,
    verificationReport:
      a.verificationReport &&
      typeof a.verificationReport === "object" &&
      a.verificationReport !== null &&
      "peakPressureReduction" in (a.verificationReport as Record<string, unknown>)
        ? (a.verificationReport as VerificationReport)
        : null,
  };
}

/** Build timeline samples: (tSec, totalPressure) from rawPressureData. */
interface TimelinePoint {
  t: number;
  total: number;
}

function buildTimeline(raw: unknown): TimelinePoint[] {
  if (!Array.isArray(raw)) return [];
  // Sample at ~1Hz (every 100 frames from a 100Hz stream). For smaller arrays
  // we fall back to "every ceil(N/200)-th frame" so the chart still renders.
  const n = raw.length;
  if (n === 0) return [];
  const target = 200;
  const step = Math.max(1, Math.floor(n / target));
  const out: TimelinePoint[] = [];
  for (let i = 0; i < n; i += step) {
    const frame = raw[i] as Record<string, unknown> | null;
    if (!frame || typeof frame !== "object") continue;
    const pressureArray = frame.pressureArray;
    if (!Array.isArray(pressureArray)) continue;
    let total = 0;
    for (const v of pressureArray) {
      if (typeof v === "number" && Number.isFinite(v)) total += v;
    }
    const ts = typeof frame.timestamp === "number" ? frame.timestamp : i * 10;
    out.push({ t: ts / 1000, total });
  }
  return out;
}

function PressureTimelineChart({ data }: { data: TimelinePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
        원시 데이터 없음
      </div>
    );
  }

  const width = 640;
  const height = 200;
  const padding = { top: 10, right: 12, bottom: 24, left: 44 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const minT = data[0].t;
  const maxT = data[data.length - 1].t;
  const tSpan = Math.max(1e-6, maxT - minT);

  const totals = data.map((d) => d.total);
  const minV = Math.min(...totals);
  const maxV = Math.max(...totals);
  const vSpan = Math.max(1e-6, maxV - minV);

  const pts = data
    .map((d) => {
      const x = padding.left + ((d.t - minT) / tSpan) * plotW;
      const y =
        padding.top + plotH - ((d.total - minV) / vSpan) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // 5 y ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const v = minV + (i / 4) * vSpan;
    const y = padding.top + plotH - (i / 4) * plotH;
    return { v, y };
  });

  // 5 x ticks
  const xTicks = Array.from({ length: 5 }, (_, i) => {
    const t = minT + (i / 4) * tSpan;
    const x = padding.left + (i / 4) * plotW;
    return { t, x };
  });

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[480px]"
        role="img"
        aria-label="압력 데이터 타임라인"
      >
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <line
            key={`y-${i}`}
            x1={padding.left}
            y1={tick.y}
            x2={padding.left + plotW}
            y2={tick.y}
            stroke="#E2E8F0"
            strokeWidth={1}
          />
        ))}

        {/* Y axis labels */}
        {yTicks.map((tick, i) => (
          <text
            key={`yl-${i}`}
            x={padding.left - 6}
            y={tick.y + 3}
            fontSize={10}
            textAnchor="end"
            fill="#64748B"
          >
            {Math.round(tick.v)}
          </text>
        ))}

        {/* X axis labels */}
        {xTicks.map((tick, i) => (
          <text
            key={`xl-${i}`}
            x={tick.x}
            y={height - padding.bottom + 14}
            fontSize={10}
            textAnchor="middle"
            fill="#64748B"
          >
            {tick.t.toFixed(1)}s
          </text>
        ))}

        {/* Axis lines */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + plotH}
          stroke="#94A3B8"
          strokeWidth={1}
        />
        <line
          x1={padding.left}
          y1={padding.top + plotH}
          x2={padding.left + plotW}
          y2={padding.top + plotH}
          stroke="#94A3B8"
          strokeWidth={1}
        />

        {/* Data line */}
        <polyline
          fill="none"
          stroke="#2563EB"
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={pts}
        />

        {/* Axis labels */}
        <text
          x={padding.left + plotW / 2}
          y={height - 3}
          fontSize={11}
          textAnchor="middle"
          fill="#475569"
        >
          시간 (초)
        </text>
        <text
          x={12}
          y={padding.top + plotH / 2}
          fontSize={11}
          textAnchor="middle"
          fill="#475569"
          transform={`rotate(-90 12 ${padding.top + plotH / 2})`}
        >
          총 압력
        </text>
      </svg>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span className="text-sm text-slate-900 tabular-nums">{value}</span>
    </div>
  );
}

export interface SaltedSessionDetailProps {
  session: AdminSaltedDetail;
}

export function SaltedSessionDetail({ session }: SaltedSessionDetailProps) {
  const analysis = useMemo(() => coerceAnalysis(session.analysisResult), [
    session.analysisResult,
  ]);

  const timeline = useMemo(() => buildTimeline(session.rawPressureData), [
    session.rawPressureData,
  ]);

  return (
    <div className="space-y-5">
      {/* Section 1 — Session info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">세션 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <InfoRow
            label="고객명"
            value={session.customer?.name ?? "—"}
          />
          <InfoRow
            label="이메일"
            value={session.customer?.email ?? "—"}
          />
          <InfoRow
            label="세션 유형"
            value={
              <Badge
                variant="outline"
                className={
                  session.sessionType === "verification"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-blue-200 bg-blue-50 text-blue-700"
                }
              >
                {SESSION_TYPE_LABELS[session.sessionType] ?? session.sessionType}
              </Badge>
            }
          />
          <InfoRow
            label="측정 시간"
            value={formatDuration(session.durationSeconds)}
          />
          <InfoRow
            label="데이터 포인트 수"
            value={
              session.dataPointCount != null
                ? Math.round(session.dataPointCount).toLocaleString("ko-KR")
                : "—"
            }
          />
          <InfoRow label="측정일" value={formatDate(session.createdAt)} />
        </CardContent>
      </Card>

      {/* Section 2 — Biomechanical analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">생체역학 분석</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <InfoRow
            label="착지 패턴"
            value={
              analysis.landingPattern
                ? LANDING_LABELS[analysis.landingPattern] ?? analysis.landingPattern
                : "—"
            }
          />
          <InfoRow
            label="프로네이션"
            value={
              analysis.pronationDegree != null
                ? `${analysis.pronationDegree > 0 ? "+" : ""}${analysis.pronationDegree.toFixed(1)}° ${
                    analysis.pronationLabel ?? ""
                  }`
                : "—"
            }
          />
          <InfoRow
            label="COP 궤적"
            value={analysis.copSummary ?? "—"}
          />
          <InfoRow
            label="아치 유연도"
            value={
              analysis.archFlexibility != null
                ? analysis.archFlexibility.toFixed(2)
                : "—"
            }
          />

          {analysis.weightDistribution && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-slate-50 p-2">
                <p className="text-xs text-slate-500">전족부</p>
                <p className="text-sm font-bold text-slate-900">
                  {analysis.weightDistribution.forefoot.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <p className="text-xs text-slate-500">중족부</p>
                <p className="text-sm font-bold text-slate-900">
                  {analysis.weightDistribution.midfoot.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <p className="text-xs text-slate-500">후족부</p>
                <p className="text-sm font-bold text-slate-900">
                  {analysis.weightDistribution.hindfoot.toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3 — Pressure timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">압력 데이터 타임라인</CardTitle>
        </CardHeader>
        <CardContent>
          <PressureTimelineChart data={timeline} />
          {timeline.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              총 {timeline.length.toLocaleString("ko-KR")}개 샘플 표시 (1Hz 다운샘플링)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 4 — Before/after verification report */}
      {analysis.verificationReport && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">검증 보고서</CardTitle>
          </CardHeader>
          <CardContent>
            <BeforeAfterReport report={analysis.verificationReport} />
          </CardContent>
        </Card>
      )}

      {/* Linked designs */}
      {session.linkedDesigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">연결된 인솔 설계</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {session.linkedDesigns.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="text-sm">
                  <span className="font-medium text-slate-900">
                    {d.lineType === "professional" ? "Line 2 · SALTED" : "Line 1 · 카메라"}
                  </span>
                  <span className="ml-2 text-xs text-slate-500">
                    {d.footSide === "left" ? "왼발" : "오른발"}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {d.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * SaltedSessionDetailLoader — fetches a single session by id from the API
 * route. Used by the page as a client-side loader so we can keep the list
 * server-rendered while the detail panel updates on URL param change.
 */
export function SaltedSessionDetailLoader({
  sessionId,
  onClear,
}: {
  sessionId: string;
  onClear: () => void;
}) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: AdminSaltedDetail | null;
  }>({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset loader state when sessionId changes; equivalent to derived-state-from-props which needs explicit reset on mount/id-change.
    setState({ loading: true, error: null, data: null });

    fetch(`/api/admin/salted/${sessionId}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "세션을 불러오지 못했습니다.");
        }
        return res.json();
      })
      .then((body: { session: AdminSaltedDetail }) => {
        if (cancelled) return;
        setState({ loading: false, error: null, data: body.session });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setState({ loading: false, error: err.message, data: null });
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">세션 상세</h2>
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          닫기
        </Button>
      </div>

      {state.loading && (
        <Card>
          <CardContent className="flex h-48 items-center justify-center text-sm text-slate-500">
            불러오는 중...
          </CardContent>
        </Card>
      )}

      {state.error && (
        <Card>
          <CardContent className="flex h-48 items-center justify-center text-sm text-red-600">
            {state.error}
          </CardContent>
        </Card>
      )}

      {state.data && <SaltedSessionDetail session={state.data} />}
    </div>
  );
}
