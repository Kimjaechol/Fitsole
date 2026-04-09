"""Insole design optimization algorithms.

Implements core business logic for transforming foot scan data into
optimal insole design parameters per D-01 through D-04.

Functions:
    calculate_optimal_arch_height: Arch support height per D-01
    calculate_optimal_heel_cup_depth: Heel cup depth per D-02
    generate_insole_design: Full design generation pipeline
    recommend_shoe_size: Korean sizing recommendation
"""

from __future__ import annotations

import logging
from typing import List, Optional

from app.insole.hardness_mapper import get_hardness_map
from app.insole.models import (
    DesignParams,
    InsoleDesignInput,
    InsoleDesignResult,
)

logger = logging.getLogger(__name__)

# Arch classification thresholds (navicular height in mm)
FLAT_ARCH_THRESHOLD = 15.0
HIGH_ARCH_THRESHOLD = 25.0

# Arch height base values per D-01
ARCH_BASE_FLAT = 35.0
ARCH_BASE_NORMAL = 42.0
ARCH_BASE_HIGH = 50.0

# Arch height clamp range
ARCH_HEIGHT_MIN = 25.0
ARCH_HEIGHT_MAX = 60.0

# Heel cup depth base and clamp range per D-02
HEEL_CUP_BASE = 20.0
HEEL_CUP_MIN = 15.0
HEEL_CUP_MAX = 35.0

# Pressure thresholds for heel cup adjustment (kPa)
HIGH_PRESSURE_THRESHOLD = 300.0
MODERATE_PRESSURE_THRESHOLD = 200.0


def calculate_optimal_arch_height(
    navicular_height: float,
    midfoot_pressure_ratio: float,
    body_weight: float,
    foot_length: float,
) -> float:
    """Calculate optimal arch support height per D-01.

    Args:
        navicular_height: Navicular bone height in mm (proxy for arch height).
        midfoot_pressure_ratio: Ratio of midfoot pressure to total (0-1).
        body_weight: Body weight in kg.
        foot_length: Foot length in mm.

    Returns:
        Optimal arch height in mm, clamped to [25.0, 60.0], rounded to 1 decimal.
    """
    # Base height from arch classification
    if navicular_height < FLAT_ARCH_THRESHOLD:
        base = ARCH_BASE_FLAT
    elif navicular_height > HIGH_ARCH_THRESHOLD:
        base = ARCH_BASE_HIGH
    else:
        base = ARCH_BASE_NORMAL

    # Pressure adjustment: lower midfoot ratio -> more support needed
    pressure_adj = (0.5 - midfoot_pressure_ratio) * 10.0

    # Weight adjustment: heavier -> slightly more support
    weight_adj = (body_weight - 70.0) * 0.05

    # Length scaling: proportional to foot size
    length_scale = foot_length / 260.0

    result = (base + pressure_adj + weight_adj) * length_scale

    # Clamp to safe range and round
    result = max(ARCH_HEIGHT_MIN, min(ARCH_HEIGHT_MAX, result))
    return round(result, 1)


def calculate_optimal_heel_cup_depth(
    heel_peak_pressure: float,
    pronation_degree: float,
    age: int,
    activity_type: str,
) -> float:
    """Calculate optimal heel cup depth per D-02.

    Args:
        heel_peak_pressure: Peak heel pressure in kPa.
        pronation_degree: Pronation angle in degrees (positive=over, negative=supination).
        age: Age in years.
        activity_type: One of 'daily', 'running', 'standing'.

    Returns:
        Optimal heel cup depth in mm, clamped to [15.0, 35.0], rounded to 1 decimal.
    """
    result = HEEL_CUP_BASE

    # Pressure adjustment
    if heel_peak_pressure > HIGH_PRESSURE_THRESHOLD:
        result += 5.0
    elif heel_peak_pressure > MODERATE_PRESSURE_THRESHOLD:
        result += 2.5

    # Pronation adjustment (absolute value)
    result += abs(pronation_degree) * 0.5

    # Age adjustment (progressive after 40)
    result += max(0.0, (age - 40) * 0.1)

    # Activity adjustment
    if activity_type == "running":
        result += 3.0
    elif activity_type == "standing":
        result += 2.0

    # Clamp to safe range and round
    result = max(HEEL_CUP_MIN, min(HEEL_CUP_MAX, result))
    return round(result, 1)


def _extract_midfoot_pressure_ratio(pressure_data: dict) -> float:
    """Extract midfoot pressure ratio from pressure heatmap data.

    Calculates the ratio of midfoot zone intensity to total intensity
    from the 20x10 pressure grid.

    Args:
        pressure_data: Pressure data dict with pressureGrid (20x10).

    Returns:
        Midfoot pressure ratio (0-1).
    """
    grid = pressure_data.get("pressureGrid", [])
    if not grid:
        return 0.3  # Default fallback

    total = 0.0
    midfoot = 0.0

    for r, row in enumerate(grid):
        row_sum = sum(row)
        total += row_sum
        # Midfoot zone: rows 6-12 (per pressure estimator ZONE_MIDFOOT)
        if 6 <= r < 13:
            midfoot += row_sum

    if total == 0:
        return 0.3

    return midfoot / total


def _extract_heel_peak_pressure(pressure_data: dict) -> float:
    """Extract peak heel pressure from pressure data.

    Args:
        pressure_data: Pressure data dict with peakPressureZones.

    Returns:
        Peak heel pressure in kPa (estimated from intensity).
    """
    peak_zones = pressure_data.get("peakPressureZones", [])

    max_heel_intensity = 0.0
    for zone in peak_zones:
        if zone.get("label", "").startswith("rearfoot"):
            intensity = zone.get("intensity", 0.0)
            if intensity > max_heel_intensity:
                max_heel_intensity = intensity

    # Convert normalized intensity (0-1) to approximate kPa
    # Normal walking: ~200-400 kPa at heel
    return max_heel_intensity * 500.0


def generate_insole_design(
    input: InsoleDesignInput,
    measurements: dict,
    pressure_data: dict,
    gait_data: dict,
) -> InsoleDesignResult:
    """Generate complete insole design from scan data.

    Orchestrates all optimization algorithms to produce a full
    InsoleDesignResult with design parameters and hardness map.

    Args:
        input: Design input with user parameters.
        measurements: Foot measurement dict (archHeight, footLength, ballWidth, heelWidth).
        pressure_data: Pressure distribution data from estimator.
        gait_data: Gait analysis data (pronation_degree, stride_length).

    Returns:
        InsoleDesignResult with design params and hardness map.
    """
    # Extract values from measurement data
    navicular_height = measurements.get("archHeight", 22.0)
    foot_length = measurements.get("footLength", 260.0)
    foot_width = measurements.get("ballWidth", 98.0)
    heel_width = measurements.get("heelWidth", 65.0)

    # Extract pressure metrics
    midfoot_pressure_ratio = _extract_midfoot_pressure_ratio(pressure_data)
    heel_peak_pressure = _extract_heel_peak_pressure(pressure_data)

    # Extract gait metrics
    pronation_degree = gait_data.get("pronation_degree", 0.0)

    logger.info(
        "Generating insole design: scan=%s, side=%s, arch=%.1f, foot=%.1fmm",
        input.scan_id,
        input.foot_side,
        navicular_height,
        foot_length,
    )

    # Calculate core design parameters
    arch_height = calculate_optimal_arch_height(
        navicular_height=navicular_height,
        midfoot_pressure_ratio=midfoot_pressure_ratio,
        body_weight=input.body_weight,
        foot_length=foot_length,
    )

    heel_cup_depth = calculate_optimal_heel_cup_depth(
        heel_peak_pressure=heel_peak_pressure,
        pronation_degree=pronation_degree,
        age=input.age,
        activity_type=input.activity_type,
    )

    # Calculate remaining design parameters
    eva_cushion = 10.0  # Standard EVA cushion thickness

    # Forefoot flexibility: derived from gait stride (longer stride -> more flex needed)
    stride = gait_data.get("stride_length", 700.0)
    forefoot_flex = min(1.0, max(0.0, (stride - 500.0) / 500.0))

    # Medial/lateral post heights from pronation
    if pronation_degree > 0:
        # Overpronation: medial post higher
        medial_post_h = min(15.0, abs(pronation_degree) * 0.8)
        lateral_post_h = 0.0
    elif pronation_degree < 0:
        # Supination: lateral post higher
        medial_post_h = 0.0
        lateral_post_h = min(15.0, abs(pronation_degree) * 0.8)
    else:
        medial_post_h = 0.0
        lateral_post_h = 0.0

    design_params = DesignParams(
        arch_height=arch_height,
        heel_cup_depth=heel_cup_depth,
        eva_cushion_thickness=eva_cushion,
        foot_length=foot_length,
        foot_width=foot_width,
        heel_width=heel_width,
        forefoot_flex=round(forefoot_flex, 2),
        medial_post_h=round(medial_post_h, 1),
        lateral_post_h=round(lateral_post_h, 1),
    )

    # Apply hardness map
    hardness_map = get_hardness_map()

    return InsoleDesignResult(
        design_params=design_params,
        hardness_map=hardness_map,
    )


def recommend_shoe_size(
    foot_length_mm: float,
    foot_width_mm: float,
    product_sizes: List[dict],
) -> dict:
    """Recommend shoe size based on foot dimensions and available product sizes.

    Uses Korean sizing convention where shoe size corresponds to foot length in mm
    (e.g., 260mm foot -> size 260).

    Args:
        foot_length_mm: Measured foot length in mm.
        foot_width_mm: Measured foot width in mm.
        product_sizes: List of available sizes with keys: size, lastLength, lastWidth.

    Returns:
        Dict with recommended_size and fit_notes list.
    """
    if not product_sizes:
        return {
            "recommended_size": None,
            "fit_notes": ["No sizes available"],
        }

    # Find closest size by lastLength
    best_match = None
    best_diff = float("inf")

    for ps in product_sizes:
        last_length = ps.get("lastLength", ps.get("size", 0))
        diff = abs(foot_length_mm - last_length)
        if diff < best_diff:
            best_diff = diff
            best_match = ps

    recommended_size = best_match["size"]
    fit_notes: List[str] = []

    # Width assessment
    last_width = best_match.get("lastWidth", 0)
    if last_width > 0:
        width_diff = foot_width_mm - last_width
        if width_diff > 5:
            fit_notes.append("Wide fit recommended (발볼이 넓습니다)")
        elif width_diff < -5:
            fit_notes.append("Narrow fit detected (발볼이 좁습니다)")
        else:
            fit_notes.append("Standard width fit (표준 발볼)")

    # Length assessment
    if best_diff > 5:
        fit_notes.append(f"Closest available size ({best_diff:.0f}mm difference)")

    return {
        "recommended_size": recommended_size,
        "fit_notes": fit_notes,
    }
