import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface MeasurementCardProps {
  label: string;
  value: number;
  unit?: string;
  confidence?: 'high' | 'medium' | 'low';
}

const CONFIDENCE_CONFIG = {
  high: { text: '높음', variant: 'default' as const, className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
  medium: { text: '보통', variant: 'default' as const, className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  low: { text: '낮음', variant: 'default' as const, className: 'bg-red-100 text-red-700 hover:bg-red-100' },
} as const;

export function MeasurementCard({
  label,
  value,
  unit = 'mm',
  confidence,
}: MeasurementCardProps) {
  return (
    <div className="flex h-12 items-center justify-between rounded-lg bg-slate-50 px-4">
      <span className="text-sm text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold">{value.toFixed(1)}</span>
        <span className="text-sm text-slate-500">{unit}</span>
        {confidence && (
          <Badge
            variant={CONFIDENCE_CONFIG[confidence].variant}
            className={cn('text-xs', CONFIDENCE_CONFIG[confidence].className)}
          >
            {CONFIDENCE_CONFIG[confidence].text}
          </Badge>
        )}
      </div>
    </div>
  );
}
