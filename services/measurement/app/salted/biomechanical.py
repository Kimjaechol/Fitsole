"""
Biomechanical analysis engine for SALTED smart insole pressure data.
Per D-07: extracts landing pattern, pronation, COP trajectory,
arch flexibility, and weight distribution from pressure frame sequences.
"""

from __future__ import annotations

import logging
import math
from typing import List, Tuple

from app.salted.models import (
    ArchFlexibility,
    BiomechanicalAnalysis,
    CopPoint,
    SaltedPressureFrame,
    WeightDistribution,
)

logger = logging.getLogger(__name__)

# Grid dimensions: 20 rows x 10 cols (matching mock provider)
GRID_ROWS = 20
GRID_COLS = 10

# Region boundaries (row indices)
# Rows 0-5: hindfoot (heel), Rows 6-13: midfoot, Rows 14-19: forefoot
HEEL_END = 6      # exclusive
MIDFOOT_END = 14  # exclusive

# Threshold for landing pattern classification
DOMINANT_THRESHOLD = 0.60  # 60%


def analyze_biomechanics(
    frames: List[SaltedPressureFrame],
) -> BiomechanicalAnalysis:
    """Run full biomechanical analysis on a sequence of pressure frames.

    Args:
        frames: List of pressure frames from a SALTED walking session.

    Returns:
        BiomechanicalAnalysis with landing pattern, pronation, COP, etc.
    """
    if not frames:
        raise ValueError("No frames provided for analysis")

    landing_pattern = _detect_landing_pattern(frames)
    pronation_degree = _calculate_pronation(frames)
    cop_trajectory = _extract_cop_trajectory(frames)
    arch_flex = _calculate_arch_flexibility(frames)
    weight_dist = _calculate_weight_distribution(frames)

    return BiomechanicalAnalysis(
        landing_pattern=landing_pattern,
        pronation_degree=pronation_degree,
        cop_trajectory=cop_trajectory,
        arch_flexibility=arch_flex,
        weight_distribution=weight_dist,
    )


def _detect_landing_pattern(
    frames: List[SaltedPressureFrame],
) -> str:
    """Detect landing pattern from initial contact pressure distribution.

    Analyzes pressure distribution across heel/midfoot/forefoot regions.
    Heel >60% = heel_strike, forefoot >60% = forefoot_strike, else midfoot_strike.
    """
    total_heel = 0.0
    total_mid = 0.0
    total_fore = 0.0

    for frame in frames:
        pa = frame.pressure_array
        if len(pa) < GRID_ROWS * GRID_COLS:
            continue

        heel_sum = sum(pa[r * GRID_COLS + c] for r in range(HEEL_END) for c in range(GRID_COLS))
        mid_sum = sum(pa[r * GRID_COLS + c] for r in range(HEEL_END, MIDFOOT_END) for c in range(GRID_COLS))
        fore_sum = sum(pa[r * GRID_COLS + c] for r in range(MIDFOOT_END, GRID_ROWS) for c in range(GRID_COLS))

        total_heel += heel_sum
        total_mid += mid_sum
        total_fore += fore_sum

    grand_total = total_heel + total_mid + total_fore
    if grand_total == 0:
        return "midfoot_strike"

    heel_pct = total_heel / grand_total
    fore_pct = total_fore / grand_total

    if heel_pct >= DOMINANT_THRESHOLD:
        return "heel_strike"
    elif fore_pct >= DOMINANT_THRESHOLD:
        return "forefoot_strike"
    else:
        return "midfoot_strike"


def _calculate_pronation(frames: List[SaltedPressureFrame]) -> float:
    """Calculate pronation degree from COP medial-lateral deviation.

    Positive = pronation (medial shift), negative = supination (lateral shift).
    Returns angle in degrees.
    """
    medial_total = 0.0
    lateral_total = 0.0

    for frame in frames:
        pa = frame.pressure_array
        if len(pa) < GRID_ROWS * GRID_COLS:
            continue

        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                val = pa[r * GRID_COLS + c]
                if c < GRID_COLS // 2:
                    medial_total += val
                else:
                    lateral_total += val

    total = medial_total + lateral_total
    if total == 0:
        return 0.0

    # Calculate medial-lateral imbalance ratio
    medial_ratio = medial_total / total
    # Center at 0.5: >0.5 = pronation, <0.5 = supination
    deviation = medial_ratio - 0.5

    # Map deviation to degrees (max ~15 degrees at full medial/lateral)
    # deviation of 0.1 (~10% imbalance) -> ~3 degrees
    pronation_degrees = deviation * 30.0

    # Clamp to reasonable range
    return max(-30.0, min(30.0, round(pronation_degrees, 2)))


def _extract_cop_trajectory(
    frames: List[SaltedPressureFrame],
) -> List[CopPoint]:
    """Extract center of pressure trajectory over time.

    Returns normalized (x, y) coordinates where x=0..1 (medial-lateral)
    and y=0..1 (heel-toe).
    """
    trajectory = []

    # Subsample for trajectory (every 10th frame to keep data manageable)
    step = max(1, len(frames) // 100)

    for i in range(0, len(frames), step):
        frame = frames[i]
        x, y = _calculate_cop(frame.pressure_array)
        trajectory.append(CopPoint(x=x, y=y, t=frame.timestamp))

    return trajectory


def _calculate_cop(pressure_array: List[float]) -> Tuple[float, float]:
    """Calculate center of pressure from pressure array.

    Returns normalized (x, y) coordinates in [0, 1].
    """
    if len(pressure_array) < GRID_ROWS * GRID_COLS:
        return 0.5, 0.5

    total_pressure = 0.0
    weighted_x = 0.0
    weighted_y = 0.0

    for r in range(GRID_ROWS):
        for c in range(GRID_COLS):
            val = pressure_array[r * GRID_COLS + c]
            if val > 0:
                total_pressure += val
                weighted_x += val * (c / (GRID_COLS - 1))
                weighted_y += val * (r / (GRID_ROWS - 1))

    if total_pressure == 0:
        return 0.5, 0.5

    cop_x = weighted_x / total_pressure
    cop_y = weighted_y / total_pressure

    # Clamp to [0, 1]
    cop_x = max(0.0, min(1.0, round(cop_x, 4)))
    cop_y = max(0.0, min(1.0, round(cop_y, 4)))

    return cop_x, cop_y


def _detect_gait_cycles(
    frames: List[SaltedPressureFrame],
) -> List[Tuple[int, int]]:
    """Identify individual gait cycles (heel strike to heel strike).

    Returns list of (start_index, end_index) tuples.
    """
    if len(frames) < 10:
        return [(0, len(frames) - 1)]

    # Detect heel strikes by finding frames where heel pressure spikes
    heel_pressures = []
    for frame in frames:
        pa = frame.pressure_array
        if len(pa) >= GRID_ROWS * GRID_COLS:
            heel_sum = sum(pa[r * GRID_COLS + c] for r in range(HEEL_END) for c in range(GRID_COLS))
        else:
            heel_sum = 0.0
        heel_pressures.append(heel_sum)

    # Find local maxima in heel pressure (heel strikes)
    mean_heel = sum(heel_pressures) / len(heel_pressures) if heel_pressures else 0
    threshold = mean_heel * 1.3  # 30% above mean

    strike_indices = []
    for i in range(1, len(heel_pressures) - 1):
        if (
            heel_pressures[i] > threshold
            and heel_pressures[i] >= heel_pressures[i - 1]
            and heel_pressures[i] >= heel_pressures[i + 1]
        ):
            # Minimum distance between strikes (at least 50 frames at 100Hz = 0.5s)
            if not strike_indices or (i - strike_indices[-1]) > 50:
                strike_indices.append(i)

    # Convert to gait cycles
    cycles = []
    for j in range(len(strike_indices) - 1):
        cycles.append((strike_indices[j], strike_indices[j + 1]))

    if not cycles:
        return [(0, len(frames) - 1)]

    return cycles


def _calculate_arch_flexibility(
    frames: List[SaltedPressureFrame],
) -> ArchFlexibility:
    """Calculate arch flexibility by comparing static vs dynamic arch index.

    Arch index = midfoot pressure / total pressure.
    Static: average across all frames. Dynamic: variance during gait.
    """
    arch_indices = []

    for frame in frames:
        pa = frame.pressure_array
        if len(pa) < GRID_ROWS * GRID_COLS:
            continue

        mid_sum = sum(pa[r * GRID_COLS + c] for r in range(HEEL_END, MIDFOOT_END) for c in range(GRID_COLS))
        total_sum = sum(pa)
        if total_sum > 0:
            arch_indices.append(mid_sum / total_sum)

    if not arch_indices:
        return ArchFlexibility(static_index=0.0, dynamic_index=0.0)

    # Static index: mean arch index
    static_index = sum(arch_indices) / len(arch_indices)

    # Dynamic index: standard deviation (higher = more flexible arch)
    if len(arch_indices) > 1:
        mean = static_index
        variance = sum((ai - mean) ** 2 for ai in arch_indices) / len(arch_indices)
        dynamic_index = math.sqrt(variance)
    else:
        dynamic_index = 0.0

    return ArchFlexibility(
        static_index=round(static_index, 4),
        dynamic_index=round(dynamic_index, 4),
    )


def _calculate_weight_distribution(
    frames: List[SaltedPressureFrame],
) -> WeightDistribution:
    """Calculate average forefoot/midfoot/hindfoot pressure percentages.

    Percentages should sum to ~100%.
    """
    total_fore = 0.0
    total_mid = 0.0
    total_heel = 0.0

    valid_frames = 0
    for frame in frames:
        pa = frame.pressure_array
        if len(pa) < GRID_ROWS * GRID_COLS:
            continue

        heel_sum = sum(pa[r * GRID_COLS + c] for r in range(HEEL_END) for c in range(GRID_COLS))
        mid_sum = sum(pa[r * GRID_COLS + c] for r in range(HEEL_END, MIDFOOT_END) for c in range(GRID_COLS))
        fore_sum = sum(pa[r * GRID_COLS + c] for r in range(MIDFOOT_END, GRID_ROWS) for c in range(GRID_COLS))

        frame_total = heel_sum + mid_sum + fore_sum
        if frame_total > 0:
            total_heel += (heel_sum / frame_total) * 100.0
            total_mid += (mid_sum / frame_total) * 100.0
            total_fore += (fore_sum / frame_total) * 100.0
            valid_frames += 1

    if valid_frames == 0:
        return WeightDistribution(forefoot=33.3, midfoot=33.3, hindfoot=33.4)

    return WeightDistribution(
        forefoot=round(total_fore / valid_frames, 2),
        midfoot=round(total_mid / valid_frames, 2),
        hindfoot=round(total_heel / valid_frames, 2),
    )
