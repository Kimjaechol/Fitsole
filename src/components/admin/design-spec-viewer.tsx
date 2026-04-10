"use client";

/**
 * Admin Insole Design Spec Viewer (D-08).
 *
 * Renders one insole design's full spec for the admin order detail page:
 *   - Embedded 3D insole preview (reuses InsolePreview3D from the insole module)
 *   - Design parameters table (arch height, heel cup depth, foot side, shoe size)
 *   - TPU temperature map (zone -> Shore A + temperature)
 *   - STL download button (disabled if no STL)
 *   - Line type badge (camera vs SALTED)
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InsolePreview3D } from "@/components/insole/insole-preview-3d";
import { VARIOSHORE_ZONES } from "@/lib/insole/types";
import type {
  DesignParams,
  HardnessZone,
  VarioshoreTpuZone,
} from "@/lib/insole/types";
import type { AdminDesignData } from "@/app/api/admin/orders/[id]/route";
import { Download } from "lucide-react";

interface DesignSpecViewerProps {
  design: AdminDesignData;
  shoeSize?: number | null;
}

const SIDE_LABELS: Record<"left" | "right", string> = {
  left: "왼발",
  right: "오른발",
};

const ZONE_LABELS: Record<HardnessZone, string> = {
  archCore: "아치 코어",
  heelCupWall: "힐컵 벽",
  heelCupFloor: "힐컵 바닥",
  forefoot: "전족부",
  toeArea: "발가락",
};

function extractNumber(
  params: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const v = params[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/**
 * Coerce a free-form designParams JSON into a DesignParams shape.
 * Falls back to safe defaults so the 3D preview never crashes.
 */
function coerceDesignParams(
  raw: Record<string, unknown>,
  shoeSize: number | null
): DesignParams {
  const fallbackLength = shoeSize ?? 250;
  return {
    archHeight: extractNumber(raw, ["archHeight", "arch_height", "arch"]) ?? 35,
    heelCupDepth:
      extractNumber(raw, ["heelCupDepth", "heel_cup_depth", "heelCup"]) ?? 22,
    evaCushionThickness:
      extractNumber(raw, ["evaCushionThickness", "eva_cushion_thickness"]) ?? 4,
    footLength:
      extractNumber(raw, ["footLength", "foot_length"]) ?? fallbackLength,
    footWidth: extractNumber(raw, ["footWidth", "foot_width"]) ?? 95,
    heelWidth: extractNumber(raw, ["heelWidth", "heel_width"]) ?? 65,
    forefootFlex:
      extractNumber(raw, ["forefootFlex", "forefoot_flex"]) ?? 0.5,
    medialPostH:
      extractNumber(raw, ["medialPostH", "medial_post_h"]) ?? 0,
    lateralPostH:
      extractNumber(raw, ["lateralPostH", "lateral_post_h"]) ?? 0,
  };
}

/**
 * Coerce a stored hardnessMap into the typed zone shape, falling back to
 * the default Varioshore zones for any missing keys.
 */
function coerceHardnessMap(
  raw: Record<string, unknown>
): Record<HardnessZone, VarioshoreTpuZone> {
  const result = {} as Record<HardnessZone, VarioshoreTpuZone>;
  (Object.keys(VARIOSHORE_ZONES) as HardnessZone[]).forEach((zone) => {
    const entry = raw[zone] as Partial<VarioshoreTpuZone> | undefined;
    const fallback = VARIOSHORE_ZONES[zone];
    result[zone] = {
      tempC:
        typeof entry?.tempC === "number" ? entry.tempC : fallback.tempC,
      shoreA:
        typeof entry?.shoreA === "number" ? entry.shoreA : fallback.shoreA,
      flowPct:
        typeof entry?.flowPct === "number"
          ? entry.flowPct
          : 100,
      color:
        typeof entry?.color === "string" ? entry.color : fallback.color,
    };
  });
  return result;
}

export function DesignSpecViewer({ design, shoeSize }: DesignSpecViewerProps) {
  const designParams = coerceDesignParams(
    design.designParams,
    shoeSize ?? null
  );
  const hardnessMap = coerceHardnessMap(design.hardnessMap);

  const isSalted = design.lineType === "professional";
  const lineBadgeClass = isSalted
    ? "bg-purple-100 text-purple-700 border-purple-200"
    : "bg-blue-100 text-blue-700 border-blue-200";

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              인솔 설계 ({SIDE_LABELS[design.footSide]})
            </h3>
            <Badge variant="outline" className={lineBadgeClass}>
              {design.lineTypeLabel}
            </Badge>
          </div>
          <Badge variant="secondary" className="text-xs">
            상태: {design.status}
          </Badge>
        </div>

        {/* 3D preview */}
        <InsolePreview3D
          designParams={designParams}
          hardnessMap={hardnessMap}
          showPressureOverlay={false}
        />

        {/* Design parameters */}
        <section>
          <h4 className="mb-2 text-sm font-bold text-slate-800">
            설계 파라미터
          </h4>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-white">
                  <th
                    scope="row"
                    className="w-1/2 bg-slate-50 px-4 py-2.5 text-left text-xs font-medium text-slate-600"
                  >
                    아치 높이
                  </th>
                  <td className="px-4 py-2.5 text-right text-sm font-semibold text-slate-900 tabular-nums">
                    {designParams.archHeight.toFixed(1)} mm
                  </td>
                </tr>
                <tr className="bg-white">
                  <th
                    scope="row"
                    className="w-1/2 bg-slate-50 px-4 py-2.5 text-left text-xs font-medium text-slate-600"
                  >
                    힐컵 깊이
                  </th>
                  <td className="px-4 py-2.5 text-right text-sm font-semibold text-slate-900 tabular-nums">
                    {designParams.heelCupDepth.toFixed(1)} mm
                  </td>
                </tr>
                {shoeSize !== null && shoeSize !== undefined && (
                  <tr className="bg-white">
                    <th
                      scope="row"
                      className="w-1/2 bg-slate-50 px-4 py-2.5 text-left text-xs font-medium text-slate-600"
                    >
                      신발 사이즈
                    </th>
                    <td className="px-4 py-2.5 text-right text-sm font-semibold text-slate-900 tabular-nums">
                      {shoeSize} mm
                    </td>
                  </tr>
                )}
                <tr className="bg-white">
                  <th
                    scope="row"
                    className="w-1/2 bg-slate-50 px-4 py-2.5 text-left text-xs font-medium text-slate-600"
                  >
                    발 방향
                  </th>
                  <td className="px-4 py-2.5 text-right text-sm font-semibold text-slate-900">
                    {SIDE_LABELS[design.footSide]}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* TPU temperature map */}
        <section>
          <h4 className="mb-2 text-sm font-bold text-slate-800">
            TPU 온도 맵 (Varioshore)
          </h4>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="px-3 py-2 text-left">영역</th>
                  <th className="px-3 py-2 text-right">Shore A</th>
                  <th className="px-3 py-2 text-right">온도</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(Object.keys(VARIOSHORE_ZONES) as HardnessZone[]).map(
                  (zone) => {
                    const entry = hardnessMap[zone];
                    return (
                      <tr key={zone} className="bg-white">
                        <td className="px-3 py-2 text-left">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded"
                              style={{ backgroundColor: entry.color }}
                              aria-hidden="true"
                            />
                            <span className="text-slate-800">
                              {ZONE_LABELS[zone]}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-900 tabular-nums">
                          {entry.shoreA}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700 tabular-nums">
                          {entry.tempC}°C
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* STL download */}
        <section>
          {design.stlUrl ? (
            <Button asChild variant="default" className="w-full">
              <a href={design.stlUrl} download target="_blank" rel="noreferrer">
                <Download className="mr-2 h-4 w-4" />
                STL 파일 다운로드
              </a>
            </Button>
          ) : (
            <Button variant="outline" disabled className="w-full">
              <Download className="mr-2 h-4 w-4" />
              STL 미생성
            </Button>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
