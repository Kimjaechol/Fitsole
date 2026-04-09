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
import { uploadScanVideo } from '@/lib/scan/upload';
import { ScanStepper } from '@/components/scan/scan-stepper';
import { CameraViewfinder } from '@/components/scan/camera-viewfinder';
import { RecordingButton } from '@/components/scan/recording-button';
import { GuidanceOverlay } from '@/components/scan/guidance-overlay';
import { CircularGuide } from '@/components/scan/circular-guide';
import { A4PaperGuide } from '@/components/scan/a4-paper-guide';
import { WalkingGuide } from '@/components/scan/walking-guide';
import { FootSideSelector } from '@/components/scan/foot-side-selector';
import type { FootSide } from '@/lib/scan/types';

const FOOT_RECORD_MAX_SECONDS = 20;
const GAIT_RECORD_MAX_SECONDS = 30;

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
  const [stepCount, setStepCount] = useState(0);
  const [showWalkingInstructions, setShowWalkingInstructions] = useState(true);

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
      // Get video element from the DOM (CameraViewfinder renders it)
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

      recorder.start(1000); // Collect data every second
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setElapsedSeconds(0);

      // Timer for elapsed seconds
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
      // Upload the video
      setUploadProgress(0);
      const handle = uploadScanVideo(
        blob,
        scanIdRef.current,
        (percent) => setUploadProgress(percent),
        () => {
          setUploadProgress(null);
          // Move to next step
          if (step === 2) {
            setCompletedSteps((prev) => [...prev, 2]);
            setStep(3);
            setShowWalkingInstructions(true);
          } else if (step === 3) {
            setCompletedSteps((prev) => [...prev, 3]);
            setStep(4);
          }
        },
        () => {
          setUploadProgress(null);
          // Error handled by upload.ts with Korean message
        }
      );
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
      // Loop back to step 1 for second foot
      setStep(1);
      setCompletedSteps([]);
    },
    [currentFoot]
  );

  const handleFinish = useCallback(() => {
    // Navigate to processing page
    router.push(`/scan/processing/${scanIdRef.current}`);
  }, [router]);

  // Step 1: Positioning
  if (step === 1) {
    return (
      <>
        <CameraViewfinder onFrame={handleFrameCheck} onBack={handleBack}>
          {/* Stepper at top */}
          <div className="absolute left-0 right-0 top-4 z-10 px-4">
            <ScanStepper currentStep={1} completedSteps={completedSteps} />
          </div>

          {/* A4 Paper Guide */}
          <A4PaperGuide detected={false} />

          {/* Guidance */}
          <GuidanceOverlay
            message="A4 용지 위에 발을 올려주세요"
            type="info"
          />

          {/* Subtitle guidance */}
          <div className="absolute bottom-32 left-0 right-0 z-10 px-4 text-center">
            <p className="text-sm text-white/80">
              밝은 곳에서 A4 용지 위에 맨발을 올려주세요
            </p>
          </div>

          {/* Quality warning */}
          {qualityWarning && (
            <div className="absolute bottom-44 left-0 right-0 z-10 px-4 text-center">
              <div className="inline-block rounded-lg bg-amber-600/90 px-3 py-1.5">
                <p className="text-sm font-medium text-white">{qualityWarning}</p>
              </div>
            </div>
          )}

          {/* Proceed button */}
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

        {/* Exit confirmation dialog */}
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

  // Step 2: Recording foot
  if (step === 2) {
    return (
      <>
        <CameraViewfinder
          onFrame={isRecording ? handleFrameCheck : undefined}
          onBack={handleBack}
        >
          {/* Stepper */}
          <div className="absolute left-0 right-0 top-4 z-10 px-4">
            <ScanStepper currentStep={2} completedSteps={completedSteps} />
          </div>

          {/* Circular Guide */}
          <CircularGuide progress={circularProgress} />

          {/* Guidance */}
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

          {/* Countdown overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
              <span className="text-[64px] font-bold leading-none text-white">
                {countdown}
              </span>
            </div>
          )}

          {/* Recording timer */}
          {isRecording && (
            <div className="absolute right-4 top-20 z-10 rounded-lg bg-black/60 px-3 py-1.5">
              <span className="text-sm font-medium text-white">
                {elapsedSeconds}s / {FOOT_RECORD_MAX_SECONDS}s
              </span>
            </div>
          )}

          {/* Quality warning */}
          {qualityWarning && isRecording && (
            <div className="absolute bottom-32 left-0 right-0 z-10 px-4 text-center">
              <div className="inline-block rounded-lg bg-amber-600/90 px-3 py-1.5">
                <p className="text-sm font-medium text-white">{qualityWarning}</p>
              </div>
            </div>
          )}

          {/* Upload progress */}
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

          {/* Recording button */}
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

        {/* Exit dialog */}
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

  // Step 3: Walking/gait recording
  if (step === 3) {
    if (showWalkingInstructions) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white px-6">
          <WalkingGuide stepCount={0} totalSteps={10} />
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <p className="text-center text-sm text-slate-500">
              3초 후 촬영이 시작됩니다
            </p>
            <Button
              onClick={() => {
                setShowWalkingInstructions(false);
                setStepCount(0);
                startCountdown(() => startRecording(GAIT_RECORD_MAX_SECONDS));
              }}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              보행 촬영 시작
            </Button>
          </div>
        </div>
      );
    }

    return (
      <>
        <CameraViewfinder onBack={handleBack}>
          {/* Stepper */}
          <div className="absolute left-0 right-0 top-4 z-10 px-4">
            <ScanStepper currentStep={3} completedSteps={completedSteps} />
          </div>

          {/* Guidance */}
          <GuidanceOverlay
            message={isRecording ? '자연스럽게 걸어주세요' : '촬영 준비 중...'}
            type="info"
          />

          {/* Countdown */}
          {countdown !== null && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/60">
              <span className="text-[64px] font-bold leading-none text-white">
                {countdown}
              </span>
              <p className="text-base text-white/80">
                3초 후 촬영이 시작됩니다
              </p>
            </div>
          )}

          {/* Step counter overlay */}
          {isRecording && (
            <div className="absolute bottom-32 left-0 right-0 z-10 flex justify-center">
              <div className="rounded-lg bg-black/60 px-4 py-2">
                <span className="text-base text-white">
                  {stepCount}/10 걸음
                </span>
              </div>
            </div>
          )}

          {/* Recording timer */}
          {isRecording && (
            <div className="absolute right-4 top-20 z-10 rounded-lg bg-black/60 px-3 py-1.5">
              <span className="text-sm font-medium text-white">
                {elapsedSeconds}s / {GAIT_RECORD_MAX_SECONDS}s
              </span>
            </div>
          )}

          {/* Upload progress */}
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

          {/* Recording button */}
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

        {/* Exit dialog */}
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

  // Step 4: Foot side selection
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white px-6">
      <h2 className="text-2xl font-bold text-slate-800">
        {scannedFoot
          ? `${scannedFoot === 'left' ? '왼발' : '오른발'} 촬영 완료`
          : '어떤 발을 촬영할까요?'}
      </h2>

      <FootSideSelector
        scannedFoot={scannedFoot}
        onSelectFoot={handleFootSelect}
      />

      {scannedFoot && (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button
            onClick={handleFinish}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            결과 보기
          </Button>
          <p className="text-center text-sm text-slate-500">
            반대쪽 발을 선택하면 추가 촬영할 수 있습니다
          </p>
        </div>
      )}
    </div>
  );
}
