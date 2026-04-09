"""
Pydantic models for SALTED smart insole kit data.
Mirrors TypeScript types in src/lib/salted/types.ts.
Covers D-05 through D-09: BLE data, pressure frames, biomechanical analysis.
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class ImuData(BaseModel):
    """IMU sensor data from SALTED insole."""

    accel_x: float
    accel_y: float
    accel_z: float
    gyro_x: float
    gyro_y: float
    gyro_z: float


class SaltedPressureFrame(BaseModel):
    """Single pressure frame from SALTED insole sensor, streamed at ~100Hz via BLE."""

    timestamp: float = Field(..., description="Milliseconds since session start")
    pressure_array: list[float] = Field(..., description="Sensor grid values")
    imu_data: Optional[ImuData] = None


class CopPoint(BaseModel):
    """Center of pressure trajectory point."""

    x: float
    y: float
    t: float


class ArchFlexibility(BaseModel):
    """Arch flexibility measurements."""

    static_index: float
    dynamic_index: float


class WeightDistribution(BaseModel):
    """Plantar weight distribution percentages (should sum to ~100)."""

    forefoot: float = Field(..., ge=0.0, le=100.0)
    midfoot: float = Field(..., ge=0.0, le=100.0)
    hindfoot: float = Field(..., ge=0.0, le=100.0)


class BiomechanicalAnalysis(BaseModel):
    """Biomechanical analysis derived from SALTED session data per D-07."""

    landing_pattern: Literal["heel_strike", "midfoot_strike", "forefoot_strike"]
    pronation_degree: float = Field(..., description="Pronation angle in degrees")
    cop_trajectory: list[CopPoint]
    arch_flexibility: ArchFlexibility
    weight_distribution: WeightDistribution


class SaltedSessionInput(BaseModel):
    """Input for creating a SALTED measurement session."""

    user_id: str
    scan_id: Optional[str] = None
    session_type: Literal["initial", "verification"]
    frames: list[SaltedPressureFrame]
    duration_seconds: float = Field(..., ge=0.0)


class ZoneComparison(BaseModel):
    """Single zone comparison in verification report."""

    zone: str
    before: float
    after: float
    improvement: float  # percentage


class VerificationReport(BaseModel):
    """Before/after verification report comparing initial vs post-insole sessions."""

    initial_session_id: str
    verification_session_id: str
    peak_pressure_reduction_pct: float
    contact_area_increase_pct: float
    zone_comparisons: list[ZoneComparison]
