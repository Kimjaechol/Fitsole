/**
 * Camera initialization and quality check helpers for foot scanning.
 * Per RESEARCH Pitfall 6: limit to 1080p/30fps to prevent memory issues on low-end devices.
 * Per T-02-07: camera stream stays local, stop all tracks on unmount.
 */

/**
 * Initialize rear camera with optimized constraints for foot scanning.
 * Requests environment-facing camera at 1080p/30fps max.
 */
export async function initCamera(): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    },
    audio: false,
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  return stream;
}

/**
 * Check frame quality by analyzing pixel brightness.
 * Full blur detection is server-side with OpenCV Laplacian (per RESEARCH).
 * Client-side checks: brightness only (dark < 50 average luminance).
 */
export function checkFrameQuality(canvas: HTMLCanvasElement): {
  blur: boolean;
  dark: boolean;
} {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { blur: false, dark: false };
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Calculate average luminance from RGB values
  let totalLuminance = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    // Perceived luminance formula: 0.299*R + 0.587*G + 0.114*B
    totalLuminance += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const averageLuminance = totalLuminance / pixelCount;

  return {
    blur: false, // Server-side detection with OpenCV Laplacian
    dark: averageLuminance < 50,
  };
}

/**
 * Stop all tracks on a camera MediaStream.
 * Per T-02-07: ensures camera is released on unmount to prevent information disclosure.
 */
export function stopCamera(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}
