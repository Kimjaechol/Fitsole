"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScanLine, ChevronRight, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

interface ScanHistoryItem {
  id: string;
  footSide: "left" | "right";
  status: string;
  qualityScore: number | null;
  qualityLabel: string | null;
  createdAt: string;
  completedAt: string | null;
  measurements: {
    footLength: number;
    ballWidth: number;
  } | null;
}

const qualityBadge: Record<string, { label: string; className: string }> = {
  good: { label: "우수", className: "bg-green-100 text-green-800" },
  fair: { label: "보통", className: "bg-yellow-100 text-yellow-800" },
  poor: { label: "부족", className: "bg-red-100 text-red-800" },
};

const footSideLabel: Record<string, string> = {
  left: "왼발",
  right: "오른발",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function FootProfileTab() {
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScans() {
      try {
        const res = await fetch("/api/scan/history");
        if (res.ok) {
          const data = await res.json();
          setScans(data.scans ?? []);
        }
      } catch {
        // silently fail - show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchScans();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <EmptyState
        icon={ScanLine}
        title="아직 발 측정을 하지 않았어요"
        body="스마트폰 카메라로 간편하게 발을 측정해 보세요"
        ctaText="발 측정 시작하기"
        ctaHref="/scan"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">측정 기록</h3>
        <Link
          href="/scan"
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          새로 측정하기
        </Link>
      </div>

      <div className="space-y-3">
        {scans.map((scan) => {
          const badge = scan.qualityLabel
            ? qualityBadge[scan.qualityLabel]
            : null;

          return (
            <Link
              key={scan.id}
              href={`/scan/results/${scan.id}`}
              className="flex items-center justify-between rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {footSideLabel[scan.footSide] ?? scan.footSide}
                  </span>
                  {badge && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(scan.createdAt)}
                </p>
                {scan.measurements && (
                  <p className="text-sm text-muted-foreground">
                    발 길이 {scan.measurements.footLength.toFixed(1)}mm
                    {" / "}볼 넓이 {scan.measurements.ballWidth.toFixed(1)}mm
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
