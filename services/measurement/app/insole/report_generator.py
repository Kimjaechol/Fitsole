"""Before/after verification report generator per D-09.

Compares two SALTED sessions (initial vs verification) to quantify
the improvement from wearing custom insoles. Reports peak pressure
reduction, contact area increase, and per-zone comparisons.

T-03-17: Both sessions validated against user_id (IDOR prevention).
"""

from __future__ import annotations

import logging
from typing import List

from app.salted.models import (
    SaltedPressureFrame,
    VerificationReport,
    ZoneComparison,
)
from app.salted.session_manager import get_session

logger = logging.getLogger(__name__)

# Grid dimensions (matching biomechanical.py)
GRID_ROWS = 20
GRID_COLS = 10
SENSOR_COUNT = GRID_ROWS * GRID_COLS

# Zone row boundaries
HEEL_END = 6       # rows 0-5: hindfoot
MIDFOOT_END = 14   # rows 6-13: midfoot
                    # rows 14-19: forefoot

# Contact area threshold (sensor values above this count as "in contact")
CONTACT_THRESHOLD = 10.0

# D-09 success targets
PEAK_REDUCTION_TARGET = 30.0   # >=30% peak pressure reduction
AREA_INCREASE_TARGET = 40.0    # >=40% contact area increase


def generate_verification_report(
    initial_session_id: str,
    verification_session_id: str,
    user_id: str,
) -> VerificationReport:
    """Generate before/after verification report.

    Args:
        initial_session_id: UUID of the initial (pre-insole) session.
        verification_session_id: UUID of the verification (post-insole) session.
        user_id: Authenticated user ID for IDOR check (T-03-17).

    Returns:
        VerificationReport with comparison metrics and success flag.

    Raises:
        ValueError: If either session not found or not owned by user_id.
    """
    # Fetch both sessions with IDOR check (T-03-17)
    initial_session = get_session(initial_session_id, user_id)
    if initial_session is None:
        raise ValueError(
            f"Session {initial_session_id} not found or not owned by user {user_id}"
        )

    verification_session = get_session(verification_session_id, user_id)
    if verification_session is None:
        raise ValueError(
            f"Session {verification_session_id} not found or not owned by user {user_id}"
        )

    # Parse frames from stored session data
    initial_frames = _parse_stored_frames(initial_session)
    verification_frames = _parse_stored_frames(verification_session)

    # Calculate metrics
    initial_peak = _calculate_peak_pressure(initial_frames)
    verification_peak = _calculate_peak_pressure(verification_frames)

    initial_area = _calculate_contact_area(initial_frames)
    verification_area = _calculate_contact_area(verification_frames)

    # Peak pressure reduction percentage
    if initial_peak > 0:
        peak_reduction = (initial_peak - verification_peak) / initial_peak * 100.0
    else:
        peak_reduction = 0.0

    # Contact area increase percentage
    if initial_area > 0:
        area_increase = (verification_area - initial_area) / initial_area * 100.0
    else:
        area_increase = 0.0

    # Zone comparisons
    zone_comparisons = _compare_zones(initial_frames, verification_frames)

    # Success flag per D-09
    success = (
        peak_reduction >= PEAK_REDUCTION_TARGET
        and area_increase >= AREA_INCREASE_TARGET
    )

    logger.info(
        "Verification report: peak_reduction=%.1f%%, area_increase=%.1f%%, success=%s",
        peak_reduction,
        area_increase,
        success,
    )

    return VerificationReport(
        initial_session_id=initial_session_id,
        verification_session_id=verification_session_id,
        peak_pressure_reduction_pct=round(peak_reduction, 2),
        contact_area_increase_pct=round(area_increase, 2),
        zone_comparisons=zone_comparisons,
        success=success,
    )


def _parse_stored_frames(session: dict) -> List[SaltedPressureFrame]:
    """Parse stored frame dicts back into SaltedPressureFrame models."""
    raw_frames = session.get("frames", [])
    return [SaltedPressureFrame(**f) for f in raw_frames]


def _calculate_peak_pressure(frames: List[SaltedPressureFrame]) -> float:
    """Calculate max pressure value across all frames.

    Returns the single highest pressure reading found in any frame.
    """
    peak = 0.0
    for frame in frames:
        if frame.pressure_array:
            frame_max = max(frame.pressure_array)
            if frame_max > peak:
                peak = frame_max
    return peak


def _calculate_contact_area(frames: List[SaltedPressureFrame]) -> float:
    """Calculate average contact area across frames.

    Contact area = count of sensor points above CONTACT_THRESHOLD,
    normalized to [0, 1] range (fraction of total sensors).
    """
    if not frames:
        return 0.0

    total_area = 0.0
    valid_count = 0

    for frame in frames:
        pa = frame.pressure_array
        if len(pa) < SENSOR_COUNT:
            continue
        active = sum(1 for v in pa if v > CONTACT_THRESHOLD)
        total_area += active / SENSOR_COUNT
        valid_count += 1

    if valid_count == 0:
        return 0.0

    return total_area / valid_count


def _compare_zones(
    initial_frames: List[SaltedPressureFrame],
    verification_frames: List[SaltedPressureFrame],
) -> List[ZoneComparison]:
    """Compare average pressure per zone between initial and verification sessions.

    Zones: forefoot, midfoot, hindfoot (row-based), medial, lateral (column-based).
    """
    initial_zones = _calculate_zone_averages(initial_frames)
    verification_zones = _calculate_zone_averages(verification_frames)

    comparisons = []
    for zone_name in ["forefoot", "midfoot", "hindfoot", "medial", "lateral"]:
        before = initial_zones.get(zone_name, 0.0)
        after = verification_zones.get(zone_name, 0.0)

        if before > 0:
            improvement = (before - after) / before * 100.0
        else:
            improvement = 0.0

        comparisons.append(
            ZoneComparison(
                zone=zone_name,
                before=round(before, 2),
                after=round(after, 2),
                improvement=round(improvement, 2),
            )
        )

    return comparisons


def _calculate_zone_averages(
    frames: List[SaltedPressureFrame],
) -> dict[str, float]:
    """Calculate average pressure per zone across all frames."""
    zone_sums: dict[str, float] = {
        "forefoot": 0.0,
        "midfoot": 0.0,
        "hindfoot": 0.0,
        "medial": 0.0,
        "lateral": 0.0,
    }
    zone_counts: dict[str, int] = {k: 0 for k in zone_sums}

    for frame in frames:
        pa = frame.pressure_array
        if len(pa) < SENSOR_COUNT:
            continue

        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                val = pa[r * GRID_COLS + c]

                # Row-based zones
                if r < HEEL_END:
                    zone_sums["hindfoot"] += val
                    zone_counts["hindfoot"] += 1
                elif r < MIDFOOT_END:
                    zone_sums["midfoot"] += val
                    zone_counts["midfoot"] += 1
                else:
                    zone_sums["forefoot"] += val
                    zone_counts["forefoot"] += 1

                # Column-based zones
                if c < GRID_COLS // 2:
                    zone_sums["medial"] += val
                    zone_counts["medial"] += 1
                else:
                    zone_sums["lateral"] += val
                    zone_counts["lateral"] += 1

    result = {}
    for zone_name in zone_sums:
        if zone_counts[zone_name] > 0:
            result[zone_name] = zone_sums[zone_name] / zone_counts[zone_name]
        else:
            result[zone_name] = 0.0

    return result
