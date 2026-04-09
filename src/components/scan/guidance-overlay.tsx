'use client';

import { cn } from '@/lib/utils';

interface GuidanceOverlayProps {
  message: string;
  type: 'info' | 'warning' | 'error';
}

export function GuidanceOverlay({ message, type }: GuidanceOverlayProps) {
  return (
    <div className="absolute left-0 right-0 top-16 z-10 flex justify-center px-4">
      <div className="rounded-lg bg-black/60 px-4 py-2">
        <p
          className={cn(
            'text-center text-sm font-medium',
            type === 'info' && 'text-white',
            type === 'warning' && 'text-amber-600',
            type === 'error' && 'text-red-600'
          )}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
