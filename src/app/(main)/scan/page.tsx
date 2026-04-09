'use client';

import { useRouter } from 'next/navigation';
import { Footprints } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScanStore } from '@/lib/scan/store';
import { ScanOnboarding } from '@/components/scan/scan-onboarding';
import { EmptyState } from '@/components/empty-state';

export default function ScanPage() {
  const router = useRouter();
  const isOnboarded = useScanStore((state) => state.isOnboarded);

  const handleOnboardingComplete = () => {
    router.push('/scan/new');
  };

  const handleOnboardingSkip = () => {
    // Stay on scan home after skipping
  };

  if (!isOnboarded) {
    return (
      <ScanOnboarding
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">발 측정</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/scan/new')}
        >
          새로 측정하기
        </Button>
      </div>

      {/* Empty state for first-time onboarded users with no scans */}
      <EmptyState
        icon={Footprints}
        title="아직 발 측정을 하지 않았어요"
        body="스마트폰 카메라로 간편하게 발을 측정해 보세요"
        ctaText="발 측정 시작하기"
        ctaHref="/scan/new"
      />
    </div>
  );
}
