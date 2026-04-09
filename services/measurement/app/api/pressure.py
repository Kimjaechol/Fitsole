"""Pressure distribution estimation API endpoints.

POST /pressure/estimate - Estimate plantar pressure from biometric inputs.
"""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.pressure.estimator import estimate_pressure
from app.pressure.heatmap_generator import generate_heatmap

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pressure", tags=["pressure"])


class PressureEstimateRequest(BaseModel):
    """Request body for pressure estimation.

    T-02-09: Biometric inputs are sensitive (weight, gender, age).
    Only accept from authenticated sessions via Next.js proxy.
    """

    scanId: str = Field(..., description="UUID identifier for the scan session")
    weight: float = Field(..., gt=0, le=300, description="Body weight in kg")
    footLength: float = Field(..., gt=0, le=400, description="Foot length in mm")
    ballWidth: float = Field(..., gt=0, le=200, description="Ball (forefoot) width in mm")
    archHeight: float = Field(..., ge=0, le=100, description="Arch height in mm")
    gender: str = Field(..., description="Gender: 'male', 'female', or 'other'")
    age: float = Field(..., gt=0, le=150, description="Age in years")


class PressureEstimateResponse(BaseModel):
    """Response body for pressure estimation."""

    scanId: str
    heatmapData: list[list[float]]
    highPressureZones: list[dict]
    warnings: list[str]


@router.post("/estimate", response_model=PressureEstimateResponse)
async def estimate_pressure_endpoint(request: PressureEstimateRequest):
    """Estimate plantar pressure distribution from biometric inputs.

    Accepts weight, foot dimensions, arch height, gender, and age to
    generate a pressure heatmap with high-pressure zone detection and warnings.

    Args:
        request: PressureEstimateRequest with biometric inputs.

    Returns:
        PressureEstimateResponse with heatmap data, zones, and warnings.
    """
    # Validate gender
    if request.gender.lower() not in ("male", "female", "other"):
        raise HTTPException(
            status_code=400,
            detail="gender must be 'male', 'female', or 'other'.",
        )

    try:
        # T-02-09: Do not log PII (weight, gender, age)
        logger.info("Processing pressure estimation for scan %s", request.scanId)

        # Step 1: Estimate pressure distribution
        pressure_data = estimate_pressure(
            weight=request.weight,
            foot_length=request.footLength,
            ball_width=request.ballWidth,
            arch_height=request.archHeight,
            gender=request.gender,
            age=request.age,
        )

        # Step 2: Generate heatmap with zone detection and warnings
        heatmap_result = generate_heatmap(pressure_data["pressureGrid"])

        logger.info(
            "Pressure estimation for %s: %d high-pressure zones, %d warnings",
            request.scanId,
            len(heatmap_result["highPressureZones"]),
            len(heatmap_result["warnings"]),
        )

        return PressureEstimateResponse(
            scanId=request.scanId,
            heatmapData=heatmap_result["normalizedGrid"],
            highPressureZones=heatmap_result["highPressureZones"],
            warnings=heatmap_result["warnings"],
        )

    except Exception as e:
        logger.exception(
            "Pressure estimation failed for %s: %s", request.scanId, str(e)
        )
        raise HTTPException(
            status_code=500,
            detail=f"Pressure estimation failed: {str(e)}",
        )
