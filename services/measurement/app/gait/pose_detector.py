"""MediaPipe Pose landmark detection from walking video.

Uses PoseLandmarker with pose_landmarker_full.task model for highest accuracy
server-side gait analysis. Extracts 33 body landmarks per frame.

Key foot/leg landmarks (per RESEARCH Pattern 3):
    LEFT_KNEE=25, RIGHT_KNEE=26
    LEFT_ANKLE=27, RIGHT_ANKLE=28
    LEFT_HEEL=29, RIGHT_HEEL=30
    LEFT_FOOT_INDEX=31, RIGHT_FOOT_INDEX=32
    LEFT_HIP=23, RIGHT_HIP=24
"""

import logging
import math
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

logger = logging.getLogger(__name__)

# Landmark indices for gait analysis
LANDMARK_INDICES = {
    "LEFT_HIP": 23,
    "RIGHT_HIP": 24,
    "LEFT_KNEE": 25,
    "RIGHT_KNEE": 26,
    "LEFT_ANKLE": 27,
    "RIGHT_ANKLE": 28,
    "LEFT_HEEL": 29,
    "RIGHT_HEEL": 30,
    "LEFT_FOOT_INDEX": 31,
    "RIGHT_FOOT_INDEX": 32,
}

# Default model path - configurable via environment
DEFAULT_MODEL_PATH = "models/pose_landmarker_full.task"


def detect_landmarks(video_path: str) -> list[dict]:
    """Detect 33 body landmarks from walking video using MediaPipe Pose.

    Args:
        video_path: Path to the walking video file.

    Returns:
        List of frame landmark data. Each frame is a dict with:
            - frame_index: int
            - timestamp_ms: int
            - landmarks: dict mapping landmark name to {x, y, z, visibility}
            - all_landmarks: list of all 33 landmarks as {x, y, z, visibility}

    Raises:
        FileNotFoundError: If video file does not exist.
        RuntimeError: If MediaPipe PoseLandmarker fails to initialize.
    """
    video_file = Path(video_path)
    if not video_file.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    # Resolve model path
    model_path = Path(DEFAULT_MODEL_PATH)
    if not model_path.exists():
        # Try relative to this file's directory
        model_path = Path(__file__).parent.parent.parent / "models" / "pose_landmarker_full.task"
    if not model_path.exists():
        raise RuntimeError(
            f"MediaPipe model not found at {DEFAULT_MODEL_PATH}. "
            "Download pose_landmarker_full.task from "
            "https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker"
        )

    base_options = python.BaseOptions(model_asset_path=str(model_path))
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
    )

    landmarker = vision.PoseLandmarker.create_from_options(options)
    frames_data: list[dict] = []

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Failed to open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30.0  # Fallback

    frame_index = 0
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Convert BGR to RGB for MediaPipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

            # Compute timestamp in milliseconds
            timestamp_ms = int((frame_index / fps) * 1000)

            result = landmarker.detect_for_video(mp_image, timestamp_ms)

            if result.pose_landmarks and len(result.pose_landmarks) > 0:
                pose = result.pose_landmarks[0]

                # Extract key landmarks by name
                key_landmarks = {}
                for name, idx in LANDMARK_INDICES.items():
                    if idx < len(pose):
                        lm = pose[idx]
                        key_landmarks[name] = {
                            "x": lm.x,
                            "y": lm.y,
                            "z": lm.z,
                            "visibility": lm.visibility,
                        }

                # All 33 landmarks
                all_landmarks = [
                    {
                        "x": lm.x,
                        "y": lm.y,
                        "z": lm.z,
                        "visibility": lm.visibility,
                    }
                    for lm in pose
                ]

                frames_data.append(
                    {
                        "frame_index": frame_index,
                        "timestamp_ms": timestamp_ms,
                        "landmarks": key_landmarks,
                        "all_landmarks": all_landmarks,
                    }
                )

            frame_index += 1
    finally:
        cap.release()
        landmarker.close()

    logger.info(
        "Detected landmarks in %d/%d frames from %s",
        len(frames_data),
        frame_index,
        video_path,
    )

    return frames_data
