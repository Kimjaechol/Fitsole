"""Video frame extraction module.

Extracts frames from uploaded video at specified FPS rate
for SfM reconstruction pipeline (D-01).
"""

import logging
from pathlib import Path

import cv2

logger = logging.getLogger(__name__)


def extract_frames(
    video_path: Path,
    output_dir: Path,
    fps: float = 2.0,
) -> list[Path]:
    """Extract frames from video at the specified FPS rate.

    Per D-01: Extract frames at 2 FPS from user's 15-20s video
    of foot on A4 paper. Sequential naming for COLMAP compatibility.

    Args:
        video_path: Path to the input video file.
        output_dir: Directory to save extracted frames.
        fps: Target frames per second (default 2.0 per RESEARCH).

    Returns:
        List of paths to extracted frame JPEG files, sorted sequentially.
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        logger.error("Failed to open video: %s", video_path)
        return []

    video_fps = cap.get(cv2.CAP_PROP_FPS)
    if video_fps <= 0:
        logger.error("Invalid video FPS: %s", video_fps)
        cap.release()
        return []

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    # Calculate frame interval: extract 1 frame every (video_fps / target_fps) frames
    frame_interval = max(1, int(round(video_fps / fps)))

    logger.info(
        "Video: %.1f FPS, %d total frames, extracting every %d frames (target %.1f FPS)",
        video_fps,
        total_frames,
        frame_interval,
        fps,
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    extracted_paths: list[Path] = []
    frame_idx = 0
    extracted_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_interval == 0:
            extracted_count += 1
            frame_path = output_dir / f"frame_{extracted_count:04d}.jpg"
            cv2.imwrite(str(frame_path), frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
            extracted_paths.append(frame_path)

        frame_idx += 1

    cap.release()

    logger.info(
        "Extracted %d frames from %d total (%.1f FPS target)",
        len(extracted_paths),
        total_frames,
        fps,
    )

    return extracted_paths
