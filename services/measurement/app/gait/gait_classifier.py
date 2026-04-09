"""Gait pattern classification from ankle angle data.

Classifies walking pattern as normal, overpronation, or supination
based on ankle angle measurements over the gait cycle.

Classification thresholds (per D-07, D-12):
    - Normal: mean pronation within +/- 4 degrees of neutral
    - Overpronation: mean pronation > 4 degrees inward
    - Supination: mean pronation > 4 degrees outward
"""

import logging

logger = logging.getLogger(__name__)

# Classification threshold in degrees
PRONATION_THRESHOLD = 4.0


def classify_gait(ankle_angles: list[dict]) -> str:
    """Classify gait pattern from ankle angle measurements.

    Analyzes ankle pronation angle patterns over the gait cycle.
    Uses the mean pronation angle across all frames for both feet.

    Args:
        ankle_angles: List of per-frame ankle angle dicts from compute_ankle_angles().
            Each dict has left_pronation and right_pronation in degrees.

    Returns:
        Gait pattern classification: 'normal', 'overpronation', or 'supination'.
    """
    if not ankle_angles:
        logger.warning("No ankle angle data provided, defaulting to 'normal'")
        return "normal"

    # Collect all pronation angles (both feet)
    pronation_values: list[float] = []
    for frame in ankle_angles:
        left = frame.get("left_pronation", 0.0)
        right = frame.get("right_pronation", 0.0)
        if left != 0.0:
            pronation_values.append(left)
        if right != 0.0:
            pronation_values.append(right)

    if not pronation_values:
        logger.warning("No valid pronation values found, defaulting to 'normal'")
        return "normal"

    mean_pronation = sum(pronation_values) / len(pronation_values)

    logger.info(
        "Gait classification: mean_pronation=%.2f deg, samples=%d",
        mean_pronation,
        len(pronation_values),
    )

    # Positive pronation = inward roll (overpronation)
    # Negative pronation = outward roll (supination)
    if mean_pronation > PRONATION_THRESHOLD:
        return "overpronation"
    elif mean_pronation < -PRONATION_THRESHOLD:
        return "supination"
    else:
        return "normal"


def compute_pronation_supination(ankle_angles: list[dict]) -> str:
    """Compute ankle alignment classification.

    Returns ankle alignment as neutral, pronation, or supination
    based on mean ankle alignment angle.

    Args:
        ankle_angles: List of per-frame ankle angle dicts from compute_ankle_angles().

    Returns:
        Ankle alignment: 'neutral', 'pronation', or 'supination'.
    """
    if not ankle_angles:
        return "neutral"

    pronation_values: list[float] = []
    for frame in ankle_angles:
        left = frame.get("left_pronation", 0.0)
        right = frame.get("right_pronation", 0.0)
        if left != 0.0:
            pronation_values.append(left)
        if right != 0.0:
            pronation_values.append(right)

    if not pronation_values:
        return "neutral"

    mean_pronation = sum(pronation_values) / len(pronation_values)

    if mean_pronation > PRONATION_THRESHOLD:
        return "pronation"
    elif mean_pronation < -PRONATION_THRESHOLD:
        return "supination"
    else:
        return "neutral"
