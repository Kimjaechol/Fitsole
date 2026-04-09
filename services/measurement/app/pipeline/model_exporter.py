"""3D model export module.

Exports Open3D mesh to GLB binary format using trimesh
for frontend visualization (RESEARCH discretion: GLB format).
"""

import logging
from pathlib import Path

import numpy as np
import open3d as o3d
import trimesh

logger = logging.getLogger(__name__)

# Target max file size per Pitfall 4
MAX_GLB_SIZE_BYTES = 5 * 1024 * 1024  # 5MB


def export_to_glb(
    mesh: o3d.geometry.TriangleMesh,
    output_path: Path,
) -> Path:
    """Convert Open3D mesh to GLB binary format.

    Per Pitfall 4: Target file size < 5MB for mobile performance.

    Args:
        mesh: Open3D TriangleMesh to export.
        output_path: Path for the output GLB file.

    Returns:
        Path to the exported GLB file.
    """
    vertices = np.asarray(mesh.vertices)
    faces = np.asarray(mesh.triangles)

    if len(vertices) == 0 or len(faces) == 0:
        logger.warning("Empty mesh, creating minimal GLB placeholder")
        # Create a minimal valid trimesh
        tri_mesh = trimesh.Trimesh(
            vertices=np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0]], dtype=np.float64),
            faces=np.array([[0, 1, 2]]),
        )
    else:
        # Convert Open3D mesh to trimesh
        tri_mesh = trimesh.Trimesh(
            vertices=vertices,
            faces=faces,
        )

        # Transfer vertex colors if available
        if mesh.has_vertex_colors():
            colors = np.asarray(mesh.vertex_colors)
            # Convert from [0,1] float to [0,255] uint8 with alpha channel
            rgba = np.column_stack([
                (colors * 255).astype(np.uint8),
                np.full(len(colors), 255, dtype=np.uint8),
            ])
            tri_mesh.visual.vertex_colors = rgba

    # Export as GLB (binary glTF)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    glb_data = tri_mesh.export(file_type="glb")
    output_path.write_bytes(glb_data)

    file_size = output_path.stat().st_size
    file_size_mb = file_size / (1024 * 1024)

    if file_size > MAX_GLB_SIZE_BYTES:
        logger.warning(
            "GLB file size %.1fMB exceeds target %dMB: %s",
            file_size_mb,
            MAX_GLB_SIZE_BYTES // (1024 * 1024),
            output_path,
        )
    else:
        logger.info("Exported GLB: %.1fMB -> %s", file_size_mb, output_path)

    return output_path
