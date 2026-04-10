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

/**
 * Upload a gait (walking) video via TUS protocol with resumable uploads.
 * Includes `type: 'gait'` + `viewType` metadata so the upload route routes
 * to the correct gait analyzer (side=sagittal, rear=frontal).
 *
 * Per 2-phase biomechanically-correct capture:
 * - viewType='side' → sagittal plane analysis (stride, dorsiflexion, arch flex)
 * - viewType='rear' → frontal plane analysis (pronation/supination)
 */
export function uploadGaitVideo(
  file: Blob,
  scanId: string,
  viewType: 'side' | 'rear',
  onProgress: (percent: number) => void,
  onComplete: (url: string) => void,
  onError: (error: Error) => void
): { abort: () => void } {
  const upload = new tus.Upload(file, {
    endpoint: '/api/scan/upload',
    chunkSize: 5 * 1024 * 1024, // 5MB per RESEARCH Pattern 4
    retryDelays: [0, 1000, 3000, 5000],
    metadata: {
      filename: `gait-${viewType}-video.webm`,
      filetype: 'video/webm',
      scanId,
      type: 'gait',
      viewType,
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
      const viewLabel = viewType === 'side' ? '옆모습' : '뒷모습';
      onError(new Error(`${viewLabel} 보행 영상 업로드에 실패했습니다`));
      console.error(`TUS gait ${viewType} upload error:`, err);
    },
  });

  upload.start();

  return {
    abort: () => {
      upload.abort();
    },
  };
}
