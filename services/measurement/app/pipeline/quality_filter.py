"""Frame quality filtering module.

Assesses individual frame quality (blur, darkness) and computes
overall scan quality score (D-19, SCAN-03, SCAN-06).
"""

import logging
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Quality thresholds
BLUR_THRESHOLD = 100.0  # Laplacian variance below this = blurry
DARKNESS_THRESHOLD = 50  # Average luminance below this = too dark
MIN_FRAME_SCORE = 40.0  # Minimum score to keep frame

# Scan quality label thresholds
GOOD_THRESHOLD = 70.0
FAIR_THRESHOLD = 40.0


def check_frame_quality(frame_path: Path) -> dict:
    """Assess quality of a single frame.

    Uses Laplacian variance for blur detection and average luminance
    for darkness detection per RESEARCH guidelines.

    Args:
        frame_path: Path to the frame image file.

    Returns:
        Dict with keys: blur (bool), dark (bool), score (float 0-100).
    """
    img = cv2.imread(str(frame_path))
    if img is None:
        logger.warning("Could not read frame: %s", frame_path)
        return {"blur": True, "dark": True, "score": 0.0}

    # Convert to grayscale for analysis
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Blur detection: Laplacian variance
    # Higher variance = sharper image
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    is_blurry = laplacian_var < BLUR_THRESHOLD

    # Darkness detection: average pixel luminance
    avg_luminance = float(np.mean(gray))
    is_dark = avg_luminance < DARKNESS_THRESHOLD

    # Score calculation: combine sharpness and brightness
    # Sharpness score: 0-60 points (capped at Laplacian var = 500)
    sharpness_score = min(60.0, (laplacian_var / 500.0) * 60.0)

    # Brightness score: 0-40 points (optimal range 80-180)
    if avg_luminance < DARKNESS_THRESHOLD:
        brightness_score = (avg_luminance / DARKNESS_THRESHOLD) * 20.0
    elif avg_luminance > 220:
        # Over-exposed
        brightness_score = max(0.0, (255 - avg_luminance) / 35.0 * 20.0)
    else:
        # Good range
        brightness_score = 40.0

    score = round(sharpness_score + brightness_score, 1)

    return {
        "blur": is_blurry,
        "dark": is_dark,
        "score": score,
    }


def filter_frames(
    frame_paths: list[Path],
    min_score: float = MIN_FRAME_SCORE,
) -> tuple[list[Path], list[dict]]:
    """Filter frames by quality, keeping only those above minimum score.

    Args:
        frame_paths: List of frame file paths to evaluate.
        min_score: Minimum quality score to keep a frame.

    Returns:
        Tuple of (good_frame_paths, quality_reports_for_all_frames).
    """
    good_frames: list[Path] = []
    quality_reports: list[dict] = []

    for path in frame_paths:
        report = check_frame_quality(path)
        report["path"] = str(path)
        quality_reports.append(report)

        if report["score"] >= min_score:
            good_frames.append(path)

    logger.info(
        "Quality filter: %d/%d frames passed (min_score=%.1f)",
        len(good_frames),
        len(frame_paths),
        min_score,
    )

    return good_frames, quality_reports


def compute_scan_quality(quality_reports: list[dict]) -> tuple[float, str]:
    """Compute overall scan quality score and label.

    Per SCAN-06: Score 0-100 with labels good/fair/poor.
    Thresholds: >= 70 = good, >= 40 = fair, < 40 = poor.

    Args:
        quality_reports: List of per-frame quality dicts from filter_frames.

    Returns:
        Tuple of (score 0-100, label 'good'|'fair'|'poor').
    """
    if not quality_reports:
        return 0.0, "poor"

    scores = [r["score"] for r in quality_reports]
    avg_score = sum(scores) / len(scores)

    # Factor in the percentage of frames that passed quality check
    passing_ratio = sum(1 for s in scores if s >= MIN_FRAME_SCORE) / len(scores)
    # Weighted: 70% average score + 30% passing ratio contribution
    final_score = round(avg_score * 0.7 + passing_ratio * 100 * 0.3, 1)
    final_score = min(100.0, max(0.0, final_score))

    if final_score >= GOOD_THRESHOLD:
        label = "good"
    elif final_score >= FAIR_THRESHOLD:
        label = "fair"
    else:
        label = "poor"

    return final_score, label
