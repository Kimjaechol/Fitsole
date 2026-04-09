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


# ===========================================================================
# Task 2: STL exporter tests
# ===========================================================================


class TestIsOpenscadAvailable:
    """Tests for is_openscad_available function."""

    def test_returns_bool(self):
        from app.insole.stl_exporter import is_openscad_available

        result = is_openscad_available()
        assert isinstance(result, bool)

    @patch("app.insole.stl_exporter.shutil.which", return_value=None)
    def test_returns_false_when_not_installed(self, mock_which):
        from app.insole.stl_exporter import is_openscad_available

        assert is_openscad_available() is False

    @patch("app.insole.stl_exporter.shutil.which", return_value="/usr/bin/openscad")
    def test_returns_true_when_installed(self, mock_which):
        from app.insole.stl_exporter import is_openscad_available

        assert is_openscad_available() is True


class TestExportStl:
    """Tests for export_stl with mocked OpenSCAD subprocess."""

    def test_raises_when_openscad_not_found(self, sample_params: DesignParams, tmp_path: Path):
        from app.insole.scad_generator import generate_scad_file
        from app.insole.stl_exporter import export_stl

        scad_content = generate_scad_file(sample_params)

        with patch("app.insole.stl_exporter.is_openscad_available", return_value=False):
            with pytest.raises(FileNotFoundError, match="OpenSCAD is not installed"):
                export_stl(scad_content, tmp_path)

    @patch("app.insole.stl_exporter.subprocess.run")
    @patch("app.insole.stl_exporter.is_openscad_available", return_value=True)
    def test_calls_openscad_with_correct_args(
        self, mock_available, mock_run, sample_params: DesignParams, tmp_path: Path
    ):
        from app.insole.scad_generator import generate_scad_file
        from app.insole.stl_exporter import export_stl

        mock_run.return_value = MagicMock(returncode=0, stderr="")
        scad_content = generate_scad_file(sample_params)

        result = export_stl(scad_content, tmp_path, filename="test_insole")

        # Verify openscad was called
        mock_run.assert_called_once()
        call_args = mock_run.call_args[0][0]
        assert call_args[0] == "openscad"
        assert "-o" in call_args
        assert str(result).endswith(".stl")

    @patch("app.insole.stl_exporter.subprocess.run")
    @patch("app.insole.stl_exporter.is_openscad_available", return_value=True)
    def test_raises_on_openscad_failure(
        self, mock_available, mock_run, sample_params: DesignParams, tmp_path: Path
    ):
        from app.insole.scad_generator import generate_scad_file
        from app.insole.stl_exporter import export_stl

        mock_run.return_value = MagicMock(returncode=1, stderr="Parse error")
        scad_content = generate_scad_file(sample_params)

        with pytest.raises(RuntimeError, match="OpenSCAD failed"):
            export_stl(scad_content, tmp_path)

    @patch("app.insole.stl_exporter.subprocess.run")
    @patch("app.insole.stl_exporter.is_openscad_available", return_value=True)
    def test_cleans_up_temp_scad_file(
        self, mock_available, mock_run, sample_params: DesignParams, tmp_path: Path
    ):
        from app.insole.scad_generator import generate_scad_file
        from app.insole.stl_exporter import export_stl

        mock_run.return_value = MagicMock(returncode=0, stderr="")
        scad_content = generate_scad_file(sample_params)

        export_stl(scad_content, tmp_path)

        # Temp .scad file should be cleaned up
        scad_files = list(tmp_path.glob("*_tmp.scad"))
        assert len(scad_files) == 0


# ===========================================================================
# Task 2: Slicer profile tests
# ===========================================================================


class TestGenerateSlicerProfile:
    """Tests for PrusaSlicer profile generation (D-11)."""

    def test_contains_all_five_zones(self, sample_params: DesignParams, hardness_map: dict):
        from app.insole.slicer_profile import generate_slicer_profile

        profile = generate_slicer_profile(sample_params, hardness_map)
        zones = profile["zone_modifiers"]

        expected_zones = ["archCore", "heelCupWall", "heelCupFloor", "forefoot", "toeArea"]
        for zone in expected_zones:
            assert zone in zones, f"Missing zone: {zone}"
        assert len(zones) == 5

    def test_zone_temperatures_match_d03(self, sample_params: DesignParams, hardness_map: dict):
        """Temperatures must match D-03 VARIOSHORE_ZONES specification."""
        from app.insole.slicer_profile import generate_slicer_profile

        profile = generate_slicer_profile(sample_params, hardness_map)
        zones = profile["zone_modifiers"]

        expected_temps = {
            "archCore": 190,
            "heelCupWall": 195,
            "heelCupFloor": 200,
            "forefoot": 210,
            "toeArea": 220,
        }
        for zone_name, expected_temp in expected_temps.items():
            assert zones[zone_name]["temperature_c"] == expected_temp, (
                f"Zone {zone_name}: expected {expected_temp}C, "
                f"got {zones[zone_name]['temperature_c']}C"
            )

    def test_global_settings(self, sample_params: DesignParams, hardness_map: dict):
        from app.insole.slicer_profile import generate_slicer_profile

        profile = generate_slicer_profile(sample_params, hardness_map)
        gs = profile["global_settings"]

        assert gs["layer_height"] == 0.2
        assert gs["infill_percentage"] == 20
        assert profile["material"] == "Varioshore TPU"

    def test_zone_has_shore_a_and_flow(self, sample_params: DesignParams, hardness_map: dict):
        from app.insole.slicer_profile import generate_slicer_profile

        profile = generate_slicer_profile(sample_params, hardness_map)

        for zone_name, zone_data in profile["zone_modifiers"].items():
            assert "shore_a_hardness" in zone_data
            assert "flow_rate_percent" in zone_data
            assert "comment" in zone_data

    def test_accepts_pydantic_models_directly(self, sample_params: DesignParams):
        """Should work with VARIOSHORE_ZONES (VarioshoreTpuZone models) directly."""
        from app.insole.slicer_profile import generate_slicer_profile

        profile = generate_slicer_profile(sample_params, VARIOSHORE_ZONES)
        assert len(profile["zone_modifiers"]) == 5


class TestSaveSlicerProfile:
    """Tests for saving slicer profile to JSON."""

    def test_saves_valid_json(self, sample_params: DesignParams, hardness_map: dict, tmp_path: Path):
        from app.insole.slicer_profile import save_slicer_profile

        output_path = tmp_path / "profile.json"
        result = save_slicer_profile(sample_params, hardness_map, output_path)

        assert result == output_path
        assert output_path.exists()

        data = json.loads(output_path.read_text())
        assert "zone_modifiers" in data
        assert len(data["zone_modifiers"]) == 5


# ===========================================================================
# Task 2: Design output orchestration tests
# ===========================================================================


class TestGenerateDesignOutput:
    """Tests for generate_design_output orchestration (D-12)."""

    @patch("app.insole.slicer_profile.is_openscad_available", return_value=False)
    def test_returns_all_three_paths_without_openscad(
        self, mock_available, sample_params: DesignParams, hardness_map: dict, tmp_path: Path
    ):
        from app.insole.slicer_profile import generate_design_output

        result = generate_design_output(sample_params, hardness_map, tmp_path)

        assert "stl_path" in result
        assert "slicer_profile_path" in result
        assert "design_params_json_path" in result

        # STL should be None (OpenSCAD not available)
        assert result["stl_path"] is None
        # Slicer profile and design params should exist
        assert result["slicer_profile_path"] is not None
        assert Path(result["slicer_profile_path"]).exists()
        assert result["design_params_json_path"] is not None
        assert Path(result["design_params_json_path"]).exists()

    @patch("app.insole.slicer_profile.is_openscad_available", return_value=False)
    def test_design_params_json_content(
        self, mock_available, sample_params: DesignParams, hardness_map: dict, tmp_path: Path
    ):
        from app.insole.slicer_profile import generate_design_output

        result = generate_design_output(sample_params, hardness_map, tmp_path)

        params_data = json.loads(Path(result["design_params_json_path"]).read_text())
        assert params_data["arch_height"] == sample_params.arch_height
        assert params_data["foot_length"] == sample_params.foot_length

    @patch("app.insole.slicer_profile.generate_insole_stl")
    @patch("app.insole.slicer_profile.is_openscad_available", return_value=True)
    def test_includes_stl_when_openscad_available(
        self, mock_available, mock_stl, sample_params: DesignParams, hardness_map: dict, tmp_path: Path
    ):
        from app.insole.slicer_profile import generate_design_output

        stl_file = tmp_path / "insole.stl"
        stl_file.write_text("mock stl content")
        mock_stl.return_value = stl_file

        result = generate_design_output(sample_params, hardness_map, tmp_path)

        assert result["stl_path"] is not None
        assert result["slicer_profile_path"] is not None
        assert result["design_params_json_path"] is not None
