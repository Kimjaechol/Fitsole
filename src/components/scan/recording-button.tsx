'use client';

import { Video, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecordingButtonProps {
  isRecording: boolean;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function RecordingButton({
  isRecording,
  disabled = false,
  onStart,
  onStop,
}: RecordingButtonProps) {
  const handleClick = () => {
    if (disabled) return;

    if (isRecording) {
      onStop();
    } else {
      // Haptic feedback on start
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
      onStart();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label={isRecording ? '촬영 중지' : '촬영 시작'}
      className={cn(
        'flex items-center justify-center rounded-full transition-colors',
        'h-[72px] w-[72px]',
        disabled && 'opacity-50 cursor-not-allowed',
        isRecording
          ? 'bg-red-600 animate-recording-pulse'
          : 'bg-blue-600 hover:bg-blue-700'
      )}
    >
      {isRecording ? (
        <Square className="h-6 w-6 fill-white text-white" />
      ) : (
        <Video className="h-7 w-7 text-white" />
      )}
    </button>
  );
}
