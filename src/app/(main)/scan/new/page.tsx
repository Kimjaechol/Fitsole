'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { useScanStore } from '@/lib/scan/store';
import { checkFrameQuality } from '@/lib/scan/camera';
import { uploadScanVideo, uploadGaitVideo } from '@/lib/scan/upload';
import { ScanStepper } from '@/components/scan/scan-stepper';
import { CameraViewfinder } from '@/components/scan/camera-viewfinder';
import { RecordingButton } from '@/components/scan/recording-button';
import { GuidanceOverlay } from '@/components/scan/guidance-overlay';
import { CircularGuide } from '@/components/scan/circular-guide';
import { A4PaperGuide } from '@/components/scan/a4-paper-guide';
import { WalkingGuide } from '@/components/scan/walking-guide';
import { FootSideSelector } from '@/components/scan/foot-side-selector';
import type { FootSide, GaitViewType } from '@/lib/scan/types';

const FOOT_RECORD_MAX_SECONDS = 20;
const GAIT_RECORD_MAX_SECONDS = 15;

// Steps:
// 1 = Positioning (A4 placement)
// 2 = Recording foot (360° video)
// 3 = Walking side view (sagittal plane)
// 4 = Walking rear view (frontal plane)
// 5 = Foot side + biometric form
const TOTAL_STEPS = 5;

export default function ScanNewPage() {
  const router = useRouter();
  const store = useScanStore();

  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [circularProgress, setCircularProgress] = useState(0);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Walking state
  const [showWalkingInstructions, setShowWalkingInstructions] = useState(true);

  // Biometric state
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [age, setAge] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  // Foot side state
  const [scannedFoot, setScannedFoot] = useState<FootSide | null>(null);
  const [currentFoot, setCurrentFoot] = useState<FootSide>('left');

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uploadAbortRef = useRef<{ abort: () => void } | null>(null);
  const scanIdRef = useRef<string>('');

  // Derive current gait view type from step
  const currentGaitView: GaitViewType | null =
    step === 3 ? 'side' : step === 4 ? 'rear' : null;

  // Initialize scan session
  useEffect(() => {
    const sessionId = crypto.randomUUID();
    scanIdRef.current = sessionId;
    store.startScan(sessionId, 'current-user');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (uploadAbortRef.current) uploadAbortRef.current.abort();
    };
  }, []);

  const startCountdown = useCallback((onComplete: () => void) => {
    setCountdown(3);
    let count = 3;
    countdownRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setCountdown(null);
        onComplete();
      } else {
        setCountdown(count);
      }
    }, 1000);
  }, []);

  const startRecording = useCallback(
    (maxSeconds: number) => {
      const videoEl = document.querySelector('video');
      if (!videoEl || !videoEl.srcObject) return;

      const stream = videoEl.srcObject as MediaStream;
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
      });

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        handleRecordingComplete(blob);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setElapsedSeconds(0);

      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds += 1;
        setElapsedSeconds(seconds);
        setCircularProgress(Math.min((seconds / maxSeconds) * 100, 100));

        if (seconds >= maxSeconds) {
          stopRecording();
        }
      }, 1000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step]
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setCircularProgress(0);
  }, []);

  const handleRecordingComplete = useCallback(
    (blob: Blob) => {
      setUploadProgress(0);

      // Step 2 = foot 360° scan; Step 3 = side walking; Step 4 = rear walking
      let handle: { abort: () => void };

      if (step === 2) {
        handle = uploadScanVideo(
          blob,
          scanIdRef.current,
          (percent) => setUploadProgress(percent),
          () => {
            setUploadProgress(null);
            setCompletedSteps((prev) => [...prev, 2]);
            setStep(3);
            setShowWalkingInstructions(true);
          },
          () => setUploadProgress(null)
        );
      } else if (step === 3) {
        // Side view gait video
        handle = uploadGaitVideo(
          blob,
          scanIdRef.current,
          'side',
          (percent) => setUploadProgress(percent),
          () => {
            setUploadProgress(null);
            setCompletedSteps((prev) => [...prev, 3]);
            setStep(4);
            setShowWalkingInstructions(true);
          },
          () => setUploadProgress(null)
        );
      } else if (step === 4) {
        // Rear view gait video
        handle = uploadGaitVideo(
          blob,
          scanIdRef.current,
          'rear',
          (percent) => setUploadProgress(percent),
          () => {
            setUploadProgress(null);
            setCompletedSteps((prev) => [...prev, 4]);
            setStep(5);
          },
          () => setUploadProgress(null)
        );
      } else {
        return;
      }

      uploadAbortRef.current = handle;
    },
    [step]
  );

  const handleFrameCheck = useCallback((canvas: HTMLCanvasElement) => {
    const quality = checkFrameQuality(canvas);
    if (quality.dark) {
      setQualityWarning('주변이 너무 어둡습니다. 밝은 곳으로 이동해 주세요.');
    } else {
      setQualityWarning(null);
    }
  }, []);

  const handleBack = useCallback(() => {
    setShowExitDialog(true);
  }, []);

  const handleExitConfirm = useCallback(() => {
    stopRecording();
    store.reset();
    router.push('/scan');
  }, [stopRecording, store, router]);

  const handleFootSelect = useCallback(
    (side: FootSide) => {
      setCurrentFoot(side);
      setScannedFoot(currentFoot);
      setStep(1);
      setCompletedSteps([]);
    },
    [currentFoot]
  );

  const handleFinish = useCallback(async () => {
    setIsProcessing(true);
    setProcessError(null);

    try {
      const response = await fetch('/api/scan/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId: scanIdRef.current,
          footSide: currentFoot,
          weight: parseFloat(weight),
          gender,
          age: parseFloat(age),
        }),
      });

      if (!response.ok) {
        throw new Error('Process trigger failed');
      }

      router.push(`/scan/processing/${scanIdRef.current}`);
    } catch {
      setProcessError('처리를 시작할 수 없습니다. 다시 시도해 주세요.');
    } finally {
      setIsProcessing(false);
    }
  }, [router, currentFoot, weight, gender, age]);

  // Step 1: Positioning (A4 placement)
  if (step === 1) {
    return (
      <>
        <CameraViewfinder onFrame={handleFrameCheck} onBack={handleBack}>
          <div className="absolute left-0 right-0 top-4 z-10 px-4">
            <ScanStepper currentStep={1} completedSteps={completedSteps} />
          </div>

          <A4PaperGuide detected={false} />

          <GuidanceOverlay
            message="A4 용지 위에 발을 올려주세요"
            type="info"
          />

          <div className="absolute bottom-32 left-0 right-0 z-10 px-4 text-center">
            <p className="text-sm text-white/80">
              밝은 곳에서 A4 용지 위에 맨발을 올려주세요
            </p>
          </div>

          {qualityWarning && (
            <div className="absolute bottom-44 left-0 right-0 z-10 px-4 text-center">
              <div className="inline-block rounded-lg bg-amber-600/90 px-3 py-1.5">
                <p className="text-sm font-medium text-white">{qualityWarning}</p>
              </div>
            </div>
          )}

          <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center px-6">
            <Button
              onClick={() => {
                setCompletedSteps((prev) => [...prev, 1]);
                setStep(2);
              }}
              className="w-full max-w-xs bg-blue-600 hover:bg-blue-700"
            >
              다음 단계로
            </Button>
          </div>
        </CameraViewfinder>

        <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <DialogContent>
            <DialogTitle>스캔을 중단하시겠습니까?</DialogTitle>
            <DialogDescription>
              지금까지의 촬영 데이터가 삭제됩니다.
            </DialogDescription>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowExitDialog(false)}>
                계속하기
              </Button>
              <Button variant="destructive" onClick={handleExitConfirm}>
                중단
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Step 2: Recording foot (360° scan)
  if (step === 2) {
    return (
      <>
        <CameraViewfinder
          onFrame={isRecording ? handleFrameCheck : undefined}
          onBack={handleBack}
        >
          <div className="absolute left-0 right-0 top-4 z-10 px-4">
            <ScanStepper currentStep={2} completedSteps={completedSteps} />
          </div>

          <CircularGuide progress={circularProgress} />

          <GuidanceOverlay
            message={
              isRecording
                ? '발 주위를 천천히 돌아주세요'
                : '촬영 버튼을 눌러 시작하세요'
            }
            type="info"
          />

          {isRecording && (
            <div className="absolute left-0 right-0 top-28 z-10 text-center">
              <p className="text-sm text-white/80">
                15-20초 동안 발 주위를 원을 그리며 촬영해 주세요
              </p>
            </div>
          )}

          {countdown !== null && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
              <span className="text-[64px] font-bold leading-none text-white">
                {countdown}
              </span>
            </div>
          )}

          {isRecording && (
            <div className="absolute right-4 top-20 z-10 rounded-lg bg-black/60 px-3 py-1.5">
              <span className="text-sm font-medium text-white">
                {elapsedSeconds}s / {FOOT_RECORD_MAX_SECONDS}s
              </span>
            </div>
          )}

          {qualityWarning && isRecording && (
            <div className="absolute bottom-32 left-0 right-0 z-10 px-4 text-center">
              <div className="inline-block rounded-lg bg-amber-600/90 px-3 py-1.5">
                <p className="text-sm font-medium text-white">{qualityWarning}</p>
              </div>
            </div>
          )}

          {uploadProgress !== null && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/70">
              <p className="text-base text-white">영상 업로드 중... {uploadProgress}%</p>
              <div className="h-2 w-48 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center">
            <RecordingButton
              isRecording={isRecording}
              disabled={countdown !== null || uploadProgress !== null}
              onStart={() => {
                startCountdown(() => startRecording(FOOT_RECORD_MAX_SECONDS));
              }}
              onStop={stopRecording}
            />
          </div>
        </CameraViewfinder>

        <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <DialogContent>
            <DialogTitle>스캔을 중단하시겠습니까?</DialogTitle>
            <DialogDescription>
              지금까지의 촬영 데이터가 삭제됩니다.
            </DialogDescription>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowExitDialog(false)}>
                계속하기
              </Button>
              <Button variant="destructive" onClick={handleExitConfirm}>
                중단
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Steps 3 & 4: Walking videos (side + rear)
  if ((step === 3 || step === 4) && currentGaitView) {
    // Instruction screen before recording
    if (showWalkingInstructions) {
      const accentClass =
        currentGaitView === 'side'
          ? 'bg-blue-600 hover:bg-blue-700'
          : 'bg-emerald-600 hover:bg-emerald-700';

      return (
        <div className="flex min-h-screen flex-col items-center gap-6 overflow-y-auto bg-white px-6 py-8">
          {/* Stepper at top */}
          <div className="w-full max-w-md">
            <ScanStepper currentStep={step} completedSteps={completedSteps} />
          </div>

          {/* Guide component with diagrams */}
          <WalkingGuide viewType={currentGaitView} stepCount={0} totalSteps={10} />

          {/* Start button */}
          <div className="flex w-full max-w-xs flex-col gap-3 pb-8">
            <Button
              onClick={() => {
                setShowWalkingInstructions(false);
                startCountdown(() => startRecording(GAIT_RECORD_MAX_SECONDS));
              }}
              className={`w-full ${accentClass}`}
              size="lg"
            >
              {currentGaitView === 'side'
                ? '옆모습 촬영 시작'
                : '뒷모습 촬영 시작'}
            </Button>
            <p className="text-center text-sm text-slate-500">
              시작 버튼을 누르면 3초 카운트다운 후 촬영이 시작됩니다
            </p>
          </div>
        </div>
      );
    }

    // Recording screen
    const overlayLabel =
      currentGaitView === 'side'
        ? '카메라 옆을 지나가며 걷기'
        : '카메라에서 멀어지며 걷기';
    const accentColor = currentGaitView === 'side' ? 'bg-blue-600' : 'bg-emerald-600';

    return (
      <>
        <CameraViewfinder onBack={handleBack}>
          <div className="absolute left-0 right-0 top-4 z-10 px-4">
            <ScanStepper currentStep={step} completedSteps={completedSteps} />
          </div>

          <GuidanceOverlay
            message={isRecording ? overlayLabel : '촬영 준비 중...'}
            type="info"
          />

          {countdown !== null && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/60">
              <span className="text-[64px] font-bold leading-none text-white">
                {countdown}
              </span>
              <p className="text-base text-white/80">
                위치로 이동해 주세요
              </p>
            </div>
          )}

          {isRecording && (
            <div className="absolute right-4 top-20 z-10 rounded-lg bg-black/60 px-3 py-1.5">
              <span className="text-sm font-medium text-white">
                {elapsedSeconds}s / {GAIT_RECORD_MAX_SECONDS}s
              </span>
            </div>
          )}

          {uploadProgress !== null && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/70">
              <p className="text-base text-white">영상 업로드 중... {uploadProgress}%</p>
              <div className="h-2 w-48 overflow-hidden rounded-full bg-white/20">
                <div
                  className={`h-full transition-all duration-300 ${accentColor}`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center">
            <RecordingButton
              isRecording={isRecording}
              disabled={countdown !== null || uploadProgress !== null}
              onStart={() => {
                startCountdown(() => startRecording(GAIT_RECORD_MAX_SECONDS));
              }}
              onStop={stopRecording}
            />
          </div>
        </CameraViewfinder>

        <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <DialogContent>
            <DialogTitle>스캔을 중단하시겠습니까?</DialogTitle>
            <DialogDescription>
              지금까지의 촬영 데이터가 삭제됩니다.
            </DialogDescription>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowExitDialog(false)}>
                계속하기
              </Button>
              <Button variant="destructive" onClick={handleExitConfirm}>
                중단
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Step 5: Foot side selection + biometric collection
  const biometricsComplete = weight !== '' && gender !== '' && age !== '';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white px-6">
      <div className="w-full max-w-md">
        <ScanStepper currentStep={5} completedSteps={completedSteps} />
      </div>

      <h2 className="text-2xl font-bold text-slate-800">
        {scannedFoot
          ? `${scannedFoot === 'left' ? '왼발' : '오른발'} 촬영 완료`
          : '어떤 발을 촬영했나요?'}
      </h2>

      <FootSideSelector
        scannedFoot={scannedFoot}
        onSelectFoot={handleFootSelect}
      />

      {scannedFoot && (
        <div className="flex w-full max-w-xs flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">
              압력 분석을 위해 추가 정보가 필요합니다
            </p>

            <div className="flex flex-col gap-1">
              <label htmlFor="weight" className="text-sm text-slate-600">
                체중 (kg)
              </label>
              <input
                id="weight"
                type="number"
                placeholder="예: 65"
                min={1}
                max={300}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">성별</span>
              <div className="flex gap-2">
                {([
                  { value: 'male', label: '남성' },
                  { value: 'female', label: '여성' },
                  { value: 'other', label: '기타' },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGender(option.value)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                      gender === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="age" className="text-sm text-slate-600">
                나이
              </label>
              <input
                id="age"
                type="number"
                placeholder="예: 30"
                min={1}
                max={150}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {processError && (
            <p className="text-center text-sm text-red-600">{processError}</p>
          )}

          <Button
            onClick={handleFinish}
            disabled={!biometricsComplete || isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isProcessing ? '처리 시작 중...' : '결과 보기'}
          </Button>
          <p className="text-center text-sm text-slate-500">
            반대쪽 발을 선택하면 추가 촬영할 수 있습니다
          </p>
        </div>
      )}
    </div>
  );
}
