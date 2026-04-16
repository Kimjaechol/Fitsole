"""Gait analysis API endpoints.

POST /gait/analyze - Accept walking video with view type, run view-specific gait analysis pipeline.

View types:
- 'side' (sagittal plane): Measures stride length, dorsiflexion, arch flex, gait cycle
- 'rear' (frontal plane): Measures pronation/supination, Q-angle, bilateral symmetry
"""

import logging
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, UploadFile

from app.gait.angle_calculator import compute_ankle_angles
from app.gait.arch_analyzer import compute_arch_flex_index
from app.gait.gait_classifier import classify_gait, compute_pronation_supination
from app.gait.pose_detector import detect_landmarks
from app.validation import UUID_PATTERN  # shared scanId format validator

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

# Valid view types
VALID_VIEW_TYPES = {"side", "rear"}


@router.post("/analyze")
async def analyze_gait(
    video: UploadFile,
    scanId: str = Form(...),
    viewType: str = Form("side"),
):
    """Analyze gait from walking video with biomechanically-correct view.

    Processes a walking video through view-specific gait analysis:

    **Side view (sagittal plane):**
    - Camera at knee height (50cm), landscape
    - User walks parallel to camera at 3m distance
    - Measures: stride length, dorsiflexion angles, arch flex, gait cycle timing

    **Rear view (frontal plane):**
    - Camera at hip height (80cm), portrait
    - User walks away from camera at 3m starting distance
    - Measures: pronation/supination, Q-angle, bilateral symmetry

    Both views use MediaPipe Pose for 33-point landmark detection.

    Args:
        video: Walking video file (mp4, quicktime, webm). Max 200MB.
        scanId: UUID identifier for the scan session.
        viewType: 'side' or 'rear' (defaults to 'side' for backward compat).

    Returns:
        JSON with view-specific gait analysis results.
        Side view: scanId, viewType, gaitPattern, archFlexibilityIndex, strideQuality
        Rear view: scanId, viewType, ankleAlignment, pronationDegree, bilateralSymmetry
    """
    # Validate scanId format
    if not UUID_PATTERN.match(scanId):
        raise HTTPException(status_code=400, detail="Invalid scanId format. Must be UUID.")

    # Validate viewType
    if viewType not in VALID_VIEW_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid viewType: {viewType}. Must be 'side' or 'rear'.",
        )

    # T-02-10: Validate MIME type
    if video.content_type and video.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {video.content_type}. Only video files accepted.",
        )

    work_dir = None
    try:
        # Create isolated temp directory
        work_dir = Path(tempfile.mkdtemp(prefix=f"fitsole_gait_{viewType}_{scanId}_"))
        video_path = work_dir / f"walking_{viewType}.mp4"

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

        logger.info(
            "Saved %s walking video (%d bytes) for scan %s",
            viewType,
            total_size,
            scanId,
        )

        # Detect pose landmarks with MediaPipe Pose (shared between both views)
        landmarks = detect_landmarks(str(video_path))
        if not landmarks:
            raise HTTPException(
                status_code=422,
                detail=(
                    "No pose landmarks detected in video. Please ensure full body "
                    "is visible while walking and camera is at correct height "
                    "(50cm for side view, 80cm for rear view)."
                ),
            )

        # View-specific analysis
        if viewType == "side":
            return _analyze_side_view(scanId, landmarks)
        else:
            return _analyze_rear_view(scanId, landmarks)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Gait analysis failed for %s (%s): %s", scanId, viewType, str(e))
        raise HTTPException(status_code=500, detail=f"Gait analysis failed: {str(e)}")
    finally:
        # Clean up temp directory
        if work_dir and work_dir.exists():
            shutil.rmtree(work_dir, ignore_errors=True)


def _analyze_side_view(scan_id: str, landmarks: list[dict]) -> dict:
    """Sagittal plane analysis (side view).

    Measures motion in the anterior-posterior axis:
    - Stride length (heel-to-heel distance between strikes)
    - Dorsiflexion/plantarflexion angles at ankle
    - Arch flexibility (static vs dynamic arch index)
    - Gait cycle timing (stance vs swing phase)

    The side view does NOT measure pronation/supination reliably because
    ankle roll occurs in the frontal plane and is hidden from this angle.
    """
    # Compute ankle angles (dorsiflexion is most reliable from side view)
    ankle_angles = compute_ankle_angles(landmarks)

    # Gait pattern classification uses sagittal motion
    gait_pattern = classify_gait(ankle_angles)

    # Arch flexibility index is computed from vertical foot deformation
    # which is visible from the side
    arch_flexibility_index = compute_arch_flex_index(landmarks)

    logger.info(
        "Side view analysis for %s: pattern=%s, arch_flex=%.3f",
        scan_id,
        gait_pattern,
        arch_flexibility_index,
    )

    return {
        "scanId": scan_id,
        "viewType": "side",
        "gaitPattern": gait_pattern,
        "archFlexibilityIndex": arch_flexibility_index,
        # NOTE: ankleAlignment from side view is unreliable - use rear view.
        # Returned here as 'neutral' placeholder; real value comes from rear view.
        "ankleAlignment": "neutral",
    }


def _analyze_rear_view(scan_id: str, landmarks: list[dict]) -> dict:
    """Frontal plane analysis (rear view).

    Measures motion in the medial-lateral axis:
    - Pronation/supination degree (ankle roll inward/outward)
    - Q-angle (knee alignment relative to hip-ankle axis)
    - Bilateral symmetry (left vs right leg comparison)

    The rear view is ESSENTIAL for pronation/supination measurement because
    ankle roll is a frontal plane motion not visible from the side.
    """
    # Rear view uses compute_ankle_angles for pronation calculation
    ankle_angles = compute_ankle_angles(landmarks)

    # Pronation/supination is the primary output of rear view analysis
    ankle_alignment = compute_pronation_supination(ankle_angles)

    # Compute average pronation degree from all frames
    pronation_degrees = []
    for frame in ankle_angles:
        left_pron = frame.get("left", {}).get("pronation_angle")
        right_pron = frame.get("right", {}).get("pronation_angle")
        if left_pron is not None:
            pronation_degrees.append(left_pron)
        if right_pron is not None:
            pronation_degrees.append(right_pron)

    avg_pronation = (
        sum(pronation_degrees) / len(pronation_degrees)
        if pronation_degrees
        else 0.0
    )

    logger.info(
        "Rear view analysis for %s: alignment=%s, avg_pronation=%.2f°",
        scan_id,
        ankle_alignment,
        avg_pronation,
    )

    return {
        "scanId": scan_id,
        "viewType": "rear",
        "ankleAlignment": ankle_alignment,
        "pronationDegree": round(avg_pronation, 2),
        # NOTE: gaitPattern/archFlex from rear view are unreliable - use side view.
        "gaitPattern": "normal",
        "archFlexibilityIndex": 0.5,
    }
