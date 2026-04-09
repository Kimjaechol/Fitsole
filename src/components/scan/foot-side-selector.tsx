'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FootSide } from '@/lib/scan/types';

interface FootSideSelectorProps {
  scannedFoot: FootSide | null;
  onSelectFoot: (side: FootSide) => void;
}

function FootIcon({ side, scanned }: { side: FootSide; scanned: boolean }) {
  // Mirror the foot icon for right foot
  const isRight = side === 'right';

  return (
    <div className="relative">
      <svg
        width="64"
        height="80"
        viewBox="0 0 64 80"
        className={cn(isRight && 'scale-x-[-1]')}
      >
        {/* Simplified foot outline */}
        <path
          d="M20 75 C10 70, 8 55, 10 40 C12 25, 15 15, 22 8 C28 2, 38 2, 44 8 C50 14, 52 25, 54 40 C56 55, 54 70, 44 75 Z"
          fill={scanned ? 'rgb(37, 99, 235)' : 'none'}
          stroke={scanned ? 'rgb(37, 99, 235)' : 'rgb(148, 163, 184)'}
          strokeWidth={2}
        />
        {/* Toe bumps */}
        <circle cx="22" cy="8" r="4" fill={scanned ? 'rgb(37, 99, 235)' : 'none'} stroke={scanned ? 'rgb(37, 99, 235)' : 'rgb(148, 163, 184)'} strokeWidth={1.5} />
        <circle cx="30" cy="4" r="4" fill={scanned ? 'rgb(37, 99, 235)' : 'none'} stroke={scanned ? 'rgb(37, 99, 235)' : 'rgb(148, 163, 184)'} strokeWidth={1.5} />
        <circle cx="38" cy="4" r="4" fill={scanned ? 'rgb(37, 99, 235)' : 'none'} stroke={scanned ? 'rgb(37, 99, 235)' : 'rgb(148, 163, 184)'} strokeWidth={1.5} />
        <circle cx="44" cy="8" r="3.5" fill={scanned ? 'rgb(37, 99, 235)' : 'none'} stroke={scanned ? 'rgb(37, 99, 235)' : 'rgb(148, 163, 184)'} strokeWidth={1.5} />
      </svg>
      {scanned && (
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600">
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

export function FootSideSelector({
  scannedFoot,
  onSelectFoot,
}: FootSideSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-8">
      {/* Left foot */}
      <button
        onClick={() => onSelectFoot('left')}
        disabled={scannedFoot === 'left'}
        className={cn(
          'flex flex-col items-center gap-2 rounded-xl p-4 transition-colors',
          scannedFoot === 'left'
            ? 'cursor-default'
            : 'hover:bg-slate-50 active:bg-slate-100'
        )}
      >
        <FootIcon side="left" scanned={scannedFoot === 'left'} />
        <span
          className={cn(
            'text-sm font-medium',
            scannedFoot === 'left' ? 'text-blue-600' : 'text-slate-500'
          )}
        >
          왼발
        </span>
      </button>

      {/* Right foot */}
      <button
        onClick={() => onSelectFoot('right')}
        disabled={scannedFoot === 'right'}
        className={cn(
          'flex flex-col items-center gap-2 rounded-xl p-4 transition-colors',
          scannedFoot === 'right'
            ? 'cursor-default'
            : 'hover:bg-slate-50 active:bg-slate-100'
        )}
      >
        <FootIcon side="right" scanned={scannedFoot === 'right'} />
        <span
          className={cn(
            'text-sm font-medium',
            scannedFoot === 'right' ? 'text-blue-600' : 'text-slate-500'
          )}
        >
          오른발
        </span>
      </button>
    </div>
  );
}
