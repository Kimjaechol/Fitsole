'use client';

import { ArrowRight, ArrowUp, Camera, Info } from 'lucide-react';
import type { GaitViewType } from '@/lib/scan/types';

interface WalkingGuideProps {
  viewType: GaitViewType;
  stepCount?: number;
  totalSteps?: number;
}

/**
 * Walking video capture instruction guide.
 *
 * Renders biomechanically-correct camera placement diagrams per view type:
 * - 'side' (sagittal plane) — camera at knee height (50cm), landscape,
 *   user walks past camera parallel to lens at 3m distance.
 *   Measures: stride length, ankle dorsiflexion, arch flex, gait cycle.
 * - 'rear' (frontal plane) — camera at hip height (80cm), portrait,
 *   user walks away from camera at 3m starting distance.
 *   Measures: pronation/supination, Q-angle, bilateral symmetry.
 */
export function WalkingGuide({
  viewType,
  stepCount = 0,
  totalSteps = 10,
}: WalkingGuideProps) {
  if (viewType === 'side') {
    return <SideViewGuide stepCount={stepCount} totalSteps={totalSteps} />;
  }
  return <RearViewGuide stepCount={stepCount} totalSteps={totalSteps} />;
}

// ──────────────────────────────────────────────
// Side View (Sagittal plane)
// ──────────────────────────────────────────────

function SideViewGuide({
  stepCount,
  totalSteps,
}: {
  stepCount: number;
  totalSteps: number;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Title */}
      <div className="flex flex-col items-center gap-2">
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
          1단계 / 2 · 옆모습 촬영
        </span>
        <h3 className="text-xl font-bold text-slate-900">
          보폭과 아치 변화 측정
        </h3>
      </div>

      {/* ASCII-style diagram */}
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-center gap-4">
          {/* User figure */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-3xl">🚶</div>
            <span className="text-sm text-slate-600">옆모습</span>
          </div>

          {/* Arrow showing direction */}
          <div className="flex flex-col items-center">
            <ArrowRight className="h-6 w-6 text-blue-600" />
            <span className="text-sm text-slate-500">진행</span>
          </div>

          {/* Space */}
          <div className="flex flex-col items-center gap-1 opacity-40">
            <div className="h-8 w-px bg-slate-400" />
            <span className="text-sm text-slate-400">3m</span>
            <div className="h-8 w-px bg-slate-400" />
          </div>

          {/* Camera */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-12 w-16 items-center justify-center rounded border-2 border-blue-600 bg-white">
              <Camera className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-blue-700">가로</span>
          </div>
        </div>
      </div>

      {/* Setup checklist */}
      <div className="w-full max-w-sm space-y-2 rounded-lg bg-white p-4 text-sm">
        <h4 className="font-semibold text-slate-900">카메라 설정</h4>
        <ul className="space-y-1.5 text-slate-700">
          <li>• 카메라 방향: <span className="font-medium">가로 모드</span></li>
          <li>• 높이: <span className="font-medium">무릎 높이 (50cm)</span></li>
          <li>• 받침대: 의자, 작은 탁자 또는 책 쌓기</li>
          <li>• 카메라와 보행선 거리: <span className="font-medium">3m 옆</span></li>
          <li>• 수평 유지 (기울기 0°)</li>
        </ul>
      </div>

      {/* User instructions */}
      <div className="w-full max-w-sm space-y-2 rounded-lg bg-blue-50 p-4 text-sm">
        <h4 className="font-semibold text-blue-900">걷는 방법</h4>
        <ul className="space-y-1.5 text-blue-800">
          <li>1. 카메라 옆 3m 지점에 섬</li>
          <li>2. 카메라와 직각 방향으로 5-10걸음 걷기</li>
          <li>3. 카메라를 보지 말고 전방 응시</li>
          <li>4. 평소 속도로 자연스럽게</li>
        </ul>
      </div>

      {/* Step counter */}
      {stepCount > 0 && (
        <div className="rounded-lg bg-black/80 px-4 py-2">
          <span className="text-base font-medium text-white">
            {stepCount}/{totalSteps} 걸음
          </span>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Rear View (Frontal plane)
// ──────────────────────────────────────────────

function RearViewGuide({
  stepCount,
  totalSteps,
}: {
  stepCount: number;
  totalSteps: number;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Title */}
      <div className="flex flex-col items-center gap-2">
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
          2단계 / 2 · 뒷모습 촬영
        </span>
        <h3 className="text-xl font-bold text-slate-900">
          회내/회외 정확도 측정
        </h3>
      </div>

      {/* ASCII-style diagram (vertical layout for rear view) */}
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        {/* User walks away */}
        <div className="flex flex-col items-center gap-1">
          <div className="text-3xl">🚶‍♂️</div>
          <span className="text-sm text-slate-600">뒷모습 (멀어짐)</span>
        </div>

        {/* Arrow up */}
        <div className="flex flex-col items-center">
          <ArrowUp className="h-6 w-6 text-emerald-600" />
          <span className="text-sm text-slate-500">3m 전진</span>
        </div>

        {/* Camera */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-16 w-12 items-center justify-center rounded border-2 border-emerald-600 bg-white">
            <Camera className="h-6 w-6 text-emerald-600" />
          </div>
          <span className="text-sm font-medium text-emerald-700">세로</span>
        </div>
      </div>

      {/* Setup checklist */}
      <div className="w-full max-w-sm space-y-2 rounded-lg bg-white p-4 text-sm">
        <h4 className="font-semibold text-slate-900">카메라 설정</h4>
        <ul className="space-y-1.5 text-slate-700">
          <li>• 카메라 방향: <span className="font-medium">세로 모드</span></li>
          <li>• 높이: <span className="font-medium">엉덩이 높이 (80cm)</span></li>
          <li>• 받침대: 같은 받침대 위에 책 추가로 쌓기</li>
          <li>• 사용자 시작점: <span className="font-medium">카메라 앞 1m</span></li>
          <li>• 수평 유지 (기울기 0°)</li>
        </ul>
      </div>

      {/* User instructions */}
      <div className="w-full max-w-sm space-y-2 rounded-lg bg-emerald-50 p-4 text-sm">
        <h4 className="font-semibold text-emerald-900">걷는 방법</h4>
        <ul className="space-y-1.5 text-emerald-800">
          <li>1. 카메라에 <span className="font-medium">등지고</span> 섬</li>
          <li>2. 카메라에서 <span className="font-medium">멀어지는</span> 방향으로 5-10걸음</li>
          <li>3. 양팔을 자연스럽게 흔들며 걷기</li>
          <li>4. 뒤돌아보지 말고 전방 응시</li>
        </ul>
      </div>

      {/* Why different from side view */}
      <div className="flex w-full max-w-sm items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
        <p>
          발이 안쪽/바깥쪽으로 기우는 정도를 정확히 보기 위해 뒤에서 촬영합니다.
        </p>
      </div>

      {/* Step counter */}
      {stepCount > 0 && (
        <div className="rounded-lg bg-black/80 px-4 py-2">
          <span className="text-base font-medium text-white">
            {stepCount}/{totalSteps} 걸음
          </span>
        </div>
      )}
    </div>
  );
}
