"""COLMAP SfM 3D reconstruction module.

Runs Structure-from-Motion pipeline using pycolmap to reconstruct
3D point cloud from extracted video frames (D-01, D-03, D-04, SCAN-04).
"""

import logging
from pathlib import Path

import numpy as np
import pycolmap

logger = logging.getLogger(__name__)


def run_sfm_pipeline(
    frames_dir: Path,
    output_dir: Path,
) -> pycolmap.Reconstruction | None:
    """Run COLMAP incremental SfM pipeline on extracted frames.

    Per RESEARCH Pattern 1 and D-04:
    1. SIFT feature extraction
    2. Sequential matching (NOT exhaustive per Pitfall 2 -- video frames
       have natural temporal overlap)
    3. Incremental mapping (bundle adjustment)

    Args:
        frames_dir: Directory containing extracted frame JPEG files.
        output_dir: Directory for SfM output files (database, sparse model).

    Returns:
        pycolmap.Reconstruction object, or None on failure.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    database_path = output_dir / "database.db"

    try:
        # Step 1: SIFT feature extraction (D-04)
        logger.info("Starting SIFT feature extraction from %s", frames_dir)
        sift_options = pycolmap.SiftExtractionOptions()
        sift_options.max_num_features = 8192  # Dense features for foot detail

        pycolmap.extract_features(
            database_path=database_path,
            image_path=frames_dir,
            sift_options=sift_options,
        )
        logger.info("Feature extraction complete")

        # Step 2: Sequential matching (NOT exhaustive -- Pitfall 2)
        # Video frames have natural temporal order and overlap
        logger.info("Starting sequential feature matching")
        sequential_options = pycolmap.SequentialMatchingOptions()
        sequential_options.overlap = 10  # Match with 10 neighboring frames
        sequential_options.loop_detection = False  # Not needed for short sequences

        pycolmap.match_sequential(
            database_path=database_path,
            matching_options=sequential_options,
        )
        logger.info("Sequential matching complete")

        # Step 3: Incremental mapping (bundle adjustment)
        logger.info("Starting incremental mapping")
        mapper_options = pycolmap.IncrementalPipelineOptions()
        mapper_options.min_num_matches = 15

        reconstructions = pycolmap.incremental_mapping(
            database_path=database_path,
            image_path=frames_dir,
            output_path=output_dir,
            options=mapper_options,
        )

        if not reconstructions:
            logger.warning("No reconstructions produced")
            return None

        # Return the first (usually largest) reconstruction
        reconstruction = reconstructions[0]
        num_points = len(reconstruction.points3D)
        num_images = len(reconstruction.images)
        logger.info(
            "SfM reconstruction complete: %d 3D points, %d registered images",
            num_points,
            num_images,
        )

        return reconstruction

    except Exception as e:
        logger.exception("SfM pipeline failed: %s", str(e))
        return None


def get_point_cloud(
    reconstruction: pycolmap.Reconstruction,
) -> tuple[np.ndarray, np.ndarray | None]:
    """Extract 3D points and colors from COLMAP reconstruction.

    Args:
        reconstruction: pycolmap.Reconstruction from incremental_mapping.

    Returns:
        Tuple of (points Nx3 array, colors Nx3 array or None).
    """
    points_list = []
    colors_list = []

    for point_id, point in reconstruction.points3D.items():
        points_list.append(point.xyz)
        if hasattr(point, "color") and point.color is not None:
            colors_list.append(point.color)

    if not points_list:
        logger.warning("No 3D points in reconstruction")
        return np.empty((0, 3)), None

    points = np.array(points_list, dtype=np.float64)

    colors = None
    if colors_list and len(colors_list) == len(points_list):
        colors = np.array(colors_list, dtype=np.uint8)

    logger.info("Extracted %d 3D points from reconstruction", len(points))

    return points, colors
