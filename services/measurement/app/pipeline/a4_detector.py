"""A4 paper detection and scale calibration module.

Detects A4 paper (297mm x 210mm) in video frames using contour detection
to establish pixel-to-mm calibration factor (D-02, SCAN-02).
"""

import logging
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# A4 paper dimensions in mm (ISO 216)
A4_WIDTH_MM = 210.0
A4_HEIGHT_MM = 297.0
A4_ASPECT_RATIO = A4_HEIGHT_MM / A4_WIDTH_MM  # ~1.414

# Aspect ratio tolerance range for A4 detection
A4_ASPECT_RATIO_MIN = 1.3
A4_ASPECT_RATIO_MAX = 1.55

# Minimum contour area as fraction of image area (avoid noise)
MIN_CONTOUR_AREA_RATIO = 0.02
MAX_CONTOUR_AREA_RATIO = 0.6


def detect_a4_paper(frame: np.ndarray) -> tuple[np.ndarray, float] | None:
    """Detect A4 paper in a single frame and compute pixel-to-mm scale.

    Per RESEARCH Pattern 2: grayscale -> GaussianBlur -> Canny edges ->
    findContours -> filter by 4 corners + A4 aspect ratio.

    Args:
        frame: BGR image as numpy array (from cv2.imread).

    Returns:
        Tuple of (corner_points as 4x2 array, pixels_per_mm) or None if not detected.
    """
    if frame is None or frame.size == 0:
        return None

    height, width = frame.shape[:2]
    image_area = height * width

    # Convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Canny edge detection
    edges = cv2.Canny(blurred, 50, 150)

    # Dilate edges to close gaps
    kernel = np.ones((3, 3), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)

    # Find contours
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    best_match: tuple[np.ndarray, float] | None = None
    best_area = 0

    for contour in contours:
        area = cv2.contourArea(contour)

        # Filter by area ratio
        area_ratio = area / image_area
        if area_ratio < MIN_CONTOUR_AREA_RATIO or area_ratio > MAX_CONTOUR_AREA_RATIO:
            continue

        # Approximate contour to polygon
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)

        # Must have exactly 4 corners (rectangle)
        if len(approx) != 4:
            continue

        # Check if it's roughly convex
        if not cv2.isContourConvex(approx):
            continue

        # Compute bounding rectangle and check aspect ratio
        corners = approx.reshape(4, 2).astype(np.float64)

        # Calculate side lengths
        sides = []
        for i in range(4):
            p1 = corners[i]
            p2 = corners[(i + 1) % 4]
            sides.append(np.linalg.norm(p2 - p1))

        # Sort sides: 2 shorter (width) and 2 longer (height)
        sides_sorted = sorted(sides)
        short_side = (sides_sorted[0] + sides_sorted[1]) / 2
        long_side = (sides_sorted[2] + sides_sorted[3]) / 2

        if short_side == 0:
            continue

        aspect_ratio = long_side / short_side

        # Check A4 aspect ratio within tolerance
        if A4_ASPECT_RATIO_MIN <= aspect_ratio <= A4_ASPECT_RATIO_MAX:
            if area > best_area:
                # Compute pixels_per_mm using the longer side (297mm)
                pixels_per_mm = long_side / A4_HEIGHT_MM
                best_match = (corners, pixels_per_mm)
                best_area = area

    if best_match is not None:
        corners, ppmm = best_match
        logger.info(
            "A4 paper detected: pixels_per_mm=%.3f, corners=%s",
            ppmm,
            corners.tolist(),
        )

    return best_match


def calibrate_from_frames(frame_paths: list[Path]) -> float | None:
    """Attempt A4 detection on initial frames and return median scale factor.

    Tries the first 5 frames for A4 paper detection and returns
    the median pixels_per_mm value for robustness.

    Per D-19: Returns None if A4 not detected (triggers re-scan prompt).

    Args:
        frame_paths: List of frame file paths (will try first 5).

    Returns:
        Median pixels_per_mm value, or None if A4 not detected in any frame.
    """
    candidates = frame_paths[:5]
    detected_scales: list[float] = []

    for path in candidates:
        frame = cv2.imread(str(path))
        if frame is None:
            continue

        result = detect_a4_paper(frame)
        if result is not None:
            _, ppmm = result
            detected_scales.append(ppmm)

    if not detected_scales:
        logger.warning("A4 paper not detected in any of %d frames", len(candidates))
        return None

    median_ppmm = float(np.median(detected_scales))
    logger.info(
        "A4 calibration: detected in %d/%d frames, median pixels_per_mm=%.3f",
        len(detected_scales),
        len(candidates),
        median_ppmm,
    )

    return median_ppmm
