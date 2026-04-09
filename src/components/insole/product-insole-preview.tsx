'use client';

import { useState } from 'react';
import Link from 'next/link';
import { InsolePreview3D } from '@/components/insole/insole-preview-3d';
import type { DesignParams, HardnessZone, VarioshoreTpuZone } from '@/lib/insole/types';

interface ProductInsolePreviewProps {
  designParams: DesignParams;
  hardnessMap: Record<HardnessZone, VarioshoreTpuZone>;
}

export function ProductInsolePreview({
  designParams,
  hardnessMap,
}: ProductInsolePreviewProps) {
  const [showPressureOverlay, setShowPressureOverlay] = useState(false);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div>
        <h3 className="text-sm font-medium">맞춤 인솔 미리보기</h3>
        <p className="text-xs text-muted-foreground">
          발 측정 데이터 기반 맞춤 인솔 설계
        </p>
      </div>

      <div className="h-[240px] [&>div:first-child]:!h-[240px]">
        <InsolePreview3D
          designParams={designParams}
          hardnessMap={hardnessMap}
          showPressureOverlay={showPressureOverlay}
          onToggleOverlay={() => setShowPressureOverlay((prev) => !prev)}
        />
      </div>

      <Link
        href="/insole/design"
        className="inline-block text-xs text-primary hover:underline"
      >
        상세 디자인 보기 &rarr;
      </Link>
    </div>
  );
}
