"""Scan processing API endpoints."""

import logging
import re
import shutil
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from app.pipeline.a4_detector import calibrate_from_frames
from app.pipeline.frame_extractor import extract_frames
from app.pipeline.measurement_extractor import extract_measurements
from app.pipeline.mesh_generator import point_cloud_to_mesh
from app.pipeline.model_exporter import export_to_glb
from app.pipeline.quality_filter import compute_scan_quality, filter_frames
from app.pipeline.sfm_reconstructor import get_point_cloud, run_sfm_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/scan", tags=["scan"])

# Maximum upload size: 500MB (T-02-05 DoS mitigation)
MAX_UPLOAD_SIZE = 500 * 1024 * 1024

# Allowed video MIME types (T-02-04 Tampering mitigation)
ALLOWED_MIME_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-msvideo",
    "video/mpeg",
}

# UUID format validation pattern (T-02-06 Tampering mitigation)
UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


@router.post("/process")
async def process_scan(
    video: UploadFile,
    scanId: str,
    footSide: str,
):
    """
    Process a foot scan video through the SfM pipeline.

    Accepts a video file upload, extracts frames, runs A4 calibration,
    performs 3D reconstruction via COLMAP SfM, generates mesh,
    extracts measurements, and exports GLB model.

    Args:
        video: Uploaded video file (mp4, quicktime, webm)
        scanId: UUID identifier for the scan session
        footSide: Which foot ('left' or 'right')

    Returns:
        JSON with scanId, status, qualityScore, qualityLabel,
        measurements dict (6 values), and modelUrl.
    """
    # T-02-06: Validate scanId as UUID format
    if not UUID_PATTERN.match(scanId):
        raise HTTPException(status_code=400, detail="Invalid scanId format. Must be UUID.")

    # Validate footSide
    if footSide not in ("left", "right"):
        raise HTTPException(status_code=400, detail="footSide must be 'left' or 'right'.")

    # T-02-04: Validate MIME type
    if video.content_type and video.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {video.content_type}. Only video files accepted.",
        )

    work_dir = None
    try:
        # Create isolated temp directory for this scan
        work_dir = Path(tempfile.mkdtemp(prefix=f"fitsole_scan_{scanId}_"))
        video_path = work_dir / "input_video.mp4"
        frames_dir = work_dir / "frames"
        sfm_output_dir = work_dir / "sfm"
        frames_dir.mkdir()
        sfm_output_dir.mkdir()

        # T-02-05: Save uploaded video with size check
        total_size = 0
        with open(video_path, "wb") as f:
            while chunk := await video.read(1024 * 1024):  # 1MB chunks
                total_size += len(chunk)
                if total_size > MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024)}MB.",
                    )
                f.write(chunk)

        logger.info("Saved video (%d bytes) for scan %s", total_size, scanId)

        # Step 1: Extract frames from video at 2 FPS
        frame_paths = extract_frames(video_path, frames_dir, fps=2.0)
        if not frame_paths:
            raise HTTPException(status_code=422, detail="No frames could be extracted from video.")

        # Step 2: Quality filter frames
        good_frames, quality_reports = filter_frames(frame_paths)
        quality_score, quality_label = compute_scan_quality(quality_reports)

        if not good_frames:
            return {
                "scanId": scanId,
                "status": "failed",
                "qualityScore": quality_score,
                "qualityLabel": quality_label,
                "measurements": None,
                "modelUrl": None,
                "error": "All frames failed quality check. Please re-scan with better lighting and slower motion.",
            }

        # Step 3: A4 paper detection and calibration
        pixels_per_mm = calibrate_from_frames(good_frames)
        if pixels_per_mm is None:
            return {
                "scanId": scanId,
                "status": "failed",
                "qualityScore": quality_score,
                "qualityLabel": quality_label,
                "measurements": None,
                "modelUrl": None,
                "error": "A4 paper not detected. Please ensure A4 paper is visible in the frame.",
            }

        # Step 4: COLMAP SfM reconstruction
        reconstruction = run_sfm_pipeline(frames_dir=frames_dir, output_dir=sfm_output_dir)
        if reconstruction is None:
            return {
                "scanId": scanId,
                "status": "failed",
                "qualityScore": quality_score,
                "qualityLabel": quality_label,
                "measurements": None,
                "modelUrl": None,
                "error": "3D reconstruction failed. Please re-scan with more overlap between frames.",
            }

        # Step 5: Extract point cloud and generate mesh
        points, colors = get_point_cloud(reconstruction)
        mesh = point_cloud_to_mesh(points, colors)

        # Step 6: Extract foot measurements
        measurements = extract_measurements(mesh, pixels_per_mm)

        # Step 7: Export GLB model
        glb_path = work_dir / f"{scanId}_{footSide}.glb"
        export_to_glb(mesh, glb_path)

        # TODO: Upload GLB to S3/R2 and return public URL
        model_url = f"/models/{scanId}_{footSide}.glb"

        logger.info(
            "Scan %s completed: quality=%.1f (%s), measurements=%s",
            scanId,
            quality_score,
            quality_label,
            measurements,
        )

        return {
            "scanId": scanId,
            "status": "completed",
            "qualityScore": quality_score,
            "qualityLabel": quality_label,
            "measurements": measurements,
            "modelUrl": model_url,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Scan processing failed for %s: %s", scanId, str(e))
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        # T-02-05: Clean up temp directory
        if work_dir and work_dir.exists():
            shutil.rmtree(work_dir, ignore_errors=True)
