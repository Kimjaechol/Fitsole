"""Shared validation constants for API request identifiers.

Centralizes the UUID regex so every router validates `scan_id` / `session_id`
against the same pattern. Before consolidation this regex was duplicated
across 5 files and could silently drift out of sync.
"""

from __future__ import annotations

import re

UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)
