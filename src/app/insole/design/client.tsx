'use client';

import { useInsoleDesignStore } from '@/lib/insole/store';
import { InsolePreview3D } from '@/components/insole/insole-preview-3d';
import { DesignSummary } from '@/components/insole/design-summary';
import { HardnessLegend } from '@/components/insole/hardness-legend';
import type { DesignParams, HardnessZone, VarioshoreTpuZone } from '@/lib/insole/types';

interface InsoleDesignClientProps {
  designParams: DesignParams;
  hardnessMap: Record<HardnessZone, VarioshoreTpuZone>;
  lineType: 'general' | 'professional';
  stlUrl?: string | null;
  slicerProfileUrl?: string | null;
}

export function InsoleDesignClient({
  designParams,
  hardnessMap,
  lineType,
  stlUrl,
  slicerProfileUrl,
}: InsoleDesignClientProps) {
  const showPressureOverlay = useInsoleDesignStore(
    (s) => s.showPressureOverlay,
  );
  const togglePressureOverlay = useInsoleDesignStore(
    (s) => s.togglePressureOverlay,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">맞춤 인솔 디자인</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* 3D Preview */}
        <div className="w-full lg:w-1/2">
          <InsolePreview3D
            designParams={designParams}
            hardnessMap={hardnessMap}
            showPressureOverlay={showPressureOverlay}
            onToggleOverlay={togglePressureOverlay}
          />
        </div>

        {/* Design details */}
        <div className="w-full space-y-4 lg:w-1/2">
          <DesignSummary
            designParams={designParams}
            lineType={lineType}
            stlUrl={stlUrl}
            slicerProfileUrl={slicerProfileUrl}
          />
          <HardnessLegend />
        </div>
      </div>
    </div>
  );
}
