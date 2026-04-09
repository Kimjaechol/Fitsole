'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { initCamera, stopCamera } from '@/lib/scan/camera';

interface CameraViewfinderProps {
  onFrame?: (canvas: HTMLCanvasElement) => void;
  onBack?: () => void;
  children?: ReactNode;
}

export function CameraViewfinder({
  onFrame,
  onBack,
  children,
}: CameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIdRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const stream = await initCamera();
        if (!mounted) {
          stopCamera(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (!mounted) return;
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError') {
            setError('카메라 접근이 거부되었습니다. 설정에서 카메라 권한을 허용해 주세요.');
          } else if (err.name === 'NotFoundError') {
            setError('카메라를 사용할 수 없습니다. 다른 기기에서 시도해 주세요.');
          } else {
            setError('카메라를 사용할 수 없습니다. 다른 기기에서 시도해 주세요.');
          }
        } else {
          setError('카메라를 사용할 수 없습니다. 다른 기기에서 시도해 주세요.');
        }
      }
    }

    startCamera();

    return () => {
      mounted = false;
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      if (streamRef.current) {
        stopCamera(streamRef.current);
        streamRef.current = null;
      }
    };
  }, []);

  // Frame capture loop for quality checking
  useEffect(() => {
    if (!onFrame) return;

    function captureFrame() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= video.HAVE_CURRENT_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          onFrame?.(canvas);
        }
      }
      frameIdRef.current = requestAnimationFrame(captureFrame);
    }

    frameIdRef.current = requestAnimationFrame(captureFrame);

    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, [onFrame]);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="mx-4 max-w-sm rounded-lg bg-white p-6 text-center">
          <p className="text-base text-slate-800">{error}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white"
            >
              돌아가기
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        aria-label="발 촬영 화면"
        className="h-full w-full object-cover"
      />

      {/* Dark overlay outside scan area */}
      <div className="pointer-events-none absolute inset-0 border-[40px] border-black/50" />

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute left-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/30"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Children slot for overlaying guides/buttons */}
      {children}
    </div>
  );
}
