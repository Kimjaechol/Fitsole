"""
Tests for OpenSCAD template rendering, STL export, and slicer profile generation.
Covers D-10, D-11, D-12: .scad generation, STL export, PrusaSlicer profiles.
"""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.insole.models import VARIOSHORE_ZONES, DesignParams


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_params() -> DesignParams:
    """Typical mid-range design parameters."""
    return DesignParams(
        arch_height=40.0,
        heel_cup_depth=25.0,
        eva_cushion_thickness=5.0,
        foot_length=260.0,
        foot_width=95.0,
        heel_width=65.0,
        forefoot_flex=0.5,
        medial_post_h=5.0,
        lateral_post_h=3.0,
    )


@pytest.fixture
def min_params() -> DesignParams:
    """Minimum valid design parameters."""
    return DesignParams(
        arch_height=25.0,
        heel_cup_depth=15.0,
        eva_cushion_thickness=1.0,
        foot_length=150.0,
        foot_width=60.0,
        heel_width=40.0,
        forefoot_flex=0.0,
        medial_post_h=0.0,
        lateral_post_h=0.0,
    )


@pytest.fixture
def max_params() -> DesignParams:
    """Maximum valid design parameters."""
    return DesignParams(
        arch_height=60.0,
        heel_cup_depth=35.0,
        eva_cushion_thickness=15.0,
        foot_length=350.0,
        foot_width=130.0,
        heel_width=90.0,
        forefoot_flex=1.0,
        medial_post_h=15.0,
        lateral_post_h=15.0,
    )


@pytest.fixture
def hardness_map() -> dict:
    """Hardness map from VARIOSHORE_ZONES for slicer tests."""
    return {k: v.model_dump() for k, v in VARIOSHORE_ZONES.items()}


# ===========================================================================
# Task 1: SCAD generator tests
# ===========================================================================


class TestGenerateScadFile:
    """Tests for generate_scad_file function."""

    def test_produces_nonempty_string(self, sample_params: DesignParams):
        from app.insole.scad_generator import generate_scad_file

        result = generate_scad_file(sample_params)
        assert isinstance(result, str)
        assert len(result) > 0

    def test_contains_all_design_params(self, sample_params: DesignParams):
        from app.insole.scad_generator import generate_scad_file

        result = generate_scad_file(sample_params)
        for field_name in sample_params.model_fields:
            value = getattr(sample_params, field_name)
            # Each parameter should appear as an OpenSCAD variable assignment
            assert field_name in result, f"Missing variable: {field_name}"

    def test_renders_with_min_params(self, min_params: DesignParams):
        from app.insole.scad_generator import generate_scad_file

        result = generate_scad_file(min_params)
        assert isinstance(result, str)
        assert len(result) > 0

    def test_renders_with_max_params(self, max_params: DesignParams):
        from app.insole.scad_generator import generate_scad_file

        result = generate_scad_file(max_params)
        assert isinstance(result, str)
        assert len(result) > 0

    def test_no_jinja2_errors(self, sample_params: DesignParams):
        """Template rendering must not raise Jinja2 errors."""
        from app.insole.scad_generator import generate_scad_file

        # Should not raise any exception
        result = generate_scad_file(sample_params)
        # No unrendered Jinja2 placeholders
        assert "{{" not in result
        assert "}}" not in result

    def test_resolution_parameter(self, sample_params: DesignParams):
        from app.insole.scad_generator import generate_scad_file

        result = generate_scad_file(sample_params, resolution=100)
        assert "$fn = 100" in result

    def test_resolution_capped_at_100(self, sample_params: DesignParams):
        """T-03-09: $fn capped at 100 for production."""
        from app.insole.scad_generator import generate_scad_file

        result = generate_scad_file(sample_params, resolution=200)
        assert "$fn = 100" in result

    def test_scad_has_balanced_brackets(self, sample_params: DesignParams):
        """Output .scad must have balanced braces."""
        from app.insole.scad_generator import generate_scad_file

        result = generate_scad_file(sample_params)
        assert result.count("{") == result.count("}"), "Unbalanced braces"
        assert result.count("(") == result.count(")"), "Unbalanced parentheses"

    def test_scad_contains_openscad_keywords(self, sample_params: DesignParams):
        """Output should contain OpenSCAD modeling keywords."""
        from app.insole.scad_generator import generate_scad_file

        result = generate_scad_file(sample_params)
        for keyword in ["hull", "translate", "difference"]:
            assert keyword in result, f"Missing OpenSCAD keyword: {keyword}"


class TestSaveScadFile:
    """Tests for save_scad_file function."""

    def test_saves_file_to_disk(self, sample_params: DesignParams, tmp_path: Path):
        from app.insole.scad_generator import save_scad_file

        output_path = tmp_path / "test_insole.scad"
        result = save_scad_file(sample_params, output_path)
        assert result == output_path
        assert output_path.exists()
        content = output_path.read_text()
        assert len(content) > 0
        assert "arch_height" in content
