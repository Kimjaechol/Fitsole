'use client';

import Link from 'next/link';
import { QualityBadge } from '@/components/scan/quality-badge';
import type { ScanResult } from '@/lib/scan/types';

interface ScanHistoryProps {
  scans: ScanResult[];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function footSideLabel(side: string): string {
  return side === 'left' ? '왼발' : '오른발';
}

export function ScanHistory({ scans }: ScanHistoryProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-slate-800">이전 측정 기록</h2>

      <div className="flex flex-col gap-3">
        {scans.map((scan) => (
          <Link
            key={scan.id}
            href={`/scan/results/${scan.id}`}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition-colors hover:bg-slate-50"
          >
            <div className="flex flex-col gap-1">
              <span className="text-base font-medium text-slate-800">
                {footSideLabel(scan.footSide)}
              </span>
              <span className="text-sm text-slate-500">
                {formatDate(scan.createdAt)}
              </span>
            </div>
            <QualityBadge score={scan.qualityScore} label={scan.qualityLabel} />
          </Link>
        ))}
      </div>
    </div>
  );
}
