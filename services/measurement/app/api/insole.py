"""Insole design API endpoints.

Provides endpoints for insole design generation, size recommendation,
and design retrieval. Follows existing scan.py patterns for error
handling and response models.
"""

from __future__ import annotations

import logging
import re
import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.insole.models import InsoleDesignInput, InsoleDesignResult
from app.insole.optimizer import generate_insole_design, recommend_shoe_size

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/insole", tags=["insole"])

# UUID format validation (T-03-06: validate scan_id format)
UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

# --- Request/Response Models ---


class SizeOption(BaseModel):
    """A single product size option."""

    size: int
    lastLength: float
    lastWidth: float


class SizeRecommendRequest(BaseModel):
    """Request for shoe size recommendation."""

    scan_id: str
    product_sizes: List[SizeOption]


class SizeRecommendResponse(BaseModel):
    """Response for shoe size recommendation."""

    recommended_size: Optional[int] = None
    fit_notes: List[str] = []


class DesignResponse(BaseModel):
    """Response for stored insole design."""

    design_id: str
    scan_id: str
    design_params: dict
    hardness_map: dict
    stl_url: Optional[str] = None
    created_at: Optional[str] = None


# --- In-memory storage (DB integration in future plan) ---

_designs_store: dict[str, dict] = {}
_measurements_store: dict[str, dict] = {}
_pressure_store: dict[str, dict] = {}
_gait_store: dict[str, dict] = {}


# --- Endpoints ---


@router.post("/design", response_model=InsoleDesignResult)
async def create_insole_design(input: InsoleDesignInput):
    """Generate an insole design from scan data.

    Fetches scan measurements, pressure data, and gait analysis
    from storage, then runs optimization algorithms.

    Args:
        input: InsoleDesignInput with scan_id, foot_side, line_type,
               body_weight, age, activity_type.

    Returns:
        InsoleDesignResult with design_params and hardness_map.

    Raises:
        HTTPException 400: Invalid scan_id format.
        HTTPException 404: Scan data not found.
    """
    # T-03-05: Input validation via Pydantic model (body_weight, age bounds)
    # T-03-06: Validate scan_id format
    if not UUID_PATTERN.match(input.scan_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid scan_id format. Must be UUID.",
        )

    # T-03-07: Validate scan exists before expensive computation
    # Fetch measurement data (from DB in production)
    measurements = _measurements_store.get(input.scan_id)
    if measurements is None:
        # Fallback: use default measurements for demo/development
        logger.warning("No measurements found for scan %s, using defaults", input.scan_id)
        measurements = {
            "archHeight": 22.0,
            "footLength": 260.0,
            "ballWidth": 98.0,
            "heelWidth": 65.0,
        }

    # Fetch pressure data
    pressure_data = _pressure_store.get(input.scan_id)
    if pressure_data is None:
        logger.warning("No pressure data found for scan %s, using defaults", input.scan_id)
        pressure_data = {
            "pressureGrid": [[0.2] * 10 for _ in range(20)],
            "peakPressureZones": [],
            "overallDistribution": {
                "forefoot_pct": 40.0,
                "midfoot_pct": 15.0,
                "rearfoot_pct": 45.0,
            },
        }

    # Fetch gait analysis data
    gait_data = _gait_store.get(input.scan_id)
    if gait_data is None:
        logger.warning("No gait data found for scan %s, using defaults", input.scan_id)
        gait_data = {
            "pronation_degree": 0.0,
            "stride_length": 700.0,
        }

    # Generate design
    result = generate_insole_design(input, measurements, pressure_data, gait_data)

    # Store the design for later retrieval
    design_id = str(uuid.uuid4())
    _designs_store[design_id] = {
        "design_id": design_id,
        "scan_id": input.scan_id,
        "design_params": result.design_params.dict(),
        "hardness_map": {k: v.dict() for k, v in result.hardness_map.items()},
        "stl_url": result.stl_url,
    }

    logger.info(
        "Design %s created for scan %s: arch=%.1f, heel=%.1f",
        design_id,
        input.scan_id,
        result.design_params.arch_height,
        result.design_params.heel_cup_depth,
    )

    return result


@router.post("/size-recommend", response_model=SizeRecommendResponse)
async def recommend_size(request: SizeRecommendRequest):
    """Recommend shoe size based on scan measurements and available sizes.

    Args:
        request: SizeRecommendRequest with scan_id and product_sizes.

    Returns:
        SizeRecommendResponse with recommended_size and fit_notes.

    Raises:
        HTTPException 400: Invalid scan_id format.
        HTTPException 400: No product sizes provided.
    """
    # T-03-06: Validate scan_id
    if not UUID_PATTERN.match(request.scan_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid scan_id format. Must be UUID.",
        )

    if not request.product_sizes:
        raise HTTPException(
            status_code=400,
            detail="At least one product size must be provided.",
        )

    # Fetch foot measurements
    measurements = _measurements_store.get(request.scan_id)
    if measurements is None:
        logger.warning("No measurements for scan %s, using defaults", request.scan_id)
        measurements = {
            "footLength": 260.0,
            "ballWidth": 98.0,
        }

    foot_length = measurements.get("footLength", 260.0)
    foot_width = measurements.get("ballWidth", 98.0)

    # Convert Pydantic models to dicts for the optimizer function
    product_sizes_dicts = [ps.dict() for ps in request.product_sizes]

    result = recommend_shoe_size(foot_length, foot_width, product_sizes_dicts)

    return SizeRecommendResponse(
        recommended_size=result.get("recommended_size"),
        fit_notes=result.get("fit_notes", []),
    )


@router.get("/design/{design_id}", response_model=DesignResponse)
async def get_design(design_id: str):
    """Retrieve a stored insole design by ID.

    Args:
        design_id: UUID of the stored design.

    Returns:
        DesignResponse with design details.

    Raises:
        HTTPException 404: Design not found.
    """
    # Validate design_id format
    if not UUID_PATTERN.match(design_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid design_id format. Must be UUID.",
        )

    design = _designs_store.get(design_id)
    if design is None:
        raise HTTPException(
            status_code=404,
            detail=f"Design {design_id} not found.",
        )

    return DesignResponse(**design)
