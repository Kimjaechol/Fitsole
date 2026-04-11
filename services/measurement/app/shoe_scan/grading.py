"""Shoe size grading engine.

Implements industry-standard grading rules to derive all shoe sizes from
a single "base size" scan. Based on:

- French grading system: 6.67mm length increment per full size
- Ball width grades at ~3.5mm per full size
- Heel width grades at ~2.0mm per full size
- Toe box volume grades as length^3 (isometric scaling)

Research sources:
- "Footwear Pattern Making and Grading Calculations Based on International
   Standard of Measurements" (IJRASET)
- NIST Shoe Size Grading definition
- Shoe Pattern Grading (Shoemakers Academy)

This eliminates the need to scan every size of a shoe model. Instead,
scan ONE base size (e.g., 270mm) and derive all other sizes mathematically.

Optional: Scan 2-3 "anchor sizes" (small/medium/large) to validate the
derived sizes match reality within 1mm tolerance.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Literal, Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Industry standard grading coefficients
# ─────────────────────────────────────────────

# Length grading (mm per full size)
# Korean/Mondopoint convention: 5mm per full size
# International (French): 6.67mm per full size
# We use Korean convention because the primary market is Korea
LENGTH_GRADE_PER_MM = 1.0  # 1mm input size difference → 1mm output length

# Ball width grading (mm per mm of length difference)
# From industry data: ~3.5mm per full size (5mm length), so 0.7 ratio
BALL_WIDTH_GRADE_RATIO = 0.70

# Heel width grading (mm per mm of length difference)
# From industry data: ~2.0mm per full size (5mm length), so 0.4 ratio
HEEL_WIDTH_GRADE_RATIO = 0.40

# Instep clearance grading (vertical clearance scales slightly)
INSTEP_GRADE_RATIO = 0.25

# Heel cup depth grading (mostly fixed, slight increase with size)
HEEL_CUP_GRADE_RATIO = 0.10

# Arch support X position (scales proportionally with length)
ARCH_POSITION_SCALE = True  # scales as length ratio (0.55 × length typically)

# Toe box volume scales as length^3 (isometric)
# But in practice shoes maintain roughly constant *relative* toe room,
# so we use length^2.5 as a compromise (slightly less than full isometric)
TOE_BOX_VOLUME_EXPONENT = 2.5


# ─────────────────────────────────────────────
# Data classes
# ─────────────────────────────────────────────


@dataclass(frozen=True)
class ShoeDimensions:
    """Shoe internal dimensions at a specific size."""

    internal_length: float
    internal_width: float
    heel_cup_depth: float
    arch_support_x: float
    toe_box_volume: float
    instep_clearance: float


@dataclass(frozen=True)
class GradingAnchor:
    """An anchor scan used to calibrate the grading curve for a shoe model.

    When you scan multiple anchor sizes (e.g., 240, 260, 280), the grading
    engine uses them to fit a local curve instead of a pure linear extrapolation.
    This improves accuracy for shoes where the brand's grading deviates
    from the industry standard.
    """

    size_base: float
    dimensions: ShoeDimensions


# ─────────────────────────────────────────────
# Core grading functions
# ─────────────────────────────────────────────


def grade_linear(
    base_size: float,
    base_dimensions: ShoeDimensions,
    target_size: float,
) -> ShoeDimensions:
    """Derive target-size dimensions from a base scan using linear grading.

    Uses industry standard grading ratios. Works well when only one size
    has been scanned.

    Args:
        base_size: The size (mm) that was actually scanned (e.g., 270)
        base_dimensions: Measured dimensions at base_size
        target_size: The size (mm) we want to predict (e.g., 265 or 280)

    Returns:
        Predicted ShoeDimensions at target_size
    """
    delta_mm = target_size - base_size

    if abs(delta_mm) < 0.5:
        # Same size, return base unchanged
        return base_dimensions

    # Linear extrapolation for the length-like dimensions
    new_length = base_dimensions.internal_length + delta_mm * LENGTH_GRADE_PER_MM
    new_width = base_dimensions.internal_width + delta_mm * BALL_WIDTH_GRADE_RATIO

    # Arch position scales proportionally with length
    if ARCH_POSITION_SCALE and base_dimensions.internal_length > 0:
        arch_ratio = base_dimensions.arch_support_x / base_dimensions.internal_length
        new_arch_x = new_length * arch_ratio
    else:
        new_arch_x = base_dimensions.arch_support_x

    # Heel cup depth — mostly fixed but small size-proportional change
    new_heel_depth = (
        base_dimensions.heel_cup_depth + delta_mm * HEEL_CUP_GRADE_RATIO
    )

    # Instep clearance — small size-proportional change
    new_instep = (
        base_dimensions.instep_clearance + delta_mm * INSTEP_GRADE_RATIO
    )

    # Toe box volume scales nonlinearly with length (length^2.5)
    if base_dimensions.internal_length > 0:
        length_ratio = new_length / base_dimensions.internal_length
        volume_scale = length_ratio**TOE_BOX_VOLUME_EXPONENT
        new_toe_volume = base_dimensions.toe_box_volume * volume_scale
    else:
        new_toe_volume = base_dimensions.toe_box_volume

    logger.info(
        "Graded %smm → %smm: length %.1f→%.1f, width %.1f→%.1f",
        base_size,
        target_size,
        base_dimensions.internal_length,
        new_length,
        base_dimensions.internal_width,
        new_width,
    )

    return ShoeDimensions(
        internal_length=round(new_length, 2),
        internal_width=round(new_width, 2),
        heel_cup_depth=round(new_heel_depth, 2),
        arch_support_x=round(new_arch_x, 2),
        toe_box_volume=round(new_toe_volume, 2),
        instep_clearance=round(new_instep, 2),
    )


def grade_piecewise(
    anchors: list[GradingAnchor],
    target_size: float,
) -> ShoeDimensions:
    """Derive target-size dimensions from multiple anchor scans.

    When you have scanned 2+ sizes of the same model, use this function.
    It performs piecewise linear interpolation between anchors, which is
    more accurate than pure linear extrapolation for brands that deviate
    from industry-standard grading.

    Args:
        anchors: List of GradingAnchor sorted by size_base.
        target_size: The size (mm) we want to predict.

    Returns:
        Predicted ShoeDimensions at target_size.
    """
    if not anchors:
        raise ValueError("Need at least one anchor")

    if len(anchors) == 1:
        return grade_linear(anchors[0].size_base, anchors[0].dimensions, target_size)

    # Sort anchors by size
    sorted_anchors = sorted(anchors, key=lambda a: a.size_base)

    # Find the two anchors surrounding target_size
    if target_size <= sorted_anchors[0].size_base:
        # Extrapolate below smallest anchor
        return grade_linear(
            sorted_anchors[0].size_base,
            sorted_anchors[0].dimensions,
            target_size,
        )

    if target_size >= sorted_anchors[-1].size_base:
        # Extrapolate above largest anchor
        return grade_linear(
            sorted_anchors[-1].size_base,
            sorted_anchors[-1].dimensions,
            target_size,
        )

    # Interpolate between two bracketing anchors
    for i in range(len(sorted_anchors) - 1):
        lo = sorted_anchors[i]
        hi = sorted_anchors[i + 1]
        if lo.size_base <= target_size <= hi.size_base:
            return _interpolate(lo, hi, target_size)

    # Fallback (should not reach here)
    return grade_linear(
        sorted_anchors[0].size_base,
        sorted_anchors[0].dimensions,
        target_size,
    )


def _interpolate(
    lo: GradingAnchor,
    hi: GradingAnchor,
    target_size: float,
) -> ShoeDimensions:
    """Linear interpolation between two anchors."""
    range_mm = hi.size_base - lo.size_base
    if range_mm <= 0:
        return lo.dimensions

    t = (target_size - lo.size_base) / range_mm  # 0.0 at lo, 1.0 at hi

    return ShoeDimensions(
        internal_length=_lerp(
            lo.dimensions.internal_length, hi.dimensions.internal_length, t
        ),
        internal_width=_lerp(
            lo.dimensions.internal_width, hi.dimensions.internal_width, t
        ),
        heel_cup_depth=_lerp(
            lo.dimensions.heel_cup_depth, hi.dimensions.heel_cup_depth, t
        ),
        arch_support_x=_lerp(
            lo.dimensions.arch_support_x, hi.dimensions.arch_support_x, t
        ),
        toe_box_volume=_lerp(
            lo.dimensions.toe_box_volume, hi.dimensions.toe_box_volume, t
        ),
        instep_clearance=_lerp(
            lo.dimensions.instep_clearance, hi.dimensions.instep_clearance, t
        ),
    )


def _lerp(a: float, b: float, t: float) -> float:
    """Linear interpolation with rounding."""
    return round(a + (b - a) * t, 2)


# ─────────────────────────────────────────────
# Validation
# ─────────────────────────────────────────────


def validate_anchor_consistency(
    anchors: list[GradingAnchor],
    max_deviation_mm: float = 1.5,
) -> tuple[bool, list[str]]:
    """Check if multiple anchor scans are consistent with grading rules.

    If the deviation between scanned and grade-predicted values exceeds
    max_deviation_mm, something is wrong — either a scan error or the
    brand uses a non-standard grading system.

    Returns:
        (is_consistent, list_of_warnings)
    """
    warnings: list[str] = []

    if len(anchors) < 2:
        return True, warnings  # Can't validate with just 1 anchor

    sorted_anchors = sorted(anchors, key=lambda a: a.size_base)
    base = sorted_anchors[0]

    for other in sorted_anchors[1:]:
        predicted = grade_linear(base.size_base, base.dimensions, other.size_base)

        diff_length = abs(predicted.internal_length - other.dimensions.internal_length)
        diff_width = abs(predicted.internal_width - other.dimensions.internal_width)

        if diff_length > max_deviation_mm:
            warnings.append(
                f"Length deviation {diff_length:.2f}mm exceeds {max_deviation_mm}mm "
                f"at size {other.size_base}mm (predicted {predicted.internal_length:.1f}, "
                f"measured {other.dimensions.internal_length:.1f})"
            )

        if diff_width > max_deviation_mm:
            warnings.append(
                f"Width deviation {diff_width:.2f}mm exceeds {max_deviation_mm}mm "
                f"at size {other.size_base}mm (predicted {predicted.internal_width:.1f}, "
                f"measured {other.dimensions.internal_width:.1f})"
            )

    return len(warnings) == 0, warnings
