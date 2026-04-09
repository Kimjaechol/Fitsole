'use client';

import { useState } from 'react';
import { Footprints, Video, PersonStanding } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useScanStore } from '@/lib/scan/store';

interface ScanOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS = [
  {
    icon: Footprints,
    text: 'A4 용지 위에 맨발을 올립니다',
  },
  {
    icon: Video,
    text: '발 주위를 15-20초 돌며 촬영합니다',
  },
  {
    icon: PersonStanding,
    text: '5-10걸음 걸어 보행을 분석합니다',
  },
];

export function ScanOnboarding({ onComplete, onSkip }: ScanOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const markOnboarded = useScanStore((state) => state.markOnboarded);

  const isLastStep = currentStep === STEPS.length - 1;

  const handleComplete = () => {
    markOnboarded();
    onComplete();
  };

  const handleSkip = () => {
    markOnboarded();
    onSkip();
  };

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-between px-6 py-8">
      {/* Skip link */}
      <div className="flex w-full justify-end">
        <button
          onClick={handleSkip}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          온보딩 건너뛰기
        </button>
      </div>

      {/* Step content */}
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-slate-50">
          <Icon className="h-20 w-20 text-blue-600" />
        </div>
        <p className="max-w-[300px] text-center text-lg text-slate-800">
          {step.text}
        </p>
      </div>

      {/* Bottom: dots + CTA */}
      <div className="flex flex-col items-center gap-6">
        {/* Dot indicators */}
        <div className="flex gap-2">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-2 w-2 rounded-full transition-colors duration-200',
                index === currentStep ? 'bg-blue-600' : 'bg-slate-200'
              )}
            />
          ))}
        </div>

        {/* CTA */}
        <Button
          onClick={handleNext}
          className="w-full max-w-[280px] bg-blue-600 hover:bg-blue-700"
        >
          {isLastStep ? '시작하기' : '다음'}
        </Button>
      </div>
    </div>
  );
}
