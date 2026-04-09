"""Heatmap generation from pressure grid data.

Normalizes pressure data to 0-1 range, identifies high-pressure zones,
and generates warnings for excessive pressure areas.

Zone labels use Korean per D-10, D-23:
    - 전족부 (forefoot)
    - 중족부 (midfoot)
    - 후족부 (rearfoot)
    - 내측 (medial)
    - 외측 (lateral)
"""

import logging

logger = logging.getLogger(__name__)

# Pressure thresholds
HIGH_PRESSURE_THRESHOLD = 0.7
WARNING_PRESSURE_THRESHOLD = 0.85

# Zone label mapping (English -> Korean)
ZONE_LABELS_KO: dict[str, str] = {
    "rearfoot": "후족부",
    "midfoot_medial": "중족부 내측",
    "midfoot_lateral": "중족부 외측",
    "forefoot_medial": "전족부 내측",
    "forefoot_lateral": "전족부 외측",
    "forefoot": "전족부",
    "midfoot": "중족부",
}

# Grid zone row ranges (same as estimator)
ZONE_REARFOOT = (0, 6)
ZONE_MIDFOOT = (6, 13)
ZONE_FOREFOOT = (13, 20)


def generate_heatmap(pressure_grid: list[list[float]]) -> dict:
    """Generate heatmap data from pressure grid.

    Normalizes the pressure grid to 0-1 range, identifies
    high-pressure zones with Korean labels, and generates
    warnings for zones exceeding safety thresholds.

    Args:
        pressure_grid: 2D pressure grid from estimate_pressure().

    Returns:
        Dict with:
            - normalizedGrid: 2D array normalized to 0-1
            - highPressureZones: list of {x, y, intensity, label}
            - warnings: list of Korean warning strings
    """
    if not pressure_grid or not pressure_grid[0]:
        return {
            "normalizedGrid": [],
            "highPressureZones": [],
            "warnings": [],
        }

    rows = len(pressure_grid)
    cols = len(pressure_grid[0])

    # Find min and max for normalization
    all_values = [cell for row in pressure_grid for cell in row]
    min_val = min(all_values)
    max_val = max(all_values)
    value_range = max_val - min_val

    if value_range == 0:
        value_range = 1.0  # Prevent division by zero

    # Normalize to 0-1 range
    normalized_grid: list[list[float]] = []
    for row in pressure_grid:
        normalized_row = [
            round((cell - min_val) / value_range, 4)
            for cell in row
        ]
        normalized_grid.append(normalized_row)

    # Identify high-pressure zones
    high_pressure_zones: list[dict] = []
    warning_zones: set[str] = set()

    for r in range(rows):
        for c in range(cols):
            intensity = normalized_grid[r][c]

            if intensity > HIGH_PRESSURE_THRESHOLD:
                # Determine zone label
                zone_key = _get_zone_key(r, c, rows, cols)
                zone_label = ZONE_LABELS_KO.get(zone_key, zone_key)

                high_pressure_zones.append({
                    "x": c,
                    "y": r,
                    "intensity": round(intensity, 3),
                    "label": zone_label,
                })

                # Check for warning threshold
                if intensity > WARNING_PRESSURE_THRESHOLD:
                    warning_zones.add(zone_label)

    # Generate warning messages for excessive pressure zones
    warnings: list[str] = []
    for zone_label in sorted(warning_zones):
        warnings.append(
            f"{zone_label} 부위에 과도한 압력이 감지되었습니다"
        )

    logger.info(
        "Heatmap generated: %d high-pressure zones, %d warnings",
        len(high_pressure_zones),
        len(warnings),
    )

    return {
        "normalizedGrid": normalized_grid,
        "highPressureZones": high_pressure_zones,
        "warnings": warnings,
    }


def _get_zone_key(row: int, col: int, total_rows: int, total_cols: int) -> str:
    """Determine zone key from grid position.

    Args:
        row: Row index.
        col: Column index.
        total_rows: Total number of rows.
        total_cols: Total number of columns.

    Returns:
        Zone key string for label lookup.
    """
    mid_col = total_cols // 2
    is_medial = col < mid_col

    if row < ZONE_REARFOOT[1]:
        return "rearfoot"
    elif row < ZONE_MIDFOOT[1]:
        return "midfoot_medial" if is_medial else "midfoot_lateral"
    else:
        return "forefoot_medial" if is_medial else "forefoot_lateral"
