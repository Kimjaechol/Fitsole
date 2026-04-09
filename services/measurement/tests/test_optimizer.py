"""Tests for insole design optimization algorithms and hardness mapper.

Covers:
- Arch height calculation for flat/normal/high arch
- Arch height clamping at boundaries
- Heel cup depth for high/low pressure
- Heel cup depth clamping
- Hardness map zone validation against D-03
- Size recommendation logic
"""

import pytest

from app.insole.optimizer import (
    calculate_optimal_arch_height,
    calculate_optimal_heel_cup_depth,
    generate_insole_design,
    recommend_shoe_size,
)
from app.insole.hardness_mapper import get_hardness_map, get_zone_slicer_config
from app.insole.models import VARIOSHORE_ZONES, InsoleDesignInput


# --- Arch Height Tests ---


class TestCalculateOptimalArchHeight:
    """Test arch height optimization per D-01."""

    def test_flat_arch_returns_low_range(self):
        """Flat arch (navicular < 15mm) should produce ~35mm base."""
        result = calculate_optimal_arch_height(
            navicular_height=10,
            midfoot_pressure_ratio=0.3,
            body_weight=70,
            foot_length=260,
        )
        # Base 35 + pressure adj (0.5-0.3)*10=2 + weight adj 0 + length scale 1.0
        # ~37mm range
        assert 30 <= result <= 42, f"Flat arch result {result} not in expected range"

    def test_normal_arch_returns_mid_range(self):
        """Normal arch (15-25mm navicular) should produce ~42mm base."""
        result = calculate_optimal_arch_height(
            navicular_height=20,
            midfoot_pressure_ratio=0.5,
            body_weight=70,
            foot_length=260,
        )
        # Base 42 + pressure adj 0 + weight adj 0 + length scale 1.0
        # ~42mm
        assert 38 <= result <= 48, f"Normal arch result {result} not in expected range"

    def test_high_arch_returns_high_range(self):
        """High arch (navicular > 25mm) should produce ~50mm base."""
        result = calculate_optimal_arch_height(
            navicular_height=30,
            midfoot_pressure_ratio=0.7,
            body_weight=70,
            foot_length=260,
        )
        # Base 50 + pressure adj (0.5-0.7)*10=-2 + weight adj 0 + length scale 1.0
        # ~48mm
        assert 44 <= result <= 55, f"High arch result {result} not in expected range"

    def test_clamp_to_minimum(self):
        """Values below 25mm should be clamped to 25.0."""
        result = calculate_optimal_arch_height(
            navicular_height=5,
            midfoot_pressure_ratio=0.9,
            body_weight=40,
            foot_length=200,
        )
        assert result >= 25.0, f"Result {result} below minimum 25.0"

    def test_clamp_to_maximum(self):
        """Values above 60mm should be clamped to 60.0."""
        result = calculate_optimal_arch_height(
            navicular_height=40,
            midfoot_pressure_ratio=0.1,
            body_weight=150,
            foot_length=320,
        )
        assert result <= 60.0, f"Result {result} above maximum 60.0"

    def test_returns_one_decimal(self):
        """Result should be rounded to 1 decimal place."""
        result = calculate_optimal_arch_height(
            navicular_height=18,
            midfoot_pressure_ratio=0.45,
            body_weight=75,
            foot_length=265,
        )
        assert result == round(result, 1), f"Result {result} not rounded to 1 decimal"


# --- Heel Cup Depth Tests ---


class TestCalculateOptimalHeelCupDepth:
    """Test heel cup depth optimization per D-02."""

    def test_high_pressure_deep_cup(self):
        """High pressure + running + older age should give deep cup (~30mm)."""
        result = calculate_optimal_heel_cup_depth(
            heel_peak_pressure=350,
            pronation_degree=8,
            age=50,
            activity_type="running",
        )
        # Base 20 + pressure +5 + pronation 4 + age 1 + activity +3 = 33
        assert 27 <= result <= 35, f"Deep cup result {result} not in expected range"

    def test_low_pressure_shallow_cup(self):
        """Low pressure + daily + young should give shallow cup (~20mm)."""
        result = calculate_optimal_heel_cup_depth(
            heel_peak_pressure=150,
            pronation_degree=2,
            age=25,
            activity_type="daily",
        )
        # Base 20 + pressure 0 + pronation 1 + age 0 + activity 0 = 21
        assert 18 <= result <= 24, f"Shallow cup result {result} not in expected range"

    def test_standing_activity_adjustment(self):
        """Standing activity should add +2 to base."""
        result_daily = calculate_optimal_heel_cup_depth(
            heel_peak_pressure=200,
            pronation_degree=0,
            age=30,
            activity_type="daily",
        )
        result_standing = calculate_optimal_heel_cup_depth(
            heel_peak_pressure=200,
            pronation_degree=0,
            age=30,
            activity_type="standing",
        )
        assert result_standing > result_daily, "Standing should produce deeper cup than daily"

    def test_clamp_to_minimum(self):
        """Values below 15mm should be clamped to 15.0."""
        result = calculate_optimal_heel_cup_depth(
            heel_peak_pressure=50,
            pronation_degree=0,
            age=20,
            activity_type="daily",
        )
        assert result >= 15.0, f"Result {result} below minimum 15.0"

    def test_clamp_to_maximum(self):
        """Values above 35mm should be clamped to 35.0."""
        result = calculate_optimal_heel_cup_depth(
            heel_peak_pressure=500,
            pronation_degree=15,
            age=80,
            activity_type="running",
        )
        assert result <= 35.0, f"Result {result} above maximum 35.0"

    def test_returns_one_decimal(self):
        """Result should be rounded to 1 decimal place."""
        result = calculate_optimal_heel_cup_depth(
            heel_peak_pressure=250,
            pronation_degree=5,
            age=45,
            activity_type="running",
        )
        assert result == round(result, 1), f"Result {result} not rounded to 1 decimal"


# --- Hardness Map Tests ---


class TestHardnessMap:
    """Test hardness mapper against D-03 Varioshore TPU zones."""

    def test_has_exactly_five_zones(self):
        """Hardness map must have exactly 5 zones."""
        hardness_map = get_hardness_map()
        assert len(hardness_map) == 5, f"Expected 5 zones, got {len(hardness_map)}"

    def test_zone_names_match(self):
        """Zone names must match VARIOSHORE_ZONES keys."""
        hardness_map = get_hardness_map()
        expected_zones = {"archCore", "heelCupWall", "heelCupFloor", "forefoot", "toeArea"}
        assert set(hardness_map.keys()) == expected_zones

    def test_arch_core_values(self):
        """archCore zone: 190C, 92 Shore A (hardest)."""
        zone = get_hardness_map()["archCore"]
        assert zone.temp_c == 190
        assert zone.shore_a == 92

    def test_toe_area_values(self):
        """toeArea zone: 220C, 55 Shore A (softest)."""
        zone = get_hardness_map()["toeArea"]
        assert zone.temp_c == 220
        assert zone.shore_a == 55

    def test_matches_varioshore_zones_constant(self):
        """Hardness map must exactly match VARIOSHORE_ZONES from models."""
        hardness_map = get_hardness_map()
        for zone_name, zone_data in VARIOSHORE_ZONES.items():
            assert zone_name in hardness_map
            assert hardness_map[zone_name] == zone_data

    def test_zone_slicer_config_returns_dict(self):
        """Slicer config should return a dict with PrusaSlicer keys."""
        config = get_zone_slicer_config("archCore")
        assert isinstance(config, dict)
        assert "temperature" in config or "nozzle_temperature" in config


# --- Size Recommendation Tests ---


class TestRecommendShoeSize:
    """Test shoe size recommendation per Korean sizing."""

    def test_exact_size_match(self):
        """260mm foot should recommend size 260."""
        product_sizes = [
            {"size": 250, "lastLength": 250, "lastWidth": 95},
            {"size": 260, "lastLength": 260, "lastWidth": 98},
            {"size": 270, "lastLength": 270, "lastWidth": 101},
        ]
        result = recommend_shoe_size(260, 98, product_sizes)
        assert result["recommended_size"] == 260

    def test_closest_size_match(self):
        """263mm foot should recommend closest size (260 or 265)."""
        product_sizes = [
            {"size": 250, "lastLength": 250, "lastWidth": 95},
            {"size": 260, "lastLength": 260, "lastWidth": 98},
            {"size": 270, "lastLength": 270, "lastWidth": 101},
        ]
        result = recommend_shoe_size(263, 98, product_sizes)
        assert result["recommended_size"] in (260, 270)

    def test_wide_foot_note(self):
        """Wide foot (width > last width) should include wide fit note."""
        product_sizes = [
            {"size": 260, "lastLength": 260, "lastWidth": 98},
        ]
        result = recommend_shoe_size(260, 108, product_sizes)
        assert "fit_notes" in result
        # Wide foot should have a note about width
        assert any("wide" in note.lower() or "넓" in note for note in result["fit_notes"])

    def test_narrow_foot_note(self):
        """Narrow foot should include narrow fit note."""
        product_sizes = [
            {"size": 260, "lastLength": 260, "lastWidth": 98},
        ]
        result = recommend_shoe_size(260, 85, product_sizes)
        assert "fit_notes" in result
        assert any("narrow" in note.lower() or "좁" in note for note in result["fit_notes"])


# --- Generate Insole Design Integration Test ---


class TestGenerateInsoleDesign:
    """Test end-to-end insole design generation."""

    def test_returns_valid_design_result(self):
        """generate_insole_design should return InsoleDesignResult with valid params."""
        design_input = InsoleDesignInput(
            scan_id="test-scan-001",
            foot_side="left",
            line_type="general",
            body_weight=70,
            age=30,
            activity_type="daily",
        )
        measurements = {
            "archHeight": 22.0,
            "footLength": 260.0,
            "ballWidth": 98.0,
            "heelWidth": 65.0,
        }
        pressure_data = {
            "pressureGrid": [[0.1] * 10 for _ in range(20)],
            "peakPressureZones": [
                {"x": 5, "y": 3, "intensity": 0.8, "label": "rearfoot"},
            ],
            "overallDistribution": {
                "forefoot_pct": 40.0,
                "midfoot_pct": 15.0,
                "rearfoot_pct": 45.0,
            },
        }
        gait_data = {
            "pronation_degree": 3.0,
            "stride_length": 700.0,
        }
        result = generate_insole_design(design_input, measurements, pressure_data, gait_data)
        assert result.design_params.arch_height >= 25.0
        assert result.design_params.arch_height <= 60.0
        assert result.design_params.heel_cup_depth >= 15.0
        assert result.design_params.heel_cup_depth <= 35.0
        assert len(result.hardness_map) == 5
