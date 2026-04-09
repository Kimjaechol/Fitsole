'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScanStepperProps {
  currentStep: number; // 1-4
  completedSteps: number[];
}

const STEPS = [
  { label: '발 위치' },
  { label: '영상 촬영' },
  { label: '보행 촬영' },
  { label: '결과' },
];

export function ScanStepper({ currentStep, completedSteps }: ScanStepperProps) {
  return (
    <div
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={4}
      aria-label="스캔 진행 상태"
      className="flex items-start justify-center gap-6"
    >
      {STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = completedSteps.includes(stepNumber);

        return (
          <div key={stepNumber} className="flex flex-col items-center gap-1">
            {/* Dot */}
            <div
              className={cn(
                'flex items-center justify-center rounded-full transition-all duration-200 ease-out',
                isActive && 'h-4 w-4 scale-110 bg-blue-600',
                isCompleted && 'h-3 w-3 bg-emerald-600',
                !isActive && !isCompleted && 'h-3 w-3 bg-slate-200'
              )}
            >
              {isCompleted && (
                <Check className="h-2 w-2 text-white" strokeWidth={3} />
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                'text-sm leading-snug',
                isActive ? 'text-blue-600 font-medium' : 'text-slate-500'
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
