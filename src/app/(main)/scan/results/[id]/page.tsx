'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

import { FootModel3D } from '@/components/scan/foot-model-3d';
import { MeasurementCard } from '@/components/scan/measurement-card';
import { MeasurementOverlay } from '@/components/scan/measurement-overlay';
import { PressureHeatmap } from '@/components/scan/pressure-heatmap';
import { HeatmapLegend } from '@/components/scan/heatmap-legend';
import { QualityBadge } from '@/components/scan/quality-badge';

import type { ScanResult } from '@/lib/scan/types';

/** Korean translations for gait patterns */
const GAIT_PATTERN_LABELS: Record<string, string> = {
  normal: '정상',
  overpronation: '과내전',
  supination: '과외전',
};

/** Korean translations for ankle alignment */
const ANKLE_ALIGNMENT_LABELS: Record<string, string> = {
  neutral: '중립',
  pronation: '내전',
  supination: '외전',
};

/** Arch flexibility descriptive text */
function getFlexibilityDescription(index: number): string {
  if (index < 0.3) return '단단한 아치';
  if (index < 0.7) return '보통 유연성';
  return '유연한 아치';
}

/** Check if two feet have significant measurement asymmetry */
function hasAsymmetry(
  left: ScanResult | null,
  right: ScanResult | null
): boolean {
  if (!left?.measurements || !right?.measurements) return false;
  const lm = left.measurements;
  const rm = right.measurements;
  const threshold = 3; // 3mm difference threshold
  return (
    Math.abs(lm.footLength - rm.footLength) > threshold ||
    Math.abs(lm.ballWidth - rm.ballWidth) > threshold ||
    Math.abs(lm.archHeight - rm.archHeight) > threshold
  );
}

export default function ScanResultsPage() {
  const params = useParams<{ id: string }>();

  const [leftResult, setLeftResult] = useState<ScanResult | null>(null);
  const [rightResult, setRightResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [activeFoot, setActiveFoot] = useState<'left' | 'right'>('left');

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch(`/api/scan/results/${params.id}`);
        if (!res.ok) throw new Error('Failed to fetch results');
        const data = await res.json();

        // API may return a session with left/right or a single result
        if (data.leftFoot) setLeftResult(data.leftFoot);
        if (data.rightFoot) setRightResult(data.rightFoot);

        // If single result, determine foot side
        if (!data.leftFoot && !data.rightFoot && data.footSide) {
          if (data.footSide === 'left') setLeftResult(data);
          else setRightResult(data);
        }
      } catch {
        setError('결과를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [params.id]);

  const currentResult = activeFoot === 'left' ? leftResult : rightResult;
  const hasBothFeet = !!leftResult && !!rightResult;
  const asymmetryDetected = hasAsymmetry(leftResult, rightResult);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] p-4">
        <Skeleton className="mb-4 h-8 w-40" />
        <Skeleton className="mb-4 h-[360px] w-full rounded-lg md:h-[480px]" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !currentResult) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-slate-500">
          {error ?? '측정 결과를 찾을 수 없습니다.'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-[1280px] animate-in fade-in duration-300 ease-out"
      style={{ paddingBottom: 80 }}
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-[32px] font-bold leading-tight">측정 결과</h1>
          {hasBothFeet && (
            <Tabs
              value={activeFoot}
              onValueChange={(v) => setActiveFoot(v as 'left' | 'right')}
            >
              <TabsList>
                <TabsTrigger value="left">왼발</TabsTrigger>
                <TabsTrigger value="right">오른발</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        {!hasBothFeet && (
          <p className="mt-1 text-sm text-slate-500">
            {activeFoot === 'left' ? '왼발' : '오른발'}
          </p>
        )}
      </div>

      {/* Asymmetry notice */}
      {asymmetryDetected && (
        <div className="px-4 pt-2">
          <Alert className="border-amber-300 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">비대칭 감지</AlertTitle>
            <AlertDescription className="text-amber-700">
              좌우 비대칭이 감지되었습니다
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main content: responsive layout */}
      <div className="flex flex-col gap-6 px-4 pt-4 md:flex-row">
        {/* 3D Model Section (60% on desktop) */}
        <div className="w-full md:w-[60%]">
          <FootModel3D
            modelUrl={currentResult.modelUrl ?? '/models/foot-default.glb'}
            showHeatmap={showHeatmap}
            heatmapData={currentResult.pressureData?.heatmapData}
          >
            {currentResult.measurements && (
              <MeasurementOverlay measurements={currentResult.measurements} />
            )}
            {showHeatmap && currentResult.pressureData && (
              <PressureHeatmap
                data={currentResult.pressureData.heatmapData}
                highPressureZones={
                  currentResult.pressureData.highPressureZones
                }
              />
            )}
          </FootModel3D>

          <div className="mt-3 flex items-center gap-3">
            <Toggle
              variant="outline"
              pressed={showHeatmap}
              onPressedChange={setShowHeatmap}
              aria-label="압력 분포 보기"
            >
              압력 분포 보기
            </Toggle>
            {showHeatmap && <HeatmapLegend />}
          </div>

          {/* Quality badge */}
          <div className="mt-3">
            <QualityBadge
              score={currentResult.qualityScore}
              label={currentResult.qualityLabel}
            />
          </div>
        </div>

        {/* Measurements + Gait Section (40% on desktop) */}
        <div className="w-full md:w-[40%]">
          {/* Measurement cards grid */}
          {currentResult.measurements && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <MeasurementCard
                label="발 길이"
                value={currentResult.measurements.footLength}
              />
              <MeasurementCard
                label="볼 넓이"
                value={currentResult.measurements.ballWidth}
              />
              <MeasurementCard
                label="아치 높이"
                value={currentResult.measurements.archHeight}
              />
              <MeasurementCard
                label="발등 높이"
                value={currentResult.measurements.instepHeight}
              />
              <MeasurementCard
                label="뒤꿈치 넓이"
                value={currentResult.measurements.heelWidth}
              />
              <MeasurementCard
                label="발가락 길이"
                value={currentResult.measurements.toeLength}
              />
            </div>
          )}

          {/* Gait Analysis Section */}
          {currentResult.gaitAnalysis && (
            <div className="mt-6">
              <h2 className="mb-3 text-xl font-bold">보행 분석</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-500">보행 패턴</span>
                  <span className="font-medium">
                    {GAIT_PATTERN_LABELS[
                      currentResult.gaitAnalysis.gaitPattern
                    ] ?? currentResult.gaitAnalysis.gaitPattern}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-500">발목 정렬</span>
                  <span className="font-medium">
                    {ANKLE_ALIGNMENT_LABELS[
                      currentResult.gaitAnalysis.ankleAlignment
                    ] ?? currentResult.gaitAnalysis.ankleAlignment}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-500">아치 유연성</span>
                  <span className="font-medium">
                    {getFlexibilityDescription(
                      currentResult.gaitAnalysis.archFlexibilityIndex
                    )}{' '}
                    ({(currentResult.gaitAnalysis.archFlexibilityIndex * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-16 left-0 right-0 z-20 border-t bg-white px-4 py-3 md:static md:mt-8 md:border-t-0 md:px-4 md:py-0">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2">
          <Button asChild className="w-full" size="lg">
            <Link href="/catalog">
              이 데이터로 맞춤 신발을 추천받으시겠습니까?
            </Link>
          </Button>
          <Button variant="outline" className="w-full" size="lg">
            결과 저장하기
          </Button>
        </div>
      </div>
    </div>
  );
}
