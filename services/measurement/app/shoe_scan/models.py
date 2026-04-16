"""Pydantic models for shoe interior scanning.

The shoe scan pipeline reuses the existing SfM reconstruction from
`app.pipeline.sfm_reconstructor` but with different scale calibration
(patterned target paper instead of A4) and measurement extraction
(internal cavity dimensions instead of foot shape).
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────
# Input Models
# ─────────────────────────────────────────────


class ShoeScanInput(BaseModel):
    """Request payload for the shoe interior scan endpoint."""

    brand: str = Field(..., min_length=1, max_length=100, description="신발 브랜드")
    model_name: str = Field(
        ..., min_length=1, max_length=200, description="신발 모델명"
    )
    variant: Optional[str] = Field(
        None, max_length=100, description="색상/옵션 변형 (선택)"
    )
    size_base: float = Field(
        ..., ge=150.0, le=350.0, description="한국 기준 사이즈 (mm)"
    )
    shoe_category: Optional[
        Literal["running", "casual", "dress", "boots", "sandals", "sports"]
    ] = None
    fit_type: Optional[Literal["narrow", "standard", "wide"]] = None
    contributor_type: Literal["admin", "wholesale_partner", "user_crowdsource"]
    notes: Optional[str] = Field(None, max_length=1000)


# ─────────────────────────────────────────────
# Output Models
# ─────────────────────────────────────────────


class ShoeInternalDimensions(BaseModel):
    """Extracted internal cavity dimensions from SfM scan (all in mm).

    Fields are ``Optional`` because sparse meshes, occluded slices, or
    ``no_data`` merge branches produce missing (None) measurements rather
    than physically invalid sentinels — the prior ``0.0`` fallback violated
    the lower bounds and converted a recoverable partial scan into a 500.
    ``le`` upper bounds are kept to catch runaway outliers while still
    admitting ``None``.
    """

    internal_length: Optional[float] = Field(
        None, ge=100.0, le=400.0, description="내부 길이 (heel to toe)"
    )
    internal_width: Optional[float] = Field(
        None, ge=50.0, le=200.0, description="볼 위치 내부 폭"
    )
    heel_cup_depth: Optional[float] = Field(
        None, ge=5.0, le=60.0, description="힐컵 벽 깊이"
    )
    arch_support_x: Optional[float] = Field(
        None, ge=20.0, le=200.0, description="아치 지지대 X 위치 (뒤꿈치 기준)"
    )
    toe_box_volume: Optional[float] = Field(
        None, ge=10.0, le=500.0, description="토박스 볼륨 (mL)"
    )
    instep_clearance: Optional[float] = Field(
        None, ge=5.0, le=80.0, description="발등 여유 공간"
    )


class ShoeScanResult(BaseModel):
    """Complete response from shoe scan processing."""

    scan_id: str
    status: Literal["success", "failed"]
    measurements: Optional[ShoeInternalDimensions] = None
    quality_score: float = Field(
        ..., ge=0.0, le=100.0, description="스캔 품질 0-100"
    )
    accuracy: float = Field(
        ..., ge=0.0, description="예상 정확도 (mm, lower is better)"
    )
    model_url: Optional[str] = None
    error_message: Optional[str] = None


class ShoeCalibrationTarget(BaseModel):
    """Calibration target specification for shoe interior scanning.

    Unlike A4 paper (foot scanning), shoe interior scans use a small
    printed pattern that fits inside the shoe. The pattern has known
    dimensions for pixel-to-mm conversion.
    """

    pattern_type: Literal["checkerboard", "aruco", "grid"] = "checkerboard"
    # Standard target: 80mm × 40mm, 5×3 squares, 16mm per square
    target_width_mm: float = 80.0
    target_height_mm: float = 40.0
    squares_x: int = 5
    squares_y: int = 3
    square_size_mm: float = 16.0
