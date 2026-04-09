export function HeatmapLegend() {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-slate-500">높음</span>
      <div
        className="rounded"
        style={{
          width: 32,
          height: 120,
          background:
            'linear-gradient(to bottom, #EF4444, #F97316, #EAB308, #22C55E, #06B6D4, #3B82F6)',
        }}
        aria-label="압력 분포 범례: 빨간색(높음)에서 파란색(낮음)"
      />
      <span className="text-xs text-slate-500">낮음</span>
    </div>
  );
}
