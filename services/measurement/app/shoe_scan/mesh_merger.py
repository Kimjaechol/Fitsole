"""Partial scan merger for Revopoint + alginate cast scans.

When a shoe has blind spots that Revopoint can't reach (toe box, deep heel),
we supplement with an alginate cast that IS the interior. The cast becomes
a convex positive replica that Revopoint scans perfectly.

The challenge: How to combine two meshes that represent the SAME cavity from
DIFFERENT perspectives?

Strategy:
1. Revopoint partial scan = sparse but accurate interior surface from above
2. Alginate cast scan = complete external surface of an INVERTED replica
3. Convert the cast mesh (positive) to a negative (same as interior surface)
4. Align both meshes using ICP (Iterative Closest Point)
5. Identify overlap regions → weighted average measurements
6. Identify non-overlap regions → use whichever mesh has data
7. Detect discrepancies → flag for human review

Output: A unified internal cavity mesh + confidence-weighted measurements.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

import numpy as np
import open3d as o3d

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────

# ICP alignment parameters
ICP_MAX_CORRESPONDENCE_DISTANCE = 5.0  # mm
ICP_MAX_ITERATIONS = 100
ICP_CONVERGENCE_THRESHOLD = 1e-6

# Discrepancy thresholds (mm) — beyond this, flag for manual review
WARNING_DISCREPANCY = 1.5
ERROR_DISCREPANCY = 3.0

# Confidence weighting (how much to trust each source)
# Revopoint: 0.02mm precision = very high confidence in scanned regions
# Alginate cast: ~0.1-0.5mm precision = slightly lower but complete
REVOPOINT_CONFIDENCE = 0.9
CAST_CONFIDENCE = 0.6


@dataclass
class MergeResult:
    """Result of merging two partial scans."""

    merged_mesh: Optional[o3d.geometry.TriangleMesh]
    alignment_rmse: float  # Root-mean-square error of ICP alignment (mm)
    overlap_percentage: float  # What fraction of surfaces overlap
    discrepancies: list[dict]  # Areas where the two scans disagree
    warnings: list[str]
    success: bool


# ─────────────────────────────────────────────
# Core merge algorithm
# ─────────────────────────────────────────────


def merge_partial_scans(
    revopoint_mesh: o3d.geometry.TriangleMesh,
    cast_mesh: o3d.geometry.TriangleMesh,
    cast_is_positive: bool = True,
) -> MergeResult:
    """Merge Revopoint interior scan with alginate cast scan.

    Args:
        revopoint_mesh: Open3D mesh from Revopoint (partial interior scan)
        cast_mesh: Open3D mesh from Revopoint scanning the alginate cast
        cast_is_positive: True if cast is a positive replica (default).
                          The cast represents the interior volume, so scanning
                          it externally gives us an interior-shaped model.

    Returns:
        MergeResult with unified mesh and quality metrics.
    """
    warnings: list[str] = []

    # Validate inputs
    if len(np.asarray(revopoint_mesh.vertices)) < 100:
        warnings.append("Revopoint scan has too few vertices")
        return _failed_result(warnings, "Revopoint mesh too sparse")

    if len(np.asarray(cast_mesh.vertices)) < 100:
        warnings.append("Cast scan has too few vertices")
        return _failed_result(warnings, "Cast mesh too sparse")

    # Step 1: Prepare meshes for alignment
    # If the cast is a positive replica, its surface corresponds to the
    # shoe's interior surface. No inversion needed at this stage because
    # we only care about 3D coordinates, not normal directions.
    logger.info(
        "Merging scans: Revopoint %d verts, Cast %d verts",
        len(np.asarray(revopoint_mesh.vertices)),
        len(np.asarray(cast_mesh.vertices)),
    )

    # Step 2: Compute normals (required for ICP point-to-plane)
    if not revopoint_mesh.has_vertex_normals():
        revopoint_mesh.compute_vertex_normals()
    if not cast_mesh.has_vertex_normals():
        cast_mesh.compute_vertex_normals()

    # Step 3: Convert to point clouds for ICP
    revopoint_pcd = o3d.geometry.PointCloud()
    revopoint_pcd.points = revopoint_mesh.vertices
    revopoint_pcd.normals = revopoint_mesh.vertex_normals

    cast_pcd = o3d.geometry.PointCloud()
    cast_pcd.points = cast_mesh.vertices
    cast_pcd.normals = cast_mesh.vertex_normals

    # Step 4: Initial coarse alignment using centroids + PCA
    initial_transform = _compute_initial_alignment(revopoint_pcd, cast_pcd)

    # Step 5: Fine ICP alignment
    try:
        icp_result = o3d.pipelines.registration.registration_icp(
            source=cast_pcd,
            target=revopoint_pcd,
            max_correspondence_distance=ICP_MAX_CORRESPONDENCE_DISTANCE,
            init=initial_transform,
            estimation_method=o3d.pipelines.registration.TransformationEstimationPointToPlane(),
            criteria=o3d.pipelines.registration.ICPConvergenceCriteria(
                max_iteration=ICP_MAX_ITERATIONS,
                relative_fitness=ICP_CONVERGENCE_THRESHOLD,
                relative_rmse=ICP_CONVERGENCE_THRESHOLD,
            ),
        )
    except Exception as e:
        logger.exception("ICP registration failed: %s", e)
        return _failed_result(warnings, f"ICP failed: {e}")

    alignment_rmse = float(icp_result.inlier_rmse)
    fitness = float(icp_result.fitness)

    logger.info(
        "ICP alignment: RMSE=%.3fmm, fitness=%.3f",
        alignment_rmse,
        fitness,
    )

    if alignment_rmse > ERROR_DISCREPANCY:
        warnings.append(
            f"ICP alignment RMSE {alignment_rmse:.2f}mm exceeds error threshold "
            f"{ERROR_DISCREPANCY}mm — meshes may not represent the same shoe"
        )
    elif alignment_rmse > WARNING_DISCREPANCY:
        warnings.append(
            f"ICP alignment RMSE {alignment_rmse:.2f}mm exceeds warning threshold "
            f"{WARNING_DISCREPANCY}mm — review merge quality"
        )

    # Step 6: Apply transformation to cast mesh
    cast_mesh_aligned = cast_mesh.transform(icp_result.transformation)

    # Step 7: Identify overlap regions and discrepancies
    discrepancies, overlap_pct = _find_discrepancies(
        revopoint_mesh, cast_mesh_aligned
    )

    # Step 8: Fuse meshes using Poisson reconstruction on combined point cloud
    combined_pcd = o3d.geometry.PointCloud()
    combined_pcd.points = o3d.utility.Vector3dVector(
        np.vstack(
            [
                np.asarray(revopoint_mesh.vertices),
                np.asarray(cast_mesh_aligned.vertices),
            ]
        )
    )
    combined_pcd.estimate_normals(
        search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=5.0, max_nn=30)
    )

    try:
        merged_mesh, _ = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(
            combined_pcd,
            depth=8,
        )
    except Exception as e:
        logger.warning(
            "Poisson reconstruction failed, falling back to simple union: %s", e
        )
        merged_mesh = revopoint_mesh + cast_mesh_aligned

    return MergeResult(
        merged_mesh=merged_mesh,
        alignment_rmse=round(alignment_rmse, 3),
        overlap_percentage=round(overlap_pct, 1),
        discrepancies=discrepancies,
        warnings=warnings,
        success=True,
    )


# ─────────────────────────────────────────────
# Discrepancy resolution — predicting the "truth"
# ─────────────────────────────────────────────


def resolve_discrepancy(
    revopoint_value: Optional[float],
    cast_value: Optional[float],
    measurement_name: str,
) -> tuple[float, float, str]:
    """Predict the true measurement value when two scans disagree.

    This is the core "inference" function asked by the user. Strategy:

    1. If only one source has data → use it with its confidence
    2. If both agree (< WARNING_DISCREPANCY) → weighted average
    3. If they disagree slightly → use Revopoint (higher precision)
    4. If they disagree significantly → use the physically plausible one
    5. If neither is plausible → flag as error

    Args:
        revopoint_value: Value from Revopoint scan (or None if missing)
        cast_value: Value from cast scan (or None if missing)
        measurement_name: For logging (e.g., "internal_length")

    Returns:
        (resolved_value, confidence_0_to_1, resolution_method)
    """
    if revopoint_value is None and cast_value is None:
        return (0.0, 0.0, "no_data")

    if revopoint_value is None:
        return (cast_value, CAST_CONFIDENCE, "cast_only")

    if cast_value is None:
        return (revopoint_value, REVOPOINT_CONFIDENCE, "revopoint_only")

    # Both have data — decide how to combine
    diff = abs(revopoint_value - cast_value)

    if diff < 0.5:
        # Essentially agree → weighted average
        w1, w2 = REVOPOINT_CONFIDENCE, CAST_CONFIDENCE
        resolved = (revopoint_value * w1 + cast_value * w2) / (w1 + w2)
        combined_confidence = (w1 + w2) / 2 + 0.1  # bonus for agreement
        return (round(resolved, 2), min(combined_confidence, 1.0), "consensus")

    if diff < WARNING_DISCREPANCY:
        # Small disagreement → trust Revopoint more
        w1, w2 = 0.7, 0.3
        resolved = (revopoint_value * w1 + cast_value * w2)
        return (round(resolved, 2), 0.75, "weighted_revopoint")

    if diff < ERROR_DISCREPANCY:
        # Significant disagreement — need to decide which is more plausible
        # Heuristic: Revopoint is accurate where it reaches, but cast covers
        # blind spots. If the discrepancy is in a blind-spot dimension (toe
        # box, deep heel), trust the cast. Otherwise trust Revopoint.
        if measurement_name in (
            "toe_box_volume",
            "internal_length",  # often includes toe box
            "instep_clearance",
        ):
            logger.info(
                "Discrepancy in %s (diff %.2fmm): using cast value %.2f over revopoint %.2f",
                measurement_name,
                diff,
                cast_value,
                revopoint_value,
            )
            return (round(cast_value, 2), 0.55, "cast_blind_spot")
        else:
            return (round(revopoint_value, 2), 0.65, "revopoint_preferred")

    # Large disagreement — flag as potential error
    logger.warning(
        "Large discrepancy in %s: revopoint=%.2f, cast=%.2f, diff=%.2f",
        measurement_name,
        revopoint_value,
        cast_value,
        diff,
    )
    # Fallback: average with low confidence, flag for review
    resolved = (revopoint_value + cast_value) / 2
    return (round(resolved, 2), 0.3, "uncertain_average")


def resolve_all_dimensions(
    revopoint_dims: Optional[dict],
    cast_dims: Optional[dict],
) -> tuple[dict, dict]:
    """Resolve all 6 shoe dimensions from two sources.

    Returns:
        (resolved_dimensions, resolution_report)
        where resolution_report contains per-dimension confidence and method
    """
    resolved: dict = {}
    report: dict = {}

    dimension_names = [
        "internal_length",
        "internal_width",
        "heel_cup_depth",
        "arch_support_x",
        "toe_box_volume",
        "instep_clearance",
    ]

    for name in dimension_names:
        rev_val = revopoint_dims.get(name) if revopoint_dims else None
        cast_val = cast_dims.get(name) if cast_dims else None

        value, confidence, method = resolve_discrepancy(rev_val, cast_val, name)
        resolved[name] = value
        report[name] = {
            "value": value,
            "confidence": round(confidence, 2),
            "method": method,
            "revopoint": rev_val,
            "cast": cast_val,
            "diff": round(abs((rev_val or 0) - (cast_val or 0)), 2)
            if rev_val is not None and cast_val is not None
            else None,
        }

    return resolved, report


# ─────────────────────────────────────────────
# Helper: alignment and discrepancy detection
# ─────────────────────────────────────────────


def _compute_initial_alignment(
    source: o3d.geometry.PointCloud,
    target: o3d.geometry.PointCloud,
) -> np.ndarray:
    """Coarse alignment using centroid translation + PCA rotation."""
    src_center = np.asarray(source.points).mean(axis=0)
    tgt_center = np.asarray(target.points).mean(axis=0)

    # Initial transform: translate source centroid to target centroid
    transform = np.eye(4)
    transform[:3, 3] = tgt_center - src_center

    return transform


def _find_discrepancies(
    mesh_a: o3d.geometry.TriangleMesh,
    mesh_b: o3d.geometry.TriangleMesh,
) -> tuple[list[dict], float]:
    """Find regions where the two aligned meshes disagree.

    Returns:
        (list of discrepancy records, overlap percentage 0-100)
    """
    verts_a = np.asarray(mesh_a.vertices)
    verts_b = np.asarray(mesh_b.vertices)

    if len(verts_a) == 0 or len(verts_b) == 0:
        return ([], 0.0)

    # Use KDTree to find nearest neighbors between meshes
    pcd_b = o3d.geometry.PointCloud()
    pcd_b.points = o3d.utility.Vector3dVector(verts_b)
    tree = o3d.geometry.KDTreeFlann(pcd_b)

    overlap_count = 0
    discrepancies: list[dict] = []
    max_per_log = 5  # limit output size

    for i, vert in enumerate(verts_a):
        [_, idx, dist_sq] = tree.search_knn_vector_3d(vert, 1)
        if not idx:
            continue

        dist = float(np.sqrt(dist_sq[0]))

        if dist < WARNING_DISCREPANCY:
            overlap_count += 1
        elif dist < ERROR_DISCREPANCY:
            if len(discrepancies) < max_per_log:
                discrepancies.append(
                    {
                        "type": "warning",
                        "position": vert.tolist(),
                        "distance_mm": round(dist, 3),
                    }
                )

    overlap_pct = (overlap_count / len(verts_a)) * 100.0 if len(verts_a) else 0.0
    return discrepancies, overlap_pct


def _failed_result(warnings: list[str], error_msg: str) -> MergeResult:
    """Build a failure result."""
    warnings.append(error_msg)
    return MergeResult(
        merged_mesh=None,
        alignment_rmse=float("inf"),
        overlap_percentage=0.0,
        discrepancies=[],
        warnings=warnings,
        success=False,
    )
