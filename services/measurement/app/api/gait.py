"""Gait analysis API endpoints.

POST /gait/analyze - Accept walking video, run full gait analysis pipeline.
"""

import logging
import re
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from app.gait.angle_calculator import compute_ankle_angles
from app.gait.arch_analyzer import compute_arch_flex_index
from app.gait.gait_classifier import classify_gait, compute_pronation_supination
from app.gait.pose_detector import detect_landmarks

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gait", tags=["gait"])

# T-02-10: Maximum upload size for walking video (200MB)
MAX_UPLOAD_SIZE = 200 * 1024 * 1024

# Allowed video MIME types (T-02-10 Tampering mitigation)
ALLOWED_MIME_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-msvideo",
    "video/mpeg",
}

# UUID format validation
UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


@router.post("/analyze")
async def analyze_gait(
    video: UploadFile,
    scanId: str,
):
    """Analyze gait from walking video.

    Processes a walking video through the gait analysis pipeline:
    1. Detect pose landmarks with MediaPipe Pose (33 points)
    2. Compute ankle angles (dorsiflexion, pronation)
    3. Classify gait pattern (normal/overpronation/supination)
    4. Determine ankle alignment (neutral/pronation/supination)
    5. Compute arch flexibility index (0-1)

    Args:
        video: Walking video file (mp4, quicktime, webm). Max 200MB.
        scanId: UUID identifier for the scan session.

    Returns:
        JSON with scanId, gaitPattern, ankleAlignment, archFlexibilityIndex.
    """
    # Validate scanId format
    if not UUID_PATTERN.match(scanId):
        raise HTTPException(status_code=400, detail="Invalid scanId format. Must be UUID.")

    # T-02-10: Validate MIME type
    if video.content_type and video.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {video.content_type}. Only video files accepted.",
        )

    work_dir = None
    try:
        # Create isolated temp directory
        work_dir = Path(tempfile.mkdtemp(prefix=f"fitsole_gait_{scanId}_"))
        video_path = work_dir / "walking_video.mp4"

        # T-02-10: Save uploaded video with size check
        total_size = 0
        with open(video_path, "wb") as f:
            while chunk := await video.read(1024 * 1024):  # 1MB chunks
                total_size += len(chunk)
                if total_size > MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024)}MB.",
                    )
                f.write(chunk)

        logger.info("Saved walking video (%d bytes) for scan %s", total_size, scanId)

        # Step 1: Detect pose landmarks
        landmarks = detect_landmarks(str(video_path))
        if not landmarks:
            raise HTTPException(
                status_code=422,
                detail="No pose landmarks detected in video. Please ensure full body is visible while walking.",
            )

        # Step 2: Compute ankle angles
        ankle_angles = compute_ankle_angles(landmarks)

        # Step 3: Classify gait pattern
        gait_pattern = classify_gait(ankle_angles)

        # Step 4: Compute ankle alignment
        ankle_alignment = compute_pronation_supination(ankle_angles)

        # Step 5: Compute arch flexibility index
        arch_flexibility_index = compute_arch_flex_index(landmarks)

        logger.info(
            "Gait analysis for %s: pattern=%s, alignment=%s, arch_flex=%.3f",
            scanId,
            gait_pattern,
            ankle_alignment,
            arch_flexibility_index,
        )

        return {
            "scanId": scanId,
            "gaitPattern": gait_pattern,
            "ankleAlignment": ankle_alignment,
            "archFlexibilityIndex": arch_flexibility_index,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Gait analysis failed for %s: %s", scanId, str(e))
        raise HTTPException(status_code=500, detail=f"Gait analysis failed: {str(e)}")
    finally:
        # Clean up temp directory
        if work_dir and work_dir.exists():
            shutil.rmtree(work_dir, ignore_errors=True)
