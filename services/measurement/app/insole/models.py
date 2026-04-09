"""
Pydantic models for insole design parameters and results.
Mirrors TypeScript types in src/lib/insole/types.ts.
Covers D-01 through D-04: design parameters, Varioshore TPU zones.
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class DesignParams(BaseModel):
    """Parametric insole design dimensions per D-01/D-02. All linear values in mm."""

    arch_height: float = Field(..., ge=25.0, le=60.0, description="Arch support height in mm")
    heel_cup_depth: float = Field(..., ge=15.0, le=35.0, description="Heel cup depth in mm")
    eva_cushion_thickness: float = Field(..., ge=1.0, le=15.0, description="EVA cushion layer thickness in mm")
    foot_length: float = Field(..., ge=150.0, le=350.0, description="Foot length in mm")
    foot_width: float = Field(..., ge=60.0, le=130.0, description="Foot width in mm")
    heel_width: float = Field(..., ge=40.0, le=90.0, description="Heel width in mm")
    forefoot_flex: float = Field(..., ge=0.0, le=1.0, description="Forefoot flexibility ratio 0-1")
    medial_post_h: float = Field(..., ge=0.0, le=15.0, description="Medial post height in mm")
    lateral_post_h: float = Field(..., ge=0.0, le=15.0, description="Lateral post height in mm")


class InsoleDesignInput(BaseModel):
    """Input for requesting an insole design generation."""

    scan_id: str
    foot_side: Literal["left", "right"]
    line_type: Literal["general", "professional"]
    body_weight: float = Field(..., ge=20.0, le=200.0, description="Body weight in kg")
    age: int = Field(..., ge=5, le=100)
    activity_type: Literal["daily", "running", "standing"]


class VarioshoreTpuZone(BaseModel):
    """A single Varioshore TPU zone with print parameters."""

    temp_c: int
    shore_a: int
    flow_pct: int
    color: str


# Varioshore TPU zone specifications per D-03
# Temperature controls Shore A hardness via foaming density
VARIOSHORE_ZONES: dict[str, VarioshoreTpuZone] = {
    "archCore": VarioshoreTpuZone(temp_c=190, shore_a=92, flow_pct=100, color="#ef4444"),
    "heelCupWall": VarioshoreTpuZone(temp_c=195, shore_a=85, flow_pct=100, color="#f97316"),
    "heelCupFloor": VarioshoreTpuZone(temp_c=200, shore_a=75, flow_pct=100, color="#eab308"),
    "forefoot": VarioshoreTpuZone(temp_c=210, shore_a=65, flow_pct=100, color="#22c55e"),
    "toeArea": VarioshoreTpuZone(temp_c=220, shore_a=55, flow_pct=100, color="#3b82f6"),
}


class InsoleDesignResult(BaseModel):
    """Result of insole design generation."""

    design_params: DesignParams
    hardness_map: dict[str, VarioshoreTpuZone]
    stl_url: Optional[str] = None
    slicer_profile_url: Optional[str] = None
    design_params_json: Optional[str] = None
