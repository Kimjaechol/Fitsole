"""Mesh generation from 3D point cloud.

Converts SfM point cloud to triangle mesh using Open3D
Poisson surface reconstruction with decimation for GLB export.
"""

import logging

import numpy as np
import open3d as o3d

logger = logging.getLogger(__name__)

# Per Pitfall 4: limit sizes for mobile performance
MAX_POINT_CLOUD_SIZE = 50_000
MAX_MESH_FACES = 20_000


def point_cloud_to_mesh(
    points: np.ndarray,
    colors: np.ndarray | None = None,
) -> o3d.geometry.TriangleMesh:
    """Convert point cloud to triangle mesh via Poisson reconstruction.

    Per RESEARCH Pitfall 4: Decimate point cloud to ~50K points,
    simplify mesh to ~20K faces for GLB < 5MB target.

    Args:
        points: Nx3 numpy array of 3D point positions.
        colors: Nx3 numpy array of RGB colors (0-255), or None.

    Returns:
        Open3D TriangleMesh with vertex colors if available.
    """
    if points.shape[0] == 0:
        logger.warning("Empty point cloud, returning empty mesh")
        return o3d.geometry.TriangleMesh()

    # Create Open3D point cloud
    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(points)

    if colors is not None and len(colors) == len(points):
        # Open3D expects colors in [0, 1] range
        pcd.colors = o3d.utility.Vector3dVector(colors.astype(np.float64) / 255.0)

    # Decimate if point cloud is too large (Pitfall 4)
    if len(pcd.points) > MAX_POINT_CLOUD_SIZE:
        logger.info(
            "Decimating point cloud: %d -> %d points",
            len(pcd.points),
            MAX_POINT_CLOUD_SIZE,
        )
        ratio = MAX_POINT_CLOUD_SIZE / len(pcd.points)
        pcd = pcd.random_down_sample(ratio)

    # Estimate normals (required for Poisson reconstruction)
    logger.info("Estimating normals for %d points", len(pcd.points))
    pcd.estimate_normals(
        search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=0.1, max_nn=30)
    )
    pcd.orient_normals_consistent_tangent_plane(k=15)

    # Poisson surface reconstruction
    logger.info("Running Poisson surface reconstruction")
    mesh, densities = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(
        pcd, depth=8
    )

    # Remove low-density vertices (artifacts at reconstruction boundaries)
    densities_array = np.asarray(densities)
    if len(densities_array) > 0:
        density_threshold = np.quantile(densities_array, 0.01)
        vertices_to_remove = densities_array < density_threshold
        mesh.remove_vertices_by_mask(vertices_to_remove)

    # Simplify mesh to target face count (Pitfall 4: GLB < 5MB)
    current_triangles = len(mesh.triangles)
    if current_triangles > MAX_MESH_FACES:
        logger.info(
            "Simplifying mesh: %d -> %d faces",
            current_triangles,
            MAX_MESH_FACES,
        )
        mesh = mesh.simplify_quadric_decimation(target_number_of_triangles=MAX_MESH_FACES)

    # Clean up mesh
    mesh.remove_degenerate_triangles()
    mesh.remove_duplicated_triangles()
    mesh.remove_duplicated_vertices()
    mesh.remove_non_manifold_edges()

    logger.info(
        "Mesh generated: %d vertices, %d faces",
        len(mesh.vertices),
        len(mesh.triangles),
    )

    return mesh
