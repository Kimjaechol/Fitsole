"""Foot measurement extraction from 3D mesh.

Extracts 6 foot dimensions from the calibrated 3D mesh
using bounding box and cross-section analysis (D-11, SCAN-04).
"""

import logging

import numpy as np
import open3d as o3d

logger = logging.getLogger(__name__)


def extract_measurements(
    mesh: o3d.geometry.TriangleMesh,
    pixels_per_mm: float,
) -> dict:
    """Extract foot dimensions from calibrated 3D mesh.

    Extracts 6 measurements in mm using the A4 paper calibration factor.
    Coordinate convention:
    - X axis: medial-lateral (width)
    - Y axis: vertical (height)
    - Z axis: anterior-posterior (length, heel to toe)

    Per D-11: foot_length, ball_width, instep_height, arch_height,
    heel_width, toe_length.

    Args:
        mesh: Open3D TriangleMesh from Poisson reconstruction.
        pixels_per_mm: Scale factor from A4 paper calibration.

    Returns:
        Dict with 6 measurement keys, all values in mm.
    """
    vertices = np.asarray(mesh.vertices)
    if len(vertices) == 0:
        logger.warning("Empty mesh, returning zero measurements")
        return _zero_measurements()

    # Scale factor: convert from reconstruction units to mm
    # pixels_per_mm tells us how many reconstruction units per mm
    scale = 1.0 / pixels_per_mm if pixels_per_mm > 0 else 1.0

    # Bounding box extents in reconstruction units
    min_bounds = vertices.min(axis=0)
    max_bounds = vertices.max(axis=0)

    # Foot length: max extent along Z axis (heel to toe)
    foot_length = (max_bounds[2] - min_bounds[2]) * scale

    # Ball width: max X extent at the widest point
    # Find the widest cross-section along Z axis
    z_range = max_bounds[2] - min_bounds[2]
    # Ball of foot is typically at 60-70% from heel
    ball_z_start = min_bounds[2] + z_range * 0.55
    ball_z_end = min_bounds[2] + z_range * 0.75

    ball_mask = (vertices[:, 2] >= ball_z_start) & (vertices[:, 2] <= ball_z_end)
    if np.any(ball_mask):
        ball_vertices = vertices[ball_mask]
        ball_width = (ball_vertices[:, 0].max() - ball_vertices[:, 0].min()) * scale
    else:
        ball_width = (max_bounds[0] - min_bounds[0]) * scale

    # Instep height: max Y at instep region (40-55% from heel)
    instep_z_start = min_bounds[2] + z_range * 0.40
    instep_z_end = min_bounds[2] + z_range * 0.55

    instep_mask = (vertices[:, 2] >= instep_z_start) & (vertices[:, 2] <= instep_z_end)
    if np.any(instep_mask):
        instep_vertices = vertices[instep_mask]
        instep_height = (instep_vertices[:, 1].max() - instep_vertices[:, 1].min()) * scale
    else:
        instep_height = (max_bounds[1] - min_bounds[1]) * scale * 0.5

    # Arch height: min Y in arch region (30-50% from heel)
    # The arch is the concave area on the medial side
    arch_z_start = min_bounds[2] + z_range * 0.30
    arch_z_end = min_bounds[2] + z_range * 0.50

    arch_mask = (vertices[:, 2] >= arch_z_start) & (vertices[:, 2] <= arch_z_end)
    if np.any(arch_mask):
        arch_vertices = vertices[arch_mask]
        # Arch height is the vertical gap between the bottom of the foot
        # and the lowest point of the arch
        arch_height = (arch_vertices[:, 1].max() - arch_vertices[:, 1].min()) * scale
    else:
        arch_height = (max_bounds[1] - min_bounds[1]) * scale * 0.3

    # Heel width: X extent at heel region (0-15% from heel)
    heel_z_start = min_bounds[2]
    heel_z_end = min_bounds[2] + z_range * 0.15

    heel_mask = (vertices[:, 2] >= heel_z_start) & (vertices[:, 2] <= heel_z_end)
    if np.any(heel_mask):
        heel_vertices = vertices[heel_mask]
        heel_width = (heel_vertices[:, 0].max() - heel_vertices[:, 0].min()) * scale
    else:
        heel_width = ball_width * 0.65  # Typical heel-to-ball ratio

    # Toe length: Z extent of toe region (80-100% from heel)
    toe_z_start = min_bounds[2] + z_range * 0.80

    toe_mask = vertices[:, 2] >= toe_z_start
    if np.any(toe_mask):
        toe_vertices = vertices[toe_mask]
        toe_length = (toe_vertices[:, 2].max() - toe_vertices[:, 2].min()) * scale
    else:
        toe_length = foot_length * 0.20

    measurements = {
        "foot_length": round(foot_length, 2),
        "ball_width": round(ball_width, 2),
        "instep_height": round(instep_height, 2),
        "arch_height": round(arch_height, 2),
        "heel_width": round(heel_width, 2),
        "toe_length": round(toe_length, 2),
    }

    logger.info("Extracted measurements (mm): %s", measurements)
    return measurements


def _zero_measurements() -> dict:
    """Return zero-valued measurements dict."""
    return {
        "foot_length": 0.0,
        "ball_width": 0.0,
        "instep_height": 0.0,
        "arch_height": 0.0,
        "heel_width": 0.0,
        "toe_length": 0.0,
    }
