'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { ProcessingStage } from '@/lib/scan/types';

interface ProcessingAnimationProps {
  stage: ProcessingStage;
  progress: number; // 0-100
}

const STAGES: { key: ProcessingStage; label: string }[] = [
  { key: 'analyzing_video', label: '영상 분석 중...' },
  { key: 'generating_model', label: '3D 모델 생성 중...' },
  { key: 'calculating_measurements', label: '측정값 계산 중...' },
  { key: 'analyzing_gait', label: '보행 분석 중...' },
];

function getStageIndex(stage: ProcessingStage): number {
  const idx = STAGES.findIndex((s) => s.key === stage);
  return idx === -1 ? STAGES.length : idx;
}

export function ProcessingAnimation({ stage, progress }: ProcessingAnimationProps) {
  const currentIdx = getStageIndex(stage);

  return (
    <div className="flex flex-col items-center gap-8 px-6 py-12">
      {/* Animated foot outline SVG */}
      <div className="relative flex h-40 w-40 items-center justify-center">
        <svg
          width="120"
          height="160"
          viewBox="0 0 120 160"
          className="animate-pulse"
        >
          <path
            d="M40 150 C20 140, 16 110, 20 80 C24 50, 30 30, 44 16 C56 4, 76 4, 88 16 C100 28, 104 50, 108 80 C112 110, 108 140, 88 150 Z"
            fill="none"
            stroke="#2563EB"
            strokeWidth={3}
            strokeDasharray="400"
            strokeDashoffset={400 - (progress / 100) * 400}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
          {/* Toe bumps */}
          <circle cx="44" cy="16" r="7" fill="none" stroke="#2563EB" strokeWidth={2} opacity={progress > 10 ? 1 : 0.3} className="transition-opacity duration-300" />
          <circle cx="60" cy="8" r="7" fill="none" stroke="#2563EB" strokeWidth={2} opacity={progress > 20 ? 1 : 0.3} className="transition-opacity duration-300" />
          <circle cx="76" cy="8" r="7" fill="none" stroke="#2563EB" strokeWidth={2} opacity={progress > 30 ? 1 : 0.3} className="transition-opacity duration-300" />
          <circle cx="88" cy="16" r="6" fill="none" stroke="#2563EB" strokeWidth={2} opacity={progress > 40 ? 1 : 0.3} className="transition-opacity duration-300" />
        </svg>
      </div>

      {/* Stage list */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {STAGES.map((s, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <div
              key={s.key}
              className="flex items-center gap-3"
            >
              {/* Status icon */}
              <div
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                  isCompleted && 'bg-emerald-600',
                  isCurrent && 'bg-blue-600',
                  !isCompleted && !isCurrent && 'bg-slate-200'
                )}
              >
                {isCompleted && (
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                )}
                {isCurrent && (
                  <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                )}
              </div>

              {/* Label */}
              <span
                aria-live="polite"
                className={cn(
                  'text-base',
                  isCurrent && 'font-medium text-blue-600',
                  isCompleted && 'text-emerald-600',
                  !isCompleted && !isCurrent && 'text-slate-400'
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <Progress value={progress} className="h-2" />
        <p className="mt-2 text-center text-base text-slate-800">
          {progress}%
        </p>
      </div>

      {/* Duration hint */}
      <p className="text-sm text-slate-500">
        약 3-5분 소요됩니다
      </p>
    </div>
  );
}
