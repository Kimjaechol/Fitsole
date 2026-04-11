"""Shoe interior scanning API endpoints.

POST /shoe-scan/process - Accept shoe interior video, run SfM pipeline,
                          extract internal dimensions, return measurements.

Reuses the existing SfM pipeline from app.pipeline.sfm_reconstructor with
different scale calibration (patterned target instead of A4) and different
measurement extraction (cavity dimensions instead of foot dimensions).
"""

import logging
import re
import shutil
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, UploadFile

from app.pipeline.frame_extractor import extract_frames
from app.pipeline.mesh_generator import generate_mesh_from_reconstruction
from app.pipeline.quality_filter import filter_quality
from app.pipeline.sfm_reconstructor import run_sfm_pipeline
from app.shoe_scan.cavity_extractor import (
    compute_quality_score,
    extract_shoe_dimensions,
)
from app.shoe_scan.models import ShoeInternalDimensions, ShoeScanResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/shoe-scan", tags=["shoe-scan"])

# Limits and validation
MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500MB
ALLOWED_MIME_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-msvideo",
    "video/mpeg",
}

UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

# Pattern target for shoe interior calibration (80mm × 40mm checkerboard)
# In the current v1 we approximate pixels_per_mm from video resolution
# and apply a fixed calibration factor. A future enhancement will detect
# the actual printed pattern and compute exact scale.
DEFAULT_PIXELS_PER_MM = 3.0


@router.post("/process", response_model=ShoeScanResult)
async def process_shoe_scan(
    video: UploadFile,
    scanId: str = Form(...),
    brand: str = Form(...),
    modelName: str = Form(...),
    sizeBase: float = Form(...),
    variant: str = Form(""),
):
    """Process a shoe interior video and extract internal dimensions.

    The scanning workflow (for admins or wholesale partners):
    1. Place a patterned calibration target (80×40mm checkerboard) inside the shoe
    2. Insert LED ring light or external illumination
    3. Record a slow 20-30 second video panning the camera through the interior
    4. Upload to this endpoint

    The pipeline:
    1. Extract frames at 2 FPS
    2. Filter for blur/lighting quality
    3. Run pycolmap SfM reconstruction
    4. Generate Open3D mesh
    5. Extract cavity dimensions via cavity_extractor
    6. Return measurements + quality score

    Args:
        video: Shoe interior video file (mp4, quicktime, webm). Max 500MB.
        scanId: UUID for tracking this scan.
        brand: Shoe brand (e.g., "나이키").
        modelName: Shoe model name (e.g., "에어포스1").
        sizeBase: Korean size base (e.g., 270).
        variant: Optional variant description.

    Returns:
        ShoeScanResult with extracted dimensions or error details.
    """
    # Validate scanId format
    if not UUID_PATTERN.match(scanId):
        raise HTTPException(
            status_code=400,
            detail="Invalid scanId format. Must be UUID.",
        )

    # Validate MIME type
    if video.content_type and video.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {video.content_type}. Only video files accepted.",
        )

    work_dir = None
    try:
        work_dir = Path(tempfile.mkdtemp(prefix=f"fitsole_shoe_{scanId}_"))
        video_path = work_dir / "shoe_interior.mp4"

        # Save video with size check
        total_size = 0
        with open(video_path, "wb") as f:
            while chunk := await video.read(1024 * 1024):
                total_size += len(chunk)
                if total_size > MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024)}MB.",
                    )
                f.write(chunk)

        logger.info(
            "Saved shoe scan video (%d bytes) for %s %s %smm",
            total_size,
            brand,
            modelName,
            sizeBase,
        )

        # Step 1: Extract frames
        frames_dir = work_dir / "frames"
        frames_dir.mkdir(exist_ok=True)
        frame_paths = extract_frames(
            video_path=video_path,
            output_dir=frames_dir,
            target_fps=2.0,
        )

        if not frame_paths or len(frame_paths) < 10:
            return _fail_response(
                scanId,
                "Not enough frames extracted from video. "
                "Please record at least 10 seconds with steady panning.",
            )

        # Step 2: Filter for quality
        quality_frames = filter_quality(frame_paths)
        if len(quality_frames) < 8:
            return _fail_response(
                scanId,
                f"Only {len(quality_frames)} usable frames after quality filter. "
                "Improve lighting or stabilize camera.",
            )

        logger.info(
            "Kept %d/%d frames after quality filter",
            len(quality_frames),
            len(frame_paths),
        )

        # Step 3: SfM reconstruction
        sfm_dir = work_dir / "sfm"
        reconstruction = run_sfm_pipeline(
            frames_dir=frames_dir,
            output_dir=sfm_dir,
        )
        if reconstruction is None:
            return _fail_response(
                scanId,
                "3D reconstruction failed. The interior may be too dark "
                "or the camera motion was insufficient.",
            )

        # Step 4: Generate mesh
        mesh = generate_mesh_from_reconstruction(
            reconstruction=reconstruction,
            output_dir=work_dir / "mesh",
        )
        if mesh is None:
            return _fail_response(
                scanId,
                "Mesh generation failed from the 3D point cloud.",
            )

        # Step 5: Extract shoe dimensions (not foot dimensions!)
        measurements_dict = extract_shoe_dimensions(
            mesh=mesh,
            pixels_per_mm=DEFAULT_PIXELS_PER_MM,
        )

        # Step 6: Quality scoring
        quality, accuracy = compute_quality_score(mesh, measurements_dict)

        if measurements_dict is None:
            return ShoeScanResult(
                scan_id=scanId,
                status="failed",
                measurements=None,
                quality_score=quality,
                accuracy=accuracy,
                model_url=None,
                error_message="Could not extract dimensions from the reconstructed mesh.",
            )

        # Validate measurements against physical reasonable ranges
        length = measurements_dict["internal_length"]
        if abs(length - sizeBase) > 30:
            logger.warning(
                "Measured length %.1fmm differs from nominal %smm by > 30mm",
                length,
                sizeBase,
            )

        logger.info(
            "Shoe scan complete: %s %s %smm → length=%.1f width=%.1f arch=%.1f",
            brand,
            modelName,
            sizeBase,
            measurements_dict["internal_length"],
            measurements_dict["internal_width"],
            measurements_dict["arch_support_x"],
        )

        return ShoeScanResult(
            scan_id=scanId,
            status="success",
            measurements=ShoeInternalDimensions(**measurements_dict),
            quality_score=quality,
            accuracy=accuracy,
            model_url=None,  # future: upload mesh to S3
            error_message=None,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Shoe scan processing failed: %s", str(e))
        return _fail_response(scanId, f"Internal error: {str(e)}")
    finally:
        if work_dir and work_dir.exists():
            shutil.rmtree(work_dir, ignore_errors=True)


def _fail_response(scan_id: str, message: str) -> ShoeScanResult:
    """Build a failure response with zero measurements."""
    return ShoeScanResult(
        scan_id=scan_id,
        status="failed",
        measurements=None,
        quality_score=0.0,
        accuracy=999.0,
        model_url=None,
        error_message=message,
    )
