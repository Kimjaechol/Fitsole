'use client';

import { useState } from 'react';
import { Footprints, Video, PersonStanding, ArrowRight, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useScanStore } from '@/lib/scan/store';

interface ScanOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface OnboardingStep {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  subtitle?: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: Footprints,
    text: 'A4 용지 위에 맨발을 올립니다',
    subtitle: '평평한 바닥에서 밝은 조명이 있는 곳으로 준비해 주세요',
  },
  {
    icon: Video,
    text: '발 주위를 15-20초 돌며 촬영합니다',
    subtitle: '3D 발 모델을 생성해 길이, 볼넓이, 아치 높이를 측정합니다',
  },
  {
    icon: ArrowRight,
    text: '옆에서 걷는 모습을 촬영합니다',
    subtitle: '카메라를 무릎 높이(50cm) 가로 모드로 두고, 3m 옆을 지나가며 10걸음 걸어주세요',
  },
  {
    icon: ArrowUp,
    text: '뒤에서 걷는 모습을 촬영합니다',
    subtitle: '카메라를 엉덩이 높이(80cm) 세로 모드로 두고, 카메라에서 멀어지며 10걸음 걸어주세요',
  },
  {
    icon: PersonStanding,
    text: '두 방향 모두 촬영해야 정확한 분석이 가능합니다',
    subtitle: '옆에서는 보폭과 아치 변화, 뒤에서는 회내/회외 기울기를 각각 측정합니다',
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
        <div className="flex flex-col items-center gap-2">
          <p className="max-w-[320px] text-center text-lg font-medium text-slate-800">
            {step.text}
          </p>
          {step.subtitle && (
            <p className="max-w-[320px] text-center text-sm leading-relaxed text-slate-500">
              {step.subtitle}
            </p>
          )}
        </div>
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
