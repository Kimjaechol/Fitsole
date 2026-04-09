"""Hardness zone mapping for Varioshore TPU insole printing per D-03.

Maps insole zones to specific printing parameters (temperature, shore hardness,
flow percentage) for multi-material 3D printing with Varioshore TPU filament.

The temperature controls foaming density, which determines Shore A hardness:
- Lower temp (190C) = less foaming = harder (92 Shore A) for arch support
- Higher temp (220C) = more foaming = softer (55 Shore A) for toe comfort
"""

from __future__ import annotations

from typing import Dict

from app.insole.models import VARIOSHORE_ZONES, VarioshoreTpuZone

# PrusaSlicer modifier mesh parameters per zone
_SLICER_CONFIGS: Dict[str, dict] = {
    "archCore": {
        "nozzle_temperature": 190,
        "extrusion_multiplier": 1.0,
        "infill_density": 100,
        "layer_height": 0.2,
        "perimeters": 4,
        "description": "Rigid arch support core - maximum density",
    },
    "heelCupWall": {
        "nozzle_temperature": 195,
        "extrusion_multiplier": 1.0,
        "infill_density": 100,
        "layer_height": 0.2,
        "perimeters": 3,
        "description": "Semi-rigid heel cup walls for stability",
    },
    "heelCupFloor": {
        "nozzle_temperature": 200,
        "extrusion_multiplier": 1.0,
        "infill_density": 80,
        "layer_height": 0.25,
        "perimeters": 3,
        "description": "Medium-firm heel cup floor for shock absorption",
    },
    "forefoot": {
        "nozzle_temperature": 210,
        "extrusion_multiplier": 1.0,
        "infill_density": 60,
        "layer_height": 0.25,
        "perimeters": 2,
        "description": "Flexible forefoot for natural toe-off",
    },
    "toeArea": {
        "nozzle_temperature": 220,
        "extrusion_multiplier": 1.0,
        "infill_density": 40,
        "layer_height": 0.3,
        "perimeters": 2,
        "description": "Soft toe area for maximum comfort",
    },
}


def get_hardness_map() -> Dict[str, VarioshoreTpuZone]:
    """Return the 5-zone Varioshore TPU hardness mapping.

    Returns a copy of the VARIOSHORE_ZONES constant from models,
    representing the optimal zone-specific printing parameters.

    Returns:
        Dict mapping zone name to VarioshoreTpuZone with temp_c,
        shore_a, flow_pct, and color values.
    """
    return dict(VARIOSHORE_ZONES)


def get_zone_slicer_config(zone_name: str) -> dict:
    """Return PrusaSlicer modifier configuration for a specific zone.

    Provides the print parameters needed to create a PrusaSlicer
    modifier mesh for the given zone.

    Args:
        zone_name: One of the VARIOSHORE_ZONES keys.

    Returns:
        Dict with PrusaSlicer configuration keys.

    Raises:
        KeyError: If zone_name is not a valid zone.
    """
    if zone_name not in _SLICER_CONFIGS:
        raise KeyError(
            f"Unknown zone '{zone_name}'. "
            f"Valid zones: {', '.join(_SLICER_CONFIGS.keys())}"
        )
    return dict(_SLICER_CONFIGS[zone_name])
