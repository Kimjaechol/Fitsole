"use client";

/**
 * Admin Scan Data Viewer (D-07).
 *
 * Renders a customer's foot scan data for the admin order detail page:
 *   - Embedded 3D foot model (reuses FootModel3D from the scan module)
 *   - Pressure heatmap overlay (toggle, reuses PressureHeatmap)
 *   - Korean-labeled measurement table
 *
 * The component is a client component because the 3D viewers rely on
 * react-three-fiber and browser-only APIs.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FootModel3D } from "@/components/scan/foot-model-3d";
import { PressureHeatmap } from "@/components/scan/pressure-heatmap";
import { HeatmapLegend } from "@/components/scan/heatmap-legend";
import type { AdminScanData } from "@/app/api/admin/orders/[id]/route";

interface ScanDataViewerProps {
  scans: AdminScanData[];
}

const SIDE_LABELS: Record<"left" | "right", string> = {
  left: "왼발",
  right: "오른발",
};

function MeasurementTable({
  measurements,
}: {
  measurements: NonNullable<AdminScanData["measurements"]>;
}) {
  const rows: Array<{ label: string; value: number; unit: string }> = [
    { label: "발 길이", value: measurements.footLength, unit: "mm" },
    { label: "볼 넓이", value: measurements.ballWidth, unit: "mm" },
    { label: "아치 높이", value: measurements.archHeight, unit: "mm" },
    { label: "발등 높이", value: measurements.instepHeight, unit: "mm" },
    { label: "뒤꿈치 넓이", value: measurements.heelWidth, unit: "mm" },
    { label: "발가락 길이", value: measurements.toeLength, unit: "mm" },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.label} className="bg-white">
              <th
                scope="row"
                className="w-1/2 bg-slate-50 px-4 py-2.5 text-left text-xs font-medium text-slate-600"
              >
                {row.label}
              </th>
              <td className="px-4 py-2.5 text-right text-sm font-semibold text-slate-900 tabular-nums">
                {row.value.toFixed(1)} {row.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScanCard({ scan }: { scan: AdminScanData }) {
  const [showHeatmap, setShowHeatmap] = useState(false);

  const hasModel = !!scan.modelUrl;
  const hasPressure = !!scan.pressure && scan.pressure.heatmapData.length > 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            {SIDE_LABELS[scan.footSide]} 스캔
          </h3>
          {scan.qualityLabel && (
            <Badge variant="outline" className="text-xs">
              품질: {scan.qualityLabel}
            </Badge>
          )}
        </div>

        {/* 3D model */}
        {hasModel ? (
          <FootModel3D modelUrl={scan.modelUrl!}>
            {showHeatmap && hasPressure && (
              <PressureHeatmap
                data={scan.pressure!.heatmapData}
                highPressureZones={scan.pressure!.highPressureZones}
              />
            )}
          </FootModel3D>
        ) : (
          <div className="flex h-[240px] w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            3D 모델이 아직 생성되지 않았습니다
          </div>
        )}

        {/* Heatmap toggle + legend */}
        {hasPressure && hasModel && (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant={showHeatmap ? "default" : "outline"}
              size="sm"
              onClick={() => setShowHeatmap((prev) => !prev)}
            >
              {showHeatmap ? "압력 분포 숨기기" : "압력 분포 보기"}
            </Button>
            {showHeatmap && <HeatmapLegend />}
          </div>
        )}

        {/* Measurement table */}
        {scan.measurements ? (
          <MeasurementTable measurements={scan.measurements} />
        ) : (
          <p className="text-sm text-slate-500">측정 값이 없습니다</p>
        )}

        {/* Gait summary (if any) */}
        {scan.gait && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">보행 패턴:</span>
              <span>{scan.gait.gaitPattern}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-semibold text-slate-700">발목 정렬:</span>
              <span>{scan.gait.ankleAlignment}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-semibold text-slate-700">아치 유연도:</span>
              <span className="tabular-nums">
                {scan.gait.archFlexibilityIndex.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ScanDataViewer({ scans }: ScanDataViewerProps) {
  if (!scans || scans.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-[200px] items-center justify-center p-6 text-sm text-slate-500">
          스캔 데이터 없음
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {scans.map((scan) => (
        <ScanCard key={scan.scanId} scan={scan} />
      ))}
    </div>
  );
}
