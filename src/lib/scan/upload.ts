import * as tus from 'tus-js-client';

/**
 * Upload a scan video via TUS protocol with resumable uploads.
 * Per RESEARCH Pattern 4: 5MB chunks, retry delays [0, 1000, 3000, 5000].
 */
export function uploadScanVideo(
  file: Blob,
  scanId: string,
  onProgress: (percent: number) => void,
  onComplete: (url: string) => void,
  onError: (error: Error) => void
): { abort: () => void } {
  const upload = new tus.Upload(file, {
    endpoint: '/api/scan/upload',
    chunkSize: 5 * 1024 * 1024, // 5MB per RESEARCH Pattern 4
    retryDelays: [0, 1000, 3000, 5000],
    metadata: {
      filename: 'scan-video.webm',
      filetype: 'video/webm',
      scanId,
    },
    onProgress: (bytesUploaded, bytesTotal) => {
      const percent = Math.round((bytesUploaded / bytesTotal) * 100);
      onProgress(percent);
    },
    onSuccess: () => {
      const url = upload.url;
      onComplete(url ?? '');
    },
    onError: (err) => {
      onError(new Error('영상 업로드에 실패했습니다'));
      console.error('TUS upload error:', err);
    },
  });

  upload.start();

  return {
    abort: () => {
      upload.abort();
    },
  };
}
