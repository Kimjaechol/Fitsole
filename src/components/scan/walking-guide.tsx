'use client';

import { MoveDown } from 'lucide-react';

interface WalkingGuideProps {
  stepCount: number;
  totalSteps?: number;
}

export function WalkingGuide({ stepCount, totalSteps = 10 }: WalkingGuideProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Illustration area: phone on floor with walking direction */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
          <MoveDown className="h-12 w-12 text-blue-600" />
        </div>
        <p className="max-w-[280px] text-center text-base text-slate-800">
          휴대폰을 바닥에 놓고 5-10걸음 걸어주세요
        </p>
      </div>

      {/* Step counter */}
      <div className="rounded-lg bg-black/60 px-4 py-2">
        <span className="text-base text-white">
          {stepCount}/{totalSteps} 걸음
        </span>
      </div>
    </div>
  );
}
