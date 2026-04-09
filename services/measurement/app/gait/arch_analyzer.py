"""Arch flexibility analysis from pose landmarks over time.

Computes arch flexibility index (0-1) by analyzing foot landmark
positions during stance vs swing phases of the gait cycle.

Reference data (D-08):
    - Midfoot height decreases 15.1-18.2% under load (weight-bearing)
    - Forefoot expands 9.7-10.4% under load
    - Plantar contact area increases 11.4-23%
"""

import logging
import math

logger = logging.getLogger(__name__)

# Reference deformation percentages from D-08
MIDFOOT_DEFORMATION_MIN = 0.151  # 15.1%
MIDFOOT_DEFORMATION_MAX = 0.182  # 18.2%
MIDFOOT_DEFORMATION_MID = (MIDFOOT_DEFORMATION_MIN + MIDFOOT_DEFORMATION_MAX) / 2


def _estimate_arch_height(landmarks: dict) -> float | None:
    """Estimate relative arch height from foot landmarks.

    Uses the vertical (y) position difference between ankle and
    the midpoint of heel-to-foot_index as a proxy for arch height.

    Args:
        landmarks: Dict of landmark positions with keys like
            LEFT_ANKLE, LEFT_HEEL, LEFT_FOOT_INDEX, etc.

    Returns:
        Estimated arch height ratio, or None if landmarks missing.
    """
    # Try left foot first, then right
    for side in ("LEFT", "RIGHT"):
        ankle_key = f"{side}_ANKLE"
        heel_key = f"{side}_HEEL"
        foot_key = f"{side}_FOOT_INDEX"

        if all(k in landmarks for k in (ankle_key, heel_key, foot_key)):
            ankle = landmarks[ankle_key]
            heel = landmarks[heel_key]
            foot_index = landmarks[foot_key]

            # Midpoint of heel-to-toe on the ground plane
            mid_y = (heel["y"] + foot_index["y"]) / 2.0

            # Arch height proxy: how much higher the ankle is vs the ground midpoint
            # In MediaPipe, y increases downward, so lower y = higher position
            arch_proxy = mid_y - ankle["y"]

            # Foot length for normalization
            foot_length = math.sqrt(
                (foot_index["x"] - heel["x"]) ** 2
                + (foot_index["y"] - heel["y"]) ** 2
                + (foot_index["z"] - heel["z"]) ** 2
            )

            if foot_length > 0:
                return arch_proxy / foot_length

    return None


def compute_arch_flex_index(landmarks_over_time: list[dict]) -> float:
    """Compute arch flexibility index from landmarks over time.

    Compares arch height variation during the gait cycle.
    Higher variation indicates more flexible arches.

    The index is normalized to 0-1 range:
        0 = rigid arch (no deformation)
        1 = very flexible arch (high deformation)

    Uses weight-bearing deformation reference: midfoot height
    decreases 15.1-18.2% under load (D-08).

    Args:
        landmarks_over_time: List of frame data from detect_landmarks().
            Each frame has 'landmarks' dict with named positions.

    Returns:
        Arch flexibility index (0.0 to 1.0).
    """
    if not landmarks_over_time:
        logger.warning("No landmark data provided for arch analysis")
        return 0.5  # Default to moderate flexibility

    arch_heights: list[float] = []
    for frame in landmarks_over_time:
        lm = frame.get("landmarks", {})
        height = _estimate_arch_height(lm)
        if height is not None:
            arch_heights.append(height)

    if len(arch_heights) < 2:
        logger.warning(
            "Insufficient arch height measurements (%d), defaulting to 0.5",
            len(arch_heights),
        )
        return 0.5

    # Compute variation as coefficient of variation
    mean_height = sum(arch_heights) / len(arch_heights)
    if abs(mean_height) < 1e-6:
        return 0.5

    variance = sum((h - mean_height) ** 2 for h in arch_heights) / len(arch_heights)
    std_dev = math.sqrt(variance)
    coefficient_of_variation = std_dev / abs(mean_height)

    # Normalize to 0-1 range using reference deformation data
    # CV of ~MIDFOOT_DEFORMATION_MID (~16.6%) maps to moderate flexibility (0.5)
    # CV of 0 maps to 0 (rigid), CV >= 2*reference maps to 1.0 (very flexible)
    max_expected_cv = MIDFOOT_DEFORMATION_MAX * 2  # ~36.4%
    flex_index = min(1.0, coefficient_of_variation / max_expected_cv)

    logger.info(
        "Arch flexibility: mean_height=%.4f, CV=%.4f, flex_index=%.3f, samples=%d",
        mean_height,
        coefficient_of_variation,
        flex_index,
        len(arch_heights),
    )

    return round(flex_index, 3)
