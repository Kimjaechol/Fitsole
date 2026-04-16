"""Extract shoe interior dimensions from an SfM-reconstructed cavity mesh.

Unlike foot measurement (convex solid), shoe interior is a concave cavity.
The mesh represents the *inner surface* of the shoe — a hollow tube with
closed heel and open topline.

Coordinate convention (right-handed):
    X axis: medial-lateral (width)
    Y axis: vertical (upward)
    Z axis: anterior-posterior (length, heel=0 to toe=max)

Key measurements extracted:
    - internal_length: max Z extent
    - internal_width: max X extent at ball girth section (~70% of length)
    - heel_cup_depth: Y extent at heel cross-section (0-15% length)
    - arch_support_x: Z position where inner floor curvature peaks
    - toe_box_volume: volume of the forefoot section (70-100% length)
    - instep_clearance: Y distance from floor to ceiling at 60% length
"""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np
import open3d as o3d

logger = logging.getLogger(__name__)

# Section boundaries as fractions of internal length (heel=0, toe=1)
HEEL_SECTION_END = 0.15
ARCH_SEARCH_START = 0.25
ARCH_SEARCH_END = 0.55
BALL_GIRTH_POSITION = 0.70
INSTEP_POSITION = 0.60
TOE_BOX_START = 0.70


def extract_shoe_dimensions(
    mesh: o3d.geometry.TriangleMesh,
    pixels_per_mm: float,
) -> Optional[dict]:
    """Extract internal cavity dimensions from a shoe interior mesh.

    Args:
        mesh: Open3D TriangleMesh of the inner shoe surface.
        pixels_per_mm: Scale factor from calibration target detection.

    Returns:
        Dict with 6 measurement keys (all mm). Individual values may be
        ``None`` when a slice has too few vertices — downstream Pydantic
        ``ShoeInternalDimensions`` fields are ``Optional`` so the merge
        endpoint can still return a partial result instead of 500ing.
        Returns ``None`` only when the whole mesh is unusable.
    """
    vertices = np.asarray(mesh.vertices)
    if len(vertices) < 100:
        logger.warning("Mesh too sparse (%d vertices) — aborting", len(vertices))
        return None

    scale = 1.0 / pixels_per_mm if pixels_per_mm > 0 else 1.0

    # --- Orient mesh so heel is at Z=0, toe at Z=max ---
    oriented = _orient_to_shoe_axes(vertices)
    if oriented is None:
        return None

    v = oriented * scale
    min_b = v.min(axis=0)
    max_b = v.max(axis=0)

    internal_length = float(max_b[2] - min_b[2])
    if internal_length < 100.0 or internal_length > 400.0:
        logger.warning("Length %f out of range", internal_length)
        return None

    # Shift so heel is at Z=0
    v_shifted = v - np.array([0, min_b[1], min_b[2]])

    # --- Extract measurements (Optional[float]; None → sparse slice) ---
    internal_width = _measure_width_at_section(
        v_shifted, internal_length, BALL_GIRTH_POSITION
    )
    heel_cup_depth = _measure_heel_cup_depth(v_shifted, internal_length)
    arch_support_x = _find_arch_peak_position(v_shifted, internal_length)
    toe_box_volume = _measure_toe_box_volume(v_shifted, internal_length)
    instep_clearance = _measure_instep_clearance(v_shifted, internal_length)

    def _round(x: Optional[float]) -> Optional[float]:
        return round(x, 2) if x is not None else None

    return {
        "internal_length": round(internal_length, 2),
        "internal_width": _round(internal_width),
        "heel_cup_depth": _round(heel_cup_depth),
        "arch_support_x": _round(arch_support_x),
        "toe_box_volume": _round(toe_box_volume),
        "instep_clearance": _round(instep_clearance),
    }


# ─────────────────────────────────────────────
# Orientation
# ─────────────────────────────────────────────


def _orient_to_shoe_axes(vertices: np.ndarray) -> Optional[np.ndarray]:
    """Align the mesh so Z axis runs heel-to-toe via PCA.

    The longest principal component of the point cloud is the
    heel-toe axis. We rotate so that axis aligns with Z.
    """
    try:
        centroid = vertices.mean(axis=0)
        centered = vertices - centroid
        cov = np.cov(centered.T)
        eigvals, eigvecs = np.linalg.eigh(cov)

        # Sort descending
        order = np.argsort(eigvals)[::-1]
        eigvecs = eigvecs[:, order]

        # Build rotation: principal component → Z, second → X, third → Y.
        # The raw column stack is orthonormal but not guaranteed right-handed
        # (det may be -1, a reflection that inverts mesh normals); if so, flip
        # one axis to restore a proper rotation.
        R = np.column_stack([eigvecs[:, 1], eigvecs[:, 2], eigvecs[:, 0]])
        if np.linalg.det(R) < 0:
            R[:, 0] = -R[:, 0]
        rotated = centered @ R

        # Ensure heel-to-toe direction (more vertices at heel = lower Z)
        front_count = np.sum(rotated[:, 2] > 0)
        back_count = np.sum(rotated[:, 2] < 0)
        if front_count < back_count:
            rotated[:, 2] = -rotated[:, 2]

        return rotated
    except np.linalg.LinAlgError as e:
        logger.warning("PCA failed: %s", e)
        return None


# ─────────────────────────────────────────────
# Individual measurement extractors
# ─────────────────────────────────────────────


def _measure_width_at_section(
    vertices: np.ndarray,
    total_length: float,
    position_ratio: float,
    window_mm: float = 8.0,
) -> Optional[float]:
    """Measure X-axis width at a cross-section at the given length ratio.

    Returns ``None`` when the slice is too sparse to trust — the prior
    ``0.0`` sentinel violated the Pydantic ``ge=50.0`` bound on
    ``internal_width`` and also blew up ``compute_quality_score`` with
    ``ZeroDivisionError``.
    """
    z_center = total_length * position_ratio
    z_min = z_center - window_mm / 2
    z_max = z_center + window_mm / 2

    slice_verts = vertices[
        (vertices[:, 2] >= z_min) & (vertices[:, 2] <= z_max)
    ]
    if len(slice_verts) < 5:
        return None

    return float(slice_verts[:, 0].max() - slice_verts[:, 0].min())


def _measure_heel_cup_depth(
    vertices: np.ndarray, total_length: float
) -> Optional[float]:
    """Measure vertical wall height at the heel section (Z=0 to 15%).

    The heel cup depth is the difference between the highest point on
    the heel wall and the lowest point on the heel floor. Returns
    ``None`` for sparse heel slices (see ``_measure_width_at_section``).
    """
    heel_z_max = total_length * HEEL_SECTION_END
    heel_verts = vertices[vertices[:, 2] < heel_z_max]
    if len(heel_verts) < 10:
        return None

    return float(heel_verts[:, 1].max() - heel_verts[:, 1].min())


def _find_arch_peak_position(
    vertices: np.ndarray, total_length: float
) -> Optional[float]:
    """Find Z position where the inner floor curves upward the most.

    Scans the midfoot region (25-55% of length) and finds the Z where
    the floor height (min Y at that Z) is maximized. Returns ``None``
    when no midfoot slice has enough vertices to measure an arch peak.
    """
    best_z: Optional[float] = None
    best_height = float("-inf")

    start = total_length * ARCH_SEARCH_START
    end = total_length * ARCH_SEARCH_END
    step = 5.0  # 5mm resolution

    z = start
    while z < end:
        slice_verts = vertices[
            (vertices[:, 2] >= z - 3) & (vertices[:, 2] <= z + 3)
        ]
        if len(slice_verts) >= 5:
            floor_y = slice_verts[:, 1].min()
            if floor_y > best_height:
                best_height = floor_y
                best_z = z
        z += step

    return best_z


def _measure_toe_box_volume(
    vertices: np.ndarray, total_length: float
) -> Optional[float]:
    """Approximate toe box volume (70-100% of length) in milliliters.

    Uses axis-aligned bounding-box volume of the forefoot section
    converted from mm³ to mL (1 mL = 1000 mm³). Returns ``None``
    when the forefoot region has too few vertices.
    """
    z_min = total_length * TOE_BOX_START
    forefoot = vertices[vertices[:, 2] >= z_min]
    if len(forefoot) < 10:
        return None

    x_range = forefoot[:, 0].max() - forefoot[:, 0].min()
    y_range = forefoot[:, 1].max() - forefoot[:, 1].min()
    z_range = forefoot[:, 2].max() - forefoot[:, 2].min()

    volume_mm3 = x_range * y_range * z_range
    return volume_mm3 / 1000.0  # mL


def _measure_instep_clearance(
    vertices: np.ndarray, total_length: float
) -> Optional[float]:
    """Measure Y distance from floor to ceiling at the instep (60% length).

    This is the vertical space available for the foot's dorsal surface.
    Returns ``None`` for sparse instep slices.
    """
    z_center = total_length * INSTEP_POSITION
    window = 8.0

    slice_verts = vertices[
        (vertices[:, 2] >= z_center - window / 2)
        & (vertices[:, 2] <= z_center + window / 2)
    ]
    if len(slice_verts) < 5:
        return None

    return float(slice_verts[:, 1].max() - slice_verts[:, 1].min())


# ─────────────────────────────────────────────
# Quality scoring
# ─────────────────────────────────────────────


def compute_quality_score(
    mesh: o3d.geometry.TriangleMesh,
    measurements: Optional[dict],
) -> tuple[float, float]:
    """Compute overall scan quality score and estimated accuracy.

    Returns:
        (quality_score_0_100, estimated_accuracy_mm)
    """
    if measurements is None:
        return 0.0, 999.0

    vertex_count = len(np.asarray(mesh.vertices))
    triangle_count = len(np.asarray(mesh.triangles))

    # Quality heuristics
    vertex_score = min(100.0, (vertex_count / 5000.0) * 100.0)
    triangle_score = min(100.0, (triangle_count / 10000.0) * 100.0)

    # Sanity checks on measurements — individual fields may be None now
    # that _measure_* helpers propagate missing slices instead of 0.0.
    length = measurements.get("internal_length")
    width = measurements.get("internal_width")

    ratio_score = 100.0
    if length is not None and width is not None and width > 0:
        expected_ratio = length / width
        if expected_ratio < 2.0 or expected_ratio > 4.5:
            ratio_score = 50.0  # unusual proportions
    else:
        # Length or width missing/zero — fall back to a neutral score
        # rather than crashing on None comparison or ZeroDivisionError.
        ratio_score = 50.0

    quality = (vertex_score * 0.4 + triangle_score * 0.4 + ratio_score * 0.2)

    # Estimated accuracy: 2.6mm baseline (Hernandez 2017),
    # improved to 1.0mm with sufficient vertex density.
    if vertex_count > 10000:
        accuracy = 1.0
    elif vertex_count > 5000:
        accuracy = 1.8
    else:
        accuracy = 2.6

    return round(quality, 1), round(accuracy, 2)
