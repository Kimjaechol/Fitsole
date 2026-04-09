"""Pressure distribution estimation from biometric inputs.

Rule-based heuristic model that estimates plantar pressure distribution
using weight, foot dimensions, arch height, gender, and age.

Per D-09: AI-estimated pressure distribution (no physical sensors for online users).
Per RESEARCH Open Question 3: Start with rule-based heuristic model using known
pressure distribution patterns for arch types.

Arch type classification from arch_height:
    - Low arch (flat foot): < 15mm -> higher medial pressure
    - Normal arch: 15-30mm -> balanced pressure
    - High arch: > 30mm -> higher lateral and heel pressure
"""

import logging
import math

logger = logging.getLogger(__name__)

# Pressure grid dimensions (plantar surface approximation)
GRID_ROWS = 20  # Heel to toe (longitudinal)
GRID_COLS = 10  # Medial to lateral (transverse)

# Arch height thresholds (mm)
LOW_ARCH_THRESHOLD = 15.0
HIGH_ARCH_THRESHOLD = 30.0

# Zone definitions on 20x10 grid
# Rows 0-5: rearfoot (heel), 6-12: midfoot, 13-19: forefoot
ZONE_REARFOOT = (0, 6)
ZONE_MIDFOOT = (6, 13)
ZONE_FOREFOOT = (13, 20)

# Base pressure distribution percentages (normal arch)
BASE_FOREFOOT_PCT = 0.40
BASE_MIDFOOT_PCT = 0.15
BASE_REARFOOT_PCT = 0.45


def _classify_arch_type(arch_height: float) -> str:
    """Classify arch type from arch height measurement.

    Args:
        arch_height: Arch height in mm.

    Returns:
        'low', 'normal', or 'high'.
    """
    if arch_height < LOW_ARCH_THRESHOLD:
        return "low"
    elif arch_height > HIGH_ARCH_THRESHOLD:
        return "high"
    return "normal"


def _apply_arch_adjustments(
    base_grid: list[list[float]], arch_type: str
) -> list[list[float]]:
    """Adjust pressure grid based on arch type.

    Low arch (flat foot): higher medial pressure, more midfoot contact.
    High arch: higher lateral and heel pressure, less midfoot contact.

    Args:
        base_grid: 20x10 pressure grid.
        arch_type: 'low', 'normal', or 'high'.

    Returns:
        Adjusted pressure grid.
    """
    grid = [row[:] for row in base_grid]  # Deep copy

    if arch_type == "low":
        # Flat foot: increased medial midfoot pressure
        for r in range(ZONE_MIDFOOT[0], ZONE_MIDFOOT[1]):
            for c in range(GRID_COLS):
                # Medial side (columns 0-4) gets more pressure
                if c < GRID_COLS // 2:
                    grid[r][c] *= 1.6
                else:
                    grid[r][c] *= 1.2
        # Slight reduction in heel peak
        for r in range(ZONE_REARFOOT[0], ZONE_REARFOOT[1]):
            for c in range(GRID_COLS):
                grid[r][c] *= 0.9

    elif arch_type == "high":
        # High arch: reduced midfoot contact, higher heel and lateral forefoot
        for r in range(ZONE_MIDFOOT[0], ZONE_MIDFOOT[1]):
            for c in range(GRID_COLS):
                grid[r][c] *= 0.3  # Much less midfoot contact
        # Increase heel pressure
        for r in range(ZONE_REARFOOT[0], ZONE_REARFOOT[1]):
            for c in range(GRID_COLS):
                grid[r][c] *= 1.3
        # Increase lateral forefoot pressure
        for r in range(ZONE_FOREFOOT[0], ZONE_FOREFOOT[1]):
            for c in range(GRID_COLS // 2, GRID_COLS):
                grid[r][c] *= 1.3

    return grid


def _apply_weight_adjustment(
    grid: list[list[float]], weight: float
) -> list[list[float]]:
    """Scale pressure proportionally to body weight.

    Heavier weight increases forefoot and heel pressure proportionally.
    Reference: 70kg as baseline weight.

    Args:
        grid: Pressure grid.
        weight: Body weight in kg.

    Returns:
        Weight-adjusted pressure grid.
    """
    baseline_weight = 70.0
    weight_factor = weight / baseline_weight

    return [
        [cell * weight_factor for cell in row]
        for row in grid
    ]


def _apply_gender_adjustment(
    grid: list[list[float]], gender: str
) -> list[list[float]]:
    """Adjust pressure based on gender.

    Female feet typically have narrower heels relative to forefoot,
    concentrating heel pressure more centrally.

    Args:
        grid: Pressure grid.
        gender: 'male', 'female', or 'other'.

    Returns:
        Gender-adjusted pressure grid.
    """
    if gender.lower() != "female":
        return grid

    adjusted = [row[:] for row in grid]

    # Narrow heel: concentrate pressure toward center columns
    for r in range(ZONE_REARFOOT[0], ZONE_REARFOOT[1]):
        for c in range(GRID_COLS):
            center_dist = abs(c - GRID_COLS / 2) / (GRID_COLS / 2)
            # Reduce edges, increase center
            adjusted[r][c] *= 1.0 - (center_dist * 0.3) + 0.15

    # Wider forefoot relative to heel
    for r in range(ZONE_FOREFOOT[0], ZONE_FOREFOOT[1]):
        for c in range(GRID_COLS):
            adjusted[r][c] *= 1.05

    return adjusted


def _apply_age_adjustment(
    grid: list[list[float]], age: float
) -> list[list[float]]:
    """Adjust pressure based on age.

    Older adults tend to have flatter arches and wider forefeet,
    increasing midfoot and forefoot pressure.

    Args:
        grid: Pressure grid.
        age: Age in years.

    Returns:
        Age-adjusted pressure grid.
    """
    if age < 40:
        return grid

    adjusted = [row[:] for row in grid]

    # Progressive flattening effect with age
    age_factor = min(1.0, (age - 40) / 40)  # 0 at 40, 1 at 80+

    # Increase midfoot pressure (flatter arch)
    for r in range(ZONE_MIDFOOT[0], ZONE_MIDFOOT[1]):
        for c in range(GRID_COLS):
            adjusted[r][c] *= 1.0 + (age_factor * 0.4)

    # Slightly wider forefoot contact
    for r in range(ZONE_FOREFOOT[0], ZONE_FOREFOOT[1]):
        for c in range(GRID_COLS):
            adjusted[r][c] *= 1.0 + (age_factor * 0.15)

    return adjusted


def _generate_base_grid(
    foot_length: float, ball_width: float
) -> list[list[float]]:
    """Generate base pressure grid with anatomical distribution.

    Creates a 20x10 grid representing the plantar surface with
    realistic pressure distribution based on foot dimensions.

    Args:
        foot_length: Foot length in mm.
        ball_width: Ball (forefoot) width in mm.

    Returns:
        Base pressure grid (20x10) with values 0-1.
    """
    grid: list[list[float]] = [[0.0] * GRID_COLS for _ in range(GRID_ROWS)]

    # Width ratio affects lateral pressure spread
    width_ratio = ball_width / foot_length if foot_length > 0 else 0.38

    for r in range(GRID_ROWS):
        for c in range(GRID_COLS):
            # Normalized positions
            row_norm = r / (GRID_ROWS - 1)  # 0=heel, 1=toe
            col_norm = c / (GRID_COLS - 1)  # 0=medial, 1=lateral
            col_center = abs(col_norm - 0.5) * 2  # 0=center, 1=edge

            pressure = 0.0

            # Rearfoot (heel) zone
            if r < ZONE_REARFOOT[1]:
                # Heel has concentrated central pressure
                heel_center = math.exp(-(col_center ** 2) / 0.5)
                heel_longitudinal = math.exp(-((row_norm - 0.15) ** 2) / 0.02)
                pressure = BASE_REARFOOT_PCT * heel_center * heel_longitudinal * 2.5

            # Midfoot zone
            elif r < ZONE_MIDFOOT[1]:
                # Midfoot has lower pressure, slight lateral bias
                mid_factor = 0.3 + 0.4 * (1 - col_center)
                pressure = BASE_MIDFOOT_PCT * mid_factor

            # Forefoot zone
            else:
                # Forefoot: metatarsal heads have peak pressure
                # 1st and 5th metatarsal heads as peaks
                met_peaks = [0.2, 0.45, 0.55, 0.7, 0.85]
                met_pressure = 0.0
                for peak_pos in met_peaks:
                    dist = abs(col_norm - peak_pos)
                    met_pressure += math.exp(-(dist ** 2) / 0.01)

                # Toe region (last 3 rows)
                if r >= GRID_ROWS - 3:
                    toe_factor = 0.4
                    pressure = BASE_FOREFOOT_PCT * met_pressure * toe_factor * 0.5
                else:
                    pressure = BASE_FOREFOOT_PCT * met_pressure * 0.6

            # Apply width ratio scaling
            pressure *= 0.8 + width_ratio

            grid[r][c] = max(0.0, pressure)

    return grid


def estimate_pressure(
    weight: float,
    foot_length: float,
    ball_width: float,
    arch_height: float,
    gender: str,
    age: float,
) -> dict:
    """Estimate plantar pressure distribution from biometric inputs.

    Rule-based heuristic model using known pressure distribution patterns
    for different arch types, with adjustments for weight, gender, and age.

    Args:
        weight: Body weight in kg.
        foot_length: Foot length in mm.
        ball_width: Ball (forefoot) width in mm.
        arch_height: Arch height in mm.
        gender: 'male', 'female', or 'other'.
        age: Age in years.

    Returns:
        Dict with:
            - pressureGrid: 2D array (20x10) representing plantar surface
            - peakPressureZones: list of {x, y, intensity, label}
            - overallDistribution: {forefoot_pct, midfoot_pct, rearfoot_pct}
    """
    # Classify arch type
    arch_type = _classify_arch_type(arch_height)

    logger.info(
        "Estimating pressure: weight=%.1fkg, foot=%.1fmm, arch=%.1fmm (%s), gender=%s, age=%.0f",
        weight, foot_length, arch_height, arch_type, gender, age,
    )

    # Generate base anatomical pressure grid
    grid = _generate_base_grid(foot_length, ball_width)

    # Apply adjustments in order
    grid = _apply_arch_adjustments(grid, arch_type)
    grid = _apply_weight_adjustment(grid, weight)
    grid = _apply_gender_adjustment(grid, gender)
    grid = _apply_age_adjustment(grid, age)

    # Calculate overall distribution percentages
    total_pressure = sum(sum(row) for row in grid)
    if total_pressure == 0:
        total_pressure = 1.0  # Prevent division by zero

    forefoot_sum = sum(
        sum(grid[r]) for r in range(ZONE_FOREFOOT[0], ZONE_FOREFOOT[1])
    )
    midfoot_sum = sum(
        sum(grid[r]) for r in range(ZONE_MIDFOOT[0], ZONE_MIDFOOT[1])
    )
    rearfoot_sum = sum(
        sum(grid[r]) for r in range(ZONE_REARFOOT[0], ZONE_REARFOOT[1])
    )

    # Find peak pressure zones
    peak_zones: list[dict] = []
    max_pressure = max(max(row) for row in grid) if grid else 1.0
    if max_pressure == 0:
        max_pressure = 1.0

    for r in range(GRID_ROWS):
        for c in range(GRID_COLS):
            normalized = grid[r][c] / max_pressure
            if normalized > 0.7:
                # Determine zone label
                if r < ZONE_REARFOOT[1]:
                    label = "rearfoot"
                elif r < ZONE_MIDFOOT[1]:
                    if c < GRID_COLS // 2:
                        label = "midfoot_medial"
                    else:
                        label = "midfoot_lateral"
                else:
                    if c < GRID_COLS // 2:
                        label = "forefoot_medial"
                    else:
                        label = "forefoot_lateral"

                peak_zones.append({
                    "x": c,
                    "y": r,
                    "intensity": round(normalized, 3),
                    "label": label,
                })

    return {
        "pressureGrid": grid,
        "peakPressureZones": peak_zones,
        "overallDistribution": {
            "forefoot_pct": round(forefoot_sum / total_pressure * 100, 1),
            "midfoot_pct": round(midfoot_sum / total_pressure * 100, 1),
            "rearfoot_pct": round(rearfoot_sum / total_pressure * 100, 1),
        },
    }
