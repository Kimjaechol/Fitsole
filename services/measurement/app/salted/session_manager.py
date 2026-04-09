"""
SALTED session manager: CRUD operations for walking sessions.
In-memory store as DB placeholder (same pattern as insole design store).
All queries filtered by user_id for IDOR prevention (T-03-12).
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.salted.models import SaltedSessionInput

logger = logging.getLogger(__name__)

# In-memory session store (DB placeholder, same pattern as insole design store)
_sessions: Dict[str, dict] = {}


def store_session(session_input: SaltedSessionInput) -> str:
    """Store a SALTED walking session.

    Args:
        session_input: Validated session input with frames and metadata.

    Returns:
        Generated session ID (UUID).
    """
    session_id = str(uuid.uuid4())

    _sessions[session_id] = {
        "id": session_id,
        "user_id": session_input.user_id,
        "scan_id": session_input.scan_id,
        "session_type": session_input.session_type,
        "frame_count": len(session_input.frames),
        "duration_seconds": session_input.duration_seconds,
        "analysis": None,  # Populated after biomechanical analysis
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    logger.info(
        "Stored SALTED session %s for user %s (%d frames, %.1fs)",
        session_id,
        session_input.user_id,
        len(session_input.frames),
        session_input.duration_seconds,
    )

    return session_id


def get_session(session_id: str, user_id: str) -> Optional[dict]:
    """Retrieve a session by ID with IDOR prevention (T-03-12).

    Args:
        session_id: Session UUID.
        user_id: User ID from auth context (must match session owner).

    Returns:
        Session dict if found and owned by user_id, else None.
    """
    session = _sessions.get(session_id)
    if session is None:
        return None

    # T-03-12: IDOR prevention — filter by user_id
    if session["user_id"] != user_id:
        logger.warning(
            "IDOR attempt: user %s tried to access session %s owned by %s",
            user_id,
            session_id,
            session["user_id"],
        )
        return None

    return session


def get_user_sessions(user_id: str) -> List[dict]:
    """List all sessions for a user.

    Args:
        user_id: User ID to filter by.

    Returns:
        List of session dicts owned by the user.
    """
    return [s for s in _sessions.values() if s["user_id"] == user_id]


def update_session_analysis(session_id: str, analysis: dict) -> bool:
    """Update a session with biomechanical analysis results.

    Args:
        session_id: Session UUID.
        analysis: BiomechanicalAnalysis dict to store.

    Returns:
        True if updated, False if session not found.
    """
    session = _sessions.get(session_id)
    if session is None:
        return False

    session["analysis"] = analysis
    return True
