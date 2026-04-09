"""Tests for SALTED biomechanical analysis engine.

TDD RED phase: tests written before implementation.
Tests landing pattern detection, pronation calculation, weight distribution.
"""

from __future__ import annotations

from typing import Optional

import pytest

from app.salted.models import SaltedPressureFrame, ImuData


def _make_frame(
    timestamp: float,
    pressure_array: list[float],
    imu_data: Optional[ImuData] = None,
) -> SaltedPressureFrame:
    """Helper to create a pressure frame."""
    return SaltedPressureFrame(
        timestamp=timestamp,
        pressure_array=pressure_array,
        imu_data=imu_data,
    )


def _generate_heel_dominant_frames(n: int = 200) -> list[SaltedPressureFrame]:
    """Generate frames with heel-dominant pressure (>60% in heel region).

    Grid: 20 rows x 10 cols. Rows 0-5 = heel, 6-13 = midfoot, 14-19 = forefoot.
    """
    frames = []
    for i in range(n):
        pressure = [0.0] * 200
        # Heel region (rows 0-5): high pressure
        for r in range(6):
            for c in range(10):
                pressure[r * 10 + c] = 500.0 + (i % 20)
        # Midfoot (rows 6-13): low pressure
        for r in range(6, 14):
            for c in range(10):
                pressure[r * 10 + c] = 50.0
        # Forefoot (rows 14-19): low pressure
        for r in range(14, 20):
            for c in range(10):
                pressure[r * 10 + c] = 80.0

        frames.append(_make_frame(timestamp=i * 10.0, pressure_array=pressure))
    return frames


def _generate_forefoot_dominant_frames(n: int = 200) -> list[SaltedPressureFrame]:
    """Generate frames with forefoot-dominant pressure (>60% in forefoot region)."""
    frames = []
    for i in range(n):
        pressure = [0.0] * 200
        # Heel: low
        for r in range(6):
            for c in range(10):
                pressure[r * 10 + c] = 60.0
        # Midfoot: low
        for r in range(6, 14):
            for c in range(10):
                pressure[r * 10 + c] = 50.0
        # Forefoot: high
        for r in range(14, 20):
            for c in range(10):
                pressure[r * 10 + c] = 600.0

        frames.append(_make_frame(timestamp=i * 10.0, pressure_array=pressure))
    return frames


def _generate_medial_shift_frames(n: int = 200) -> list[SaltedPressureFrame]:
    """Generate frames with medial COP shift (positive pronation expected).

    Medial side = columns 0-4, lateral = columns 5-9.
    """
    frames = []
    for i in range(n):
        pressure = [0.0] * 200
        for r in range(20):
            for c in range(10):
                if c < 5:
                    # Medial: higher pressure
                    pressure[r * 10 + c] = 400.0
                else:
                    # Lateral: lower pressure
                    pressure[r * 10 + c] = 150.0
        frames.append(_make_frame(timestamp=i * 10.0, pressure_array=pressure))
    return frames


class TestLandingPatternDetection:
    """Test landing pattern classification from pressure data."""

    def test_heel_dominant_returns_heel_strike(self):
        from app.salted.biomechanical import analyze_biomechanics

        frames = _generate_heel_dominant_frames()
        result = analyze_biomechanics(frames)
        assert result.landing_pattern == "heel_strike"

    def test_forefoot_dominant_returns_forefoot_strike(self):
        from app.salted.biomechanical import analyze_biomechanics

        frames = _generate_forefoot_dominant_frames()
        result = analyze_biomechanics(frames)
        assert result.landing_pattern == "forefoot_strike"

    def test_even_distribution_returns_midfoot_strike(self):
        from app.salted.biomechanical import analyze_biomechanics

        # Generate frames with roughly even pressure across all regions
        frames = []
        for i in range(200):
            pressure = [300.0] * 200  # uniform pressure
            frames.append(_make_frame(timestamp=i * 10.0, pressure_array=pressure))
        result = analyze_biomechanics(frames)
        assert result.landing_pattern == "midfoot_strike"


class TestPronationCalculation:
    """Test COP medial-lateral deviation analysis."""

    def test_medial_shift_gives_positive_pronation(self):
        from app.salted.biomechanical import analyze_biomechanics

        frames = _generate_medial_shift_frames()
        result = analyze_biomechanics(frames)
        assert result.pronation_degree > 0, "Medial COP shift should give positive pronation"

    def test_pronation_degree_is_reasonable(self):
        from app.salted.biomechanical import analyze_biomechanics

        frames = _generate_medial_shift_frames()
        result = analyze_biomechanics(frames)
        # Pronation should be between -30 and +30 degrees
        assert -30 <= result.pronation_degree <= 30


class TestWeightDistribution:
    """Test weight distribution percentages."""

    def test_weight_distribution_sums_to_approximately_100(self):
        from app.salted.biomechanical import analyze_biomechanics

        frames = _generate_heel_dominant_frames()
        result = analyze_biomechanics(frames)
        total = (
            result.weight_distribution.forefoot
            + result.weight_distribution.midfoot
            + result.weight_distribution.hindfoot
        )
        assert abs(total - 100.0) < 1.0, f"Weight distribution should sum to ~100, got {total}"

    def test_heel_dominant_has_highest_hindfoot(self):
        from app.salted.biomechanical import analyze_biomechanics

        frames = _generate_heel_dominant_frames()
        result = analyze_biomechanics(frames)
        assert result.weight_distribution.hindfoot > result.weight_distribution.forefoot
        assert result.weight_distribution.hindfoot > result.weight_distribution.midfoot


class TestCopTrajectory:
    """Test COP trajectory extraction."""

    def test_cop_trajectory_not_empty(self):
        from app.salted.biomechanical import analyze_biomechanics

        frames = _generate_heel_dominant_frames()
        result = analyze_biomechanics(frames)
        assert len(result.cop_trajectory) > 0

    def test_cop_trajectory_has_valid_coordinates(self):
        from app.salted.biomechanical import analyze_biomechanics

        frames = _generate_heel_dominant_frames()
        result = analyze_biomechanics(frames)
        for point in result.cop_trajectory:
            assert 0 <= point.x <= 1.0, f"COP x should be normalized 0-1, got {point.x}"
            assert 0 <= point.y <= 1.0, f"COP y should be normalized 0-1, got {point.y}"
            assert point.t >= 0


class TestArchFlexibility:
    """Test arch flexibility analysis."""

    def test_arch_flexibility_indices_positive(self):
        from app.salted.biomechanical import analyze_biomechanics

        frames = _generate_heel_dominant_frames()
        result = analyze_biomechanics(frames)
        assert result.arch_flexibility.static_index >= 0
        assert result.arch_flexibility.dynamic_index >= 0
