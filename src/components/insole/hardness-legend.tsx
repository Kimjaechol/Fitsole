import { VARIOSHORE_ZONES } from '@/lib/insole/types';

const ZONE_LABELS: Record<string, string> = {
  archCore: '아치 코어',
  heelCupWall: '힐컵 벽',
  heelCupFloor: '힐컵 바닥',
  forefoot: '전족부',
  toeArea: '발가락 영역',
};

export function HardnessLegend() {
  const zones = Object.entries(VARIOSHORE_ZONES) as [
    keyof typeof VARIOSHORE_ZONES,
    (typeof VARIOSHORE_ZONES)[keyof typeof VARIOSHORE_ZONES],
  ][];

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">경도 범례</h3>
      <div className="flex flex-col gap-2 lg:flex-row lg:gap-4">
        {zones.map(([key, zone]) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className="h-4 w-4 shrink-0 rounded"
              style={{ backgroundColor: zone.color }}
              aria-hidden="true"
            />
            <div className="text-xs">
              <p className="font-medium">{ZONE_LABELS[key]}</p>
              <p className="text-muted-foreground">
                Shore A {zone.shoreA} / {zone.tempC}&deg;C
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
