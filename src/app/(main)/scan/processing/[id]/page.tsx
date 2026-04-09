'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ProcessingAnimation } from '@/components/scan/processing-animation';
import type { ProcessingStage } from '@/lib/scan/types';

interface ScanStatusResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  processingStage: ProcessingStage;
  qualityScore: number;
  qualityLabel: 'good' | 'fair' | 'poor';
  errorMessage: string | null;
}

async function fetchScanStatus(scanId: string): Promise<ScanStatusResponse> {
  const res = await fetch(`/api/scan/status/${scanId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch scan status');
  }
  return res.json();
}

// Map processing stages to approximate progress percentages
function stageToProgress(stage: ProcessingStage): number {
  const map: Record<ProcessingStage, number> = {
    analyzing_video: 15,
    generating_model: 40,
    calculating_measurements: 65,
    analyzing_gait: 80,
    estimating_pressure: 90,
    complete: 100,
  };
  return map[stage] ?? 0;
}

export default function ScanProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;

  const { data, error } = useQuery({
    queryKey: ['scan-status', scanId],
    queryFn: () => fetchScanStatus(scanId),
    refetchInterval: 5000, // Poll every 5 seconds per UI-SPEC
    enabled: !!scanId,
  });

  // Redirect to results on completion
  if (data?.status === 'completed') {
    router.push(`/scan/results/${scanId}`);
    return null;
  }

  // Error state
  if (data?.status === 'failed' || error) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#DC2626"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p className="max-w-[280px] text-center text-base text-slate-800">
          3D 모델 생성에 실패했습니다. 다시 촬영해 주세요
        </p>
        {data?.errorMessage && (
          <p className="text-sm text-slate-500">{data.errorMessage}</p>
        )}
        <Button
          onClick={() => router.push('/scan/new')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          다시 촬영하기
        </Button>
      </div>
    );
  }

  // Processing state
  const stage = data?.processingStage ?? 'analyzing_video';
  const progress = data ? stageToProgress(data.processingStage) : 0;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center">
      <ProcessingAnimation stage={stage} progress={progress} />
    </div>
  );
}
