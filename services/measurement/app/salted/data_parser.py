"""
SALTED data parser: converts raw BLE data to validated Pydantic models.
Includes session validation with pressure range checks (T-03-11).
"""

from __future__ import annotations

import logging
from typing import List, Tuple

from app.salted.models import SaltedPressureFrame

logger = logging.getLogger(__name__)

# T-03-11: Maximum valid pressure value in kPa
MAX_PRESSURE_KPA = 1000.0

# T-03-13: Maximum allowed frame count (DoS mitigation)
MAX_FRAME_COUNT = 500_000

# T-03-13: Maximum session duration in seconds
MAX_DURATION_S = 600.0

# Percentage of frames with anomalous readings to flag session
ANOMALY_THRESHOLD_PCT = 50.0


def parse_pressure_frames(raw_data: List[dict]) -> List[SaltedPressureFrame]:
    """Convert raw BLE frame dicts to validated Pydantic models.

    Args:
        raw_data: List of dicts with timestamp, pressure_array, imu_data fields.

    Returns:
        List of validated SaltedPressureFrame models.
    """
    if not raw_data:
        return []

    frames = []
    for raw in raw_data:
        frame = SaltedPressureFrame(**raw)
        frames.append(frame)

    return frames


def validate_session_data(
    frames: List[SaltedPressureFrame],
    min_duration_s: float = 240.0,
) -> Tuple[bool, str]:
    """Validate session data has enough data and reasonable pressure values.

    Args:
        frames: List of pressure frames to validate.
        min_duration_s: Minimum required session duration in seconds (default 4 min).

    Returns:
        Tuple of (is_valid, message).
    """
    if not frames:
        return False, "No frames provided"

    # T-03-13: Check frame count limit
    if len(frames) > MAX_FRAME_COUNT:
        return False, f"Frame count {len(frames)} exceeds maximum {MAX_FRAME_COUNT}"

    # Check session duration from timestamps
    timestamps = [f.timestamp for f in frames]
    duration_ms = max(timestamps) - min(timestamps)
    duration_s = duration_ms / 1000.0

    # T-03-13: Check max duration
    if duration_s > MAX_DURATION_S:
        return False, f"Session duration {duration_s:.1f}s exceeds maximum {MAX_DURATION_S}s"

    # Check minimum duration
    if duration_s < min_duration_s:
        return False, (
            f"Session duration too short: {duration_s:.1f}s "
            f"(minimum {min_duration_s:.1f}s required)"
        )

    # T-03-11: Check for anomalous pressure values
    anomalous_count = 0
    for frame in frames:
        if any(v > MAX_PRESSURE_KPA for v in frame.pressure_array):
            anomalous_count += 1

    if anomalous_count > 0:
        anomaly_pct = (anomalous_count / len(frames)) * 100.0
        if anomaly_pct > ANOMALY_THRESHOLD_PCT:
            return False, (
                f"Anomalous pressure readings: {anomaly_pct:.1f}% of frames "
                f"exceed {MAX_PRESSURE_KPA} kPa threshold"
            )
        else:
            # Return valid but with warning
            return True, (
                f"Warning: anomalous pressure in {anomaly_pct:.1f}% of frames "
                f"(flagged, but below {ANOMALY_THRESHOLD_PCT}% threshold)"
            )

    return True, "Session data valid"
