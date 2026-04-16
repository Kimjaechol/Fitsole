'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import type { SaltedPressureFrame, BiomechanicalAnalysis, VerificationReport } from '@/lib/salted/types';
import type { DesignParams, HardnessZone, VarioshoreTpuZone } from '@/lib/insole/types';
import { VARIOSHORE_ZONES } from '@/lib/insole/types';
import { SaltedSessionUi } from '@/components/insole/salted-session-ui';
import { InsolePreview3D } from '@/components/insole/insole-preview-3d';
import { BeforeAfterReport } from '@/components/insole/before-after-report';
import { Button } from '@/components/ui/button';

/** Build default hardness map from VARIOSHORE_ZONES constant. */
function buildDefaultHardnessMap(): Record<HardnessZone, VarioshoreTpuZone> {
  const map = {} as Record<HardnessZone, VarioshoreTpuZone>;
  for (const [key, zone] of Object.entries(VARIOSHORE_ZONES)) {
    map[key as HardnessZone] = {
      tempC: zone.tempC,
      shoreA: zone.shoreA,
      flowPct: 100,
      color: zone.color,
    };
  }
  return map;
}

export default function SaltedMeasurementPage() {
  const { status } = useSession();
  const [designResult, setDesignResult] = useState<{
    designParams: DesignParams;
    hardnessMap: Record<HardnessZone, VarioshoreTpuZone>;
  } | null>(null);
  const [showPressureOverlay, setShowPressureOverlay] = useState(false);
  // TODO: wire up setter when verification flow lands; setter intentionally unused for now.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [verificationReport, setVerificationReport] = useState<VerificationReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Protected route
  if (status === 'unauthenticated') {
    redirect('/auth/login');
  }

  const handleSessionComplete = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- analysis not yet consumed server-side; keep in signature for future use.
    async (frames: SaltedPressureFrame[], _analysis: BiomechanicalAnalysis | null) => {
      setIsProcessing(true);
      setError(null);

      try {
        // Store session
        const sessionRes = await fetch('/api/salted/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_type: 'initial',
            frames: frames.map((f) => ({
              timestamp: f.timestamp,
              pressure_array: f.pressureArray,
              imu_data: f.imuData
                ? {
                    accel_x: f.imuData.accelX,
                    accel_y: f.imuData.accelY,
                    accel_z: f.imuData.accelZ,
                    gyro_x: f.imuData.gyroX,
                    gyro_y: f.imuData.gyroY,
                    gyro_z: f.imuData.gyroZ,
                  }
                : null,
            })),
            duration_seconds: frames.length > 0
              ? frames[frames.length - 1].timestamp / 1000
              : 0,
          }),
        });

        if (!sessionRes.ok) {
          throw new Error('세션 저장 실패');
        }

        // Request precision insole design
        const designRes = await fetch('/api/insole/design', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            line_type: 'professional',
            salted_data: true,
          }),
        });

        if (designRes.ok) {
          const designData = await designRes.json();
          if (designData.design_params) {
            setDesignResult({
              designParams: {
                archHeight: designData.design_params.arch_height ?? 42,
                heelCupDepth: designData.design_params.heel_cup_depth ?? 22,
                evaCushionThickness: designData.design_params.eva_cushion_thickness ?? 10,
                footLength: designData.design_params.foot_length ?? 260,
                footWidth: designData.design_params.foot_width ?? 98,
                heelWidth: designData.design_params.heel_width ?? 65,
                forefootFlex: designData.design_params.forefoot_flex ?? 0.4,
                medialPostH: designData.design_params.medial_post_h ?? 0,
                lateralPostH: designData.design_params.lateral_post_h ?? 0,
              },
              hardnessMap: buildDefaultHardnessMap(),
            });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '처리 중 오류가 발생했습니다');
        // Fallback: show default design preview
        setDesignResult({
          designParams: {
            archHeight: 42,
            heelCupDepth: 22,
            evaCushionThickness: 10,
            footLength: 260,
            footWidth: 98,
            heelWidth: 65,
            forefootFlex: 0.4,
            medialPostH: 0,
            lateralPostH: 0,
          },
          hardnessMap: buildDefaultHardnessMap(),
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  if (status === 'loading') {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          SALTED 스마트 인솔 측정
        </h1>
        <p className="text-muted-foreground">
          전문가용 정밀 측정 &mdash; 실제 보행 압력 데이터 기반 인솔 설계
        </p>
      </div>

      {/* Session UI */}
      <SaltedSessionUi onSessionComplete={handleSessionComplete} />

      {/* Processing indicator */}
      {isProcessing && (
        <div className="text-center py-8">
          <p className="text-muted-foreground animate-pulse">
            데이터 분석 중...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-amber-600 text-center">{error}</p>
      )}

      {/* Design preview */}
      {designResult && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">정밀 인솔 설계 결과</h2>
          <InsolePreview3D
            designParams={designResult.designParams}
            hardnessMap={designResult.hardnessMap}
            showPressureOverlay={showPressureOverlay}
            onToggleOverlay={() => setShowPressureOverlay((v) => !v)}
          />
        </div>
      )}

      {/* Verification report */}
      {verificationReport && (
        <BeforeAfterReport report={verificationReport} />
      )}

      {/* Navigation */}
      <div className="flex justify-center pt-4">
        <Link href="/insole/design">
          <Button variant="outline">인솔 디자인으로 돌아가기</Button>
        </Link>
      </div>
    </div>
  );
}
