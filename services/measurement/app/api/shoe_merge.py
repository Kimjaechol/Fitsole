"""Shoe scan merging and grading API endpoints.

POST /shoe-scan/merge       - Merge Revopoint partial scan + alginate cast scan
POST /shoe-scan/grade       - Derive all sizes of a model from base scan
GET  /shoe-scan/grade/{id}  - Get graded dimensions for a specific target size
"""

from __future__ import annotations

import logging
import re
import shutil
import tempfile
from pathlib import Path
from typing import Optional

import numpy as np
import open3d as o3d
from fastapi import APIRouter, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.shoe_scan.cavity_extractor import (
    compute_quality_score,
    extract_shoe_dimensions,
)
from app.shoe_scan.grading import (
    GradingAnchor,
    ShoeDimensions,
    grade_linear,
    grade_piecewise,
    validate_anchor_consistency,
)
from app.shoe_scan.mesh_merger import (
    MergeResult,
    merge_partial_scans,
    resolve_all_dimensions,
)
from app.shoe_scan.models import ShoeInternalDimensions

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/shoe-scan", tags=["shoe-scan"])

MAX_UPLOAD_SIZE = 200 * 1024 * 1024  # 200MB per mesh file
ALLOWED_MESH_EXTENSIONS = {".stl", ".obj", ".ply", ".gltf", ".glb"}

UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

# Revopoint outputs in mm — no pixel-to-mm conversion needed
REVOPOINT_PIXELS_PER_MM = 1.0


# ─────────────────────────────────────────────
# Request/Response models
# ─────────────────────────────────────────────


class MergeResponse(BaseModel):
    """Response for partial scan merge endpoint."""

    scan_id: str
    success: bool
    alignment_rmse: float = Field(..., description="ICP alignment RMSE (mm)")
    overlap_percentage: float = Field(..., description="Surface overlap (%)")
    discrepancy_count: int
    warnings: list[str]
    resolved_dimensions: Optional[ShoeInternalDimensions] = None
    resolution_report: Optional[dict] = None
    quality_score: float = 0.0
    accuracy_estimate: float = 999.0


class GradeRequest(BaseModel):
    """Request to derive dimensions at a target size from base scans."""

    anchors: list[dict] = Field(
        ...,
        description="List of {size_base, dimensions} anchor scans",
        min_length=1,
    )
    target_sizes: list[float] = Field(
        ...,
        description="List of target sizes (mm) to predict",
        min_length=1,
    )


class GradeResponse(BaseModel):
    """Response with graded dimensions per target size."""

    anchors_used: int
    predictions: dict  # {target_size_str: ShoeInternalDimensions}
    validation_warnings: list[str]
    used_piecewise: bool


# ─────────────────────────────────────────────
# POST /shoe-scan/merge
# ─────────────────────────────────────────────


@router.post("/merge", response_model=MergeResponse)
async def merge_shoe_scans(
    revopoint_mesh: UploadFile,
    cast_mesh: UploadFile,
    scanId: str = Form(...),
):
    """Merge a Revopoint partial interior scan with an alginate cast scan.

    The Revopoint scan captures the visible interior (usually the opening area
    down to midfoot). The alginate cast scan captures the full interior volume
    including blind spots (toe box, deep heel). This endpoint aligns both
    meshes and resolves discrepancies to produce a single unified measurement.

    Args:
        revopoint_mesh: STL/OBJ/PLY file from direct Revopoint scan
        cast_mesh: STL/OBJ/PLY file from Revopoint scanning the alginate cast
        scanId: UUID tracking this scan session

    Returns:
        Unified dimensions with confidence scores per measurement.
    """
    # Validate scanId
    if not UUID_PATTERN.match(scanId):
        raise HTTPException(status_code=400, detail="Invalid scanId format")

    # Validate file extensions
    _validate_mesh_file(revopoint_mesh, "revopoint_mesh")
    _validate_mesh_file(cast_mesh, "cast_mesh")

    work_dir = Path(tempfile.mkdtemp(prefix=f"fitsole_merge_{scanId}_"))
    try:
        # Save both uploaded files
        revopoint_path = await _save_upload(
            revopoint_mesh, work_dir / "revopoint_raw.obj"
        )
        cast_path = await _save_upload(cast_mesh, work_dir / "cast_raw.obj")

        # Load meshes
        revopoint = o3d.io.read_triangle_mesh(str(revopoint_path))
        cast = o3d.io.read_triangle_mesh(str(cast_path))

        if len(np.asarray(revopoint.vertices)) < 100:
            raise HTTPException(
                status_code=422,
                detail="Revopoint mesh has too few vertices (< 100)",
            )

        if len(np.asarray(cast.vertices)) < 100:
            raise HTTPException(
                status_code=422,
                detail="Cast mesh has too few vertices (< 100)",
            )

        logger.info(
            "Merge request %s: Revopoint=%d verts, Cast=%d verts",
            scanId,
            len(np.asarray(revopoint.vertices)),
            len(np.asarray(cast.vertices)),
        )

        # Step 1: Merge meshes
        merge_result: MergeResult = merge_partial_scans(
            revopoint_mesh=revopoint,
            cast_mesh=cast,
        )

        if not merge_result.success or merge_result.merged_mesh is None:
            return MergeResponse(
                scan_id=scanId,
                success=False,
                alignment_rmse=merge_result.alignment_rmse,
                overlap_percentage=merge_result.overlap_percentage,
                discrepancy_count=len(merge_result.discrepancies),
                warnings=merge_result.warnings,
                resolved_dimensions=None,
                resolution_report=None,
            )

        # Step 2: Extract dimensions from BOTH meshes independently
        rev_dims = extract_shoe_dimensions(revopoint, REVOPOINT_PIXELS_PER_MM)
        cast_dims = extract_shoe_dimensions(cast, REVOPOINT_PIXELS_PER_MM)

        # Step 3: Resolve discrepancies (the user's key requirement)
        resolved, report = resolve_all_dimensions(rev_dims, cast_dims)

        # Step 4: Compute quality score on merged mesh
        quality, accuracy = compute_quality_score(
            merge_result.merged_mesh, resolved
        )

        logger.info(
            "Merge complete %s: RMSE=%.2f overlap=%.1f%% quality=%.1f",
            scanId,
            merge_result.alignment_rmse,
            merge_result.overlap_percentage,
            quality,
        )

        return MergeResponse(
            scan_id=scanId,
            success=True,
            alignment_rmse=merge_result.alignment_rmse,
            overlap_percentage=merge_result.overlap_percentage,
            discrepancy_count=len(merge_result.discrepancies),
            warnings=merge_result.warnings,
            resolved_dimensions=ShoeInternalDimensions(**resolved),
            resolution_report=report,
            quality_score=quality,
            accuracy_estimate=accuracy,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Merge failed for %s: %s", scanId, str(e))
        raise HTTPException(status_code=500, detail=f"Merge failed: {str(e)}")
    finally:
        if work_dir.exists():
            shutil.rmtree(work_dir, ignore_errors=True)


# ─────────────────────────────────────────────
# POST /shoe-scan/grade
# ─────────────────────────────────────────────


@router.post("/grade", response_model=GradeResponse)
async def grade_shoe_sizes(request: GradeRequest):
    """Derive all shoe sizes of a model from 1+ base scans.

    Given one or more anchor scans (e.g., you scanned just 270mm),
    predict the internal dimensions for any target size (e.g., 240, 250,
    260, 280, 290) using industry-standard grading rules.

    Args:
        request: GradeRequest with anchors and target_sizes

    Returns:
        Predicted dimensions per target size + validation warnings.

    Example:
        Input: anchors=[{size_base: 270, dimensions: {...270mm data...}}]
               target_sizes=[240, 250, 260, 280, 290]
        Output: predictions for all 5 sizes calculated via grading rules.
    """
    try:
        # Convert request anchors to GradingAnchor objects
        anchor_objs = []
        for a in request.anchors:
            dims_data = a.get("dimensions", {})
            dims = ShoeDimensions(
                internal_length=float(dims_data.get("internal_length", 0)),
                internal_width=float(dims_data.get("internal_width", 0)),
                heel_cup_depth=float(dims_data.get("heel_cup_depth", 0)),
                arch_support_x=float(dims_data.get("arch_support_x", 0)),
                toe_box_volume=float(dims_data.get("toe_box_volume", 0)),
                instep_clearance=float(dims_data.get("instep_clearance", 0)),
            )
            anchor_objs.append(
                GradingAnchor(size_base=float(a["size_base"]), dimensions=dims)
            )

        if not anchor_objs:
            raise HTTPException(
                status_code=400, detail="At least one anchor is required"
            )

        # Validate anchor consistency
        is_consistent, validation_warnings = validate_anchor_consistency(anchor_objs)
        use_piecewise = len(anchor_objs) >= 2 and is_consistent

        # Predict each target size
        predictions: dict = {}
        for target in request.target_sizes:
            if use_piecewise:
                predicted = grade_piecewise(anchor_objs, float(target))
            else:
                base = anchor_objs[0]
                predicted = grade_linear(
                    base.size_base, base.dimensions, float(target)
                )

            predictions[str(target)] = {
                "internal_length": predicted.internal_length,
                "internal_width": predicted.internal_width,
                "heel_cup_depth": predicted.heel_cup_depth,
                "arch_support_x": predicted.arch_support_x,
                "toe_box_volume": predicted.toe_box_volume,
                "instep_clearance": predicted.instep_clearance,
            }

        logger.info(
            "Graded %d sizes from %d anchors (piecewise=%s)",
            len(request.target_sizes),
            len(anchor_objs),
            use_piecewise,
        )

        return GradeResponse(
            anchors_used=len(anchor_objs),
            predictions=predictions,
            validation_warnings=validation_warnings,
            used_piecewise=use_piecewise,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Grading failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Grading failed: {str(e)}")


# ─────────────────────────────────────────────
# Helper functions
# ─────────────────────────────────────────────


def _validate_mesh_file(file: UploadFile, field_name: str) -> None:
    """Validate a mesh file upload by extension."""
    if not file.filename:
        raise HTTPException(
            status_code=400, detail=f"{field_name} has no filename"
        )

    ext = "." + file.filename.split(".")[-1].lower()
    if ext not in ALLOWED_MESH_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} has invalid extension {ext}. "
            f"Allowed: {', '.join(sorted(ALLOWED_MESH_EXTENSIONS))}",
        )


async def _save_upload(file: UploadFile, dest: Path) -> Path:
    """Save an UploadFile to disk with size check."""
    total = 0
    with open(dest, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            total += len(chunk)
            if total > MAX_UPLOAD_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Max {MAX_UPLOAD_SIZE // (1024 * 1024)}MB",
                )
            f.write(chunk)
    return dest
