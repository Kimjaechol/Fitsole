'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createSaltedClient, type SaltedAdapter } from '@/lib/salted/ble-client';
import { useSaltedStore } from '@/lib/salted/store';
import type { SaltedPressureFrame, BiomechanicalAnalysis } from '@/lib/salted/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

/** Session target: 5 minutes (300 seconds) */
const TARGET_DURATION_S = 300;

/** Landing pattern labels in Korean */
const LANDING_LABELS: Record<string, string> = {
  heel_strike: '뒤꿈치 착지',
  midfoot_strike: '중족부 착지',
  forefoot_strike: '전족부 착지',
};

interface SaltedSessionUiProps {
  onSessionComplete: (frames: SaltedPressureFrame[], analysis: BiomechanicalAnalysis | null) => void;
}

export function SaltedSessionUi({ onSessionComplete }: SaltedSessionUiProps) {
  const adapterRef = useRef<SaltedAdapter | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [step, setStep] = useState<'connect' | 'session' | 'results'>('connect');

  const {
    connectionState,
    setConnectionState,
    sessionFrames,
    sessionDuration,
    isRecording,
    analysis,
    addFrame,
    startRecording,
    stopRecording,
    setAnalysis,
    error,
    reset,
  } = useSaltedStore();

  // Initialize adapter
  useEffect(() => {
    const adapter = createSaltedClient();
    adapterRef.current = adapter;

    // Detect mock mode
    if (!adapter.isSupported() || adapter.constructor.name === 'MockSaltedProvider') {
      setIsMock(true);
    }

    return () => {
      adapter.disconnect().catch(() => {});
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = useCallback(async () => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    try {
      setConnectionState('connecting');
      await adapter.connect();
      setConnectionState('connected');
      setStep('session');
    } catch {
      setConnectionState('error');
    }
  }, [setConnectionState]);

  const handleStartSession = useCallback(async () => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    startRecording();
    setConnectionState('streaming');

    await adapter.startSession((frame: SaltedPressureFrame) => {
      addFrame(frame);
    });
  }, [addFrame, startRecording, setConnectionState]);

  const handleStopSession = useCallback(async () => {
    const adapter = adapterRef.current;
    if (!adapter) return;

    const frames = await adapter.stopSession();
    stopRecording();
    setConnectionState('connected');
    setStep('results');

    // Call parent callback
    onSessionComplete(frames, analysis);
  }, [stopRecording, setConnectionState, onSessionComplete, analysis]);

  const progressPercent = Math.min(100, (sessionDuration / TARGET_DURATION_S) * 100);
  const minutes = Math.floor(sessionDuration / 60);
  const seconds = Math.floor(sessionDuration % 60);

  return (
    <div className="space-y-6">
      {/* Mock mode indicator */}
      {isMock && (
        <Badge variant="outline" className="text-amber-600 border-amber-300">
          테스트 모드
        </Badge>
      )}

      {/* Step 1: Connection */}
      {step === 'connect' && (
        <Card>
          <CardHeader>
            <CardTitle>SALTED 인솔 연결</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isMock && typeof navigator !== 'undefined' && !('bluetooth' in navigator) && (
              <p className="text-sm text-amber-600">
                Chrome 브라우저에서만 지원됩니다
              </p>
            )}

            <Button
              onClick={handleConnect}
              disabled={connectionState === 'connecting'}
              className="w-full"
            >
              {connectionState === 'connecting'
                ? '연결 중...'
                : connectionState === 'connected'
                  ? '연결됨'
                  : 'SALTED 인솔 연결'}
            </Button>

            {connectionState === 'error' && (
              <p className="text-sm text-red-600">
                {error ?? '연결 오류가 발생했습니다. 다시 시도해 주세요.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Session recording */}
      {step === 'session' && (
        <Card>
          <CardHeader>
            <CardTitle>보행 측정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isRecording ? (
              <Button onClick={handleStartSession} className="w-full">
                측정 시작
              </Button>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  측정 중 화면을 끄지 마세요
                </p>

                {/* Timer */}
                <div className="text-center">
                  <p className="text-3xl font-mono font-bold tabular-nums">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    목표: 5분
                  </p>
                </div>

                {/* Progress bar */}
                <Progress value={progressPercent} className="h-3" />

                {/* Frame count */}
                <p className="text-sm text-muted-foreground text-center">
                  수신 데이터: {sessionFrames.length.toLocaleString()} 프레임
                </p>

                <Button
                  variant="destructive"
                  onClick={handleStopSession}
                  className="w-full"
                >
                  측정 중지
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Results */}
      {step === 'results' && analysis && (
        <Card>
          <CardHeader>
            <CardTitle>생체역학 분석 결과</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Landing pattern */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">착지 패턴</span>
              <Badge variant="secondary">
                {LANDING_LABELS[analysis.landingPattern] ?? analysis.landingPattern}
              </Badge>
            </div>

            {/* Pronation */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">프로네이션</span>
              <span className="text-sm tabular-nums">
                {analysis.pronationDegree > 0 ? '+' : ''}
                {analysis.pronationDegree.toFixed(1)}&deg;
                {analysis.pronationDegree > 4
                  ? ' (과내전)'
                  : analysis.pronationDegree < -4
                    ? ' (과외전)'
                    : ' (정상)'}
              </span>
            </div>

            {/* Weight distribution */}
            <div className="space-y-2">
              <span className="text-sm font-medium">체중 분포</span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted p-2">
                  <p className="text-xs text-muted-foreground">전족부</p>
                  <p className="text-sm font-bold">
                    {analysis.weightDistribution.forefoot.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-xs text-muted-foreground">중족부</p>
                  <p className="text-sm font-bold">
                    {analysis.weightDistribution.midfoot.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-xs text-muted-foreground">후족부</p>
                  <p className="text-sm font-bold">
                    {analysis.weightDistribution.hindfoot.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Trigger precision design */}
            <Button className="w-full mt-4">
              인솔 설계 요청
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
