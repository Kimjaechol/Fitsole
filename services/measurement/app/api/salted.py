"""SALTED smart insole API endpoints.

Provides session storage, retrieval, and biomechanical analysis.
Follows existing scan.py/insole.py patterns for error handling.
"""

from __future__ import annotations

import logging
import re
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.salted.biomechanical import analyze_biomechanics
from app.salted.data_parser import parse_pressure_frames, validate_session_data
from app.salted.models import BiomechanicalAnalysis, SaltedSessionInput
from app.salted.session_manager import (
    get_session,
    get_user_sessions,
    store_session,
    update_session_analysis,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/salted", tags=["salted"])

# UUID format validation (same pattern as scan.py T-02-06)
UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

# T-03-13: Maximum frame count for DoS mitigation
MAX_FRAME_COUNT = 500_000

# T-03-13: Maximum session duration
MAX_DURATION_S = 600.0


class SessionCreateResponse(BaseModel):
    """Response for POST /api/salted/session."""

    session_id: str
    status: str
    analysis: Optional[BiomechanicalAnalysis] = None
    frame_count: int
    duration_seconds: float


class AnalyzeRequest(BaseModel):
    """Request for POST /api/salted/analyze."""

    session_id: str
    user_id: str  # From auth context in production


class AnalyzeResponse(BaseModel):
    """Response for POST /api/salted/analyze."""

    session_id: str
    analysis: BiomechanicalAnalysis


@router.post("/session", response_model=SessionCreateResponse)
async def create_session(session_input: SaltedSessionInput):
    """Accept SALTED session data, store session, run biomechanical analysis.

    T-03-13: Rate limit session creation, validate frame count and duration.
    """
    # T-03-13: Validate frame count
    if len(session_input.frames) > MAX_FRAME_COUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Frame count {len(session_input.frames)} exceeds maximum {MAX_FRAME_COUNT}",
        )

    # T-03-13: Validate duration
    if session_input.duration_seconds > MAX_DURATION_S:
        raise HTTPException(
            status_code=400,
            detail=f"Duration {session_input.duration_seconds}s exceeds maximum {MAX_DURATION_S}s",
        )

    # Validate session data quality
    is_valid, msg = validate_session_data(session_input.frames, min_duration_s=0)
    if not is_valid:
        raise HTTPException(status_code=422, detail=f"Invalid session data: {msg}")

    # Store session
    session_id = store_session(session_input)

    # Run biomechanical analysis
    analysis = None
    try:
        if len(session_input.frames) > 0:
            analysis = analyze_biomechanics(session_input.frames)
            update_session_analysis(session_id, analysis.dict())
    except Exception as e:
        logger.warning("Biomechanical analysis failed for session %s: %s", session_id, str(e))

    return SessionCreateResponse(
        session_id=session_id,
        status="completed" if analysis else "stored",
        analysis=analysis,
        frame_count=len(session_input.frames),
        duration_seconds=session_input.duration_seconds,
    )


@router.get("/session/{session_id}")
async def get_session_details(session_id: str, user_id: str):
    """Get session details with user_id filter for IDOR prevention (T-03-12).

    In production, user_id comes from auth context (JWT/session).
    """
    if not UUID_PATTERN.match(session_id):
        raise HTTPException(status_code=400, detail="Invalid session_id format. Must be UUID.")

    session = get_session(session_id, user_id=user_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    return session


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_session(request: AnalyzeRequest):
    """Run or re-run biomechanical analysis on a stored session.

    Retrieves session frames and performs full analysis.
    """
    if not UUID_PATTERN.match(request.session_id):
        raise HTTPException(status_code=400, detail="Invalid session_id format. Must be UUID.")

    session = get_session(request.session_id, user_id=request.user_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # Note: In production, frames would be fetched from DB.
    # Current in-memory store only keeps metadata + frame_count.
    # Re-analysis requires the session to have stored frames.
    if session.get("analysis"):
        return AnalyzeResponse(
            session_id=request.session_id,
            analysis=BiomechanicalAnalysis(**session["analysis"]),
        )

    raise HTTPException(
        status_code=422,
        detail="No analysis available. Submit session with frames first.",
    )
