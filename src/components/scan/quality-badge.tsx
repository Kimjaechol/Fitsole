import { cn } from '@/lib/utils';

interface QualityBadgeProps {
  score: number;
  label: 'good' | 'fair' | 'poor';
}

const LABEL_CONFIG = {
  good: { text: '우수', className: 'bg-emerald-600 text-white' },
  fair: { text: '보통', className: 'bg-amber-600 text-white' },
  poor: { text: '부족', className: 'bg-red-600 text-white' },
} as const;

export function QualityBadge({ score, label }: QualityBadgeProps) {
  const config = LABEL_CONFIG[label];

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={`측정 품질: ${config.text} (${score}점)`}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium',
        config.className
      )}
    >
      {config.text}
      <span className="text-xs opacity-80">{score}</span>
    </span>
  );
}
