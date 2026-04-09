"""
PrusaSlicer profile generator for Varioshore TPU insoles (D-11, D-12).

Generates zone-specific temperature and flow settings for multi-material
3D printing with Varioshore TPU filament.
"""

import json
import logging
from pathlib import Path
from typing import Any, Optional

from app.insole.models import DesignParams
from app.insole.stl_exporter import generate_insole_stl, is_openscad_available

logger = logging.getLogger(__name__)


def generate_slicer_profile(
    params: DesignParams, hardness_map: dict
) -> dict[str, Any]:
    """Generate PrusaSlicer configuration for Varioshore TPU insole.

    Args:
        params: Insole design parameters.
        hardness_map: Zone-to-properties mapping (from VARIOSHORE_ZONES).
            Each zone dict has: temp_c, shore_a, flow_pct, color.

    Returns:
        PrusaSlicer configuration dict with global and zone-specific settings.
    """
    profile: dict[str, Any] = {
        "printer": "PrusaSlicer",
        "material": "Varioshore TPU",
        "global_settings": {
            "layer_height": 0.2,
            "infill_percentage": 20,
            "nozzle_diameter": 0.4,
            "bed_temperature": 50,
            "print_speed": 30,
        },
        "insole_dimensions": {
            "foot_length": params.foot_length,
            "foot_width": params.foot_width,
            "arch_height": params.arch_height,
            "heel_cup_depth": params.heel_cup_depth,
        },
        "zone_modifiers": {},
    }

    for zone_name, zone_props in hardness_map.items():
        # Support both dict and Pydantic model
        if hasattr(zone_props, "model_dump"):
            props = zone_props.model_dump()
        elif isinstance(zone_props, dict):
            props = zone_props
        else:
            props = dict(zone_props)

        profile["zone_modifiers"][zone_name] = {
            "temperature_c": props["temp_c"],
            "shore_a_hardness": props["shore_a"],
            "flow_rate_percent": props["flow_pct"],
            "color": props["color"],
            "comment": (
                f"Zone '{zone_name}': Shore A {props['shore_a']} "
                f"at {props['temp_c']}C — "
                f"{'firm' if props['shore_a'] >= 80 else 'soft'} region"
            ),
        }

    return profile


def save_slicer_profile(
    params: DesignParams, hardness_map: dict, output_path: Path
) -> Path:
    """Generate and save PrusaSlicer profile as JSON.

    Args:
        params: Insole design parameters.
        hardness_map: Zone-to-properties mapping.
        output_path: Destination JSON file path.

    Returns:
        The output path.
    """
    profile = generate_slicer_profile(params, hardness_map)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(profile, indent=2, ensure_ascii=False))
    return output_path


def generate_design_output(
    params: DesignParams, hardness_map: dict, output_dir: Path
) -> dict[str, Optional[str]]:
    """Orchestrate full manufacturing output per D-12.

    Generates STL (if OpenSCAD available), slicer profile JSON,
    and design parameters JSON.

    Args:
        params: Insole design parameters.
        hardness_map: Zone-to-properties mapping.
        output_dir: Directory to write all output files.

    Returns:
        Dict with keys: stl_path, slicer_profile_path, design_params_json_path.
        Values are string paths or None if generation failed.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    result: dict[str, Optional[str]] = {
        "stl_path": None,
        "slicer_profile_path": None,
        "design_params_json_path": None,
    }

    # 1. STL generation (optional — requires OpenSCAD binary)
    if is_openscad_available():
        try:
            stl_path = generate_insole_stl(params, output_dir)
            result["stl_path"] = str(stl_path)
        except Exception as exc:
            logger.warning("STL generation failed: %s", exc)
    else:
        logger.warning(
            "OpenSCAD not available — skipping STL generation. "
            "Install OpenSCAD for production use."
        )

    # 2. Slicer profile JSON
    try:
        slicer_path = output_dir / "slicer_profile.json"
        save_slicer_profile(params, hardness_map, slicer_path)
        result["slicer_profile_path"] = str(slicer_path)
    except Exception as exc:
        logger.warning("Slicer profile generation failed: %s", exc)

    # 3. Design parameters JSON
    try:
        params_path = output_dir / "design_params.json"
        params_path.write_text(
            json.dumps(params.model_dump(), indent=2, ensure_ascii=False)
        )
        result["design_params_json_path"] = str(params_path)
    except Exception as exc:
        logger.warning("Design params JSON generation failed: %s", exc)

    return result
