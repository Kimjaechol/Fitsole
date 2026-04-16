"""Shared upload validation and persistence helpers for shoe-scan endpoints.

Centralizes UUID validation, mesh extension checks, and chunked disk writes
so `shoe_scan.py` and `shoe_merge.py` can't drift out of sync when limits
or accepted formats change.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.validation import UUID_PATTERN

# ─────────────────────────────────────────────
# Shared limits
# ─────────────────────────────────────────────

MAX_UPLOAD_SIZE = 200 * 1024 * 1024  # 200MB per mesh file

ALLOWED_MESH_EXTENSIONS: frozenset[str] = frozenset(
    {".stl", ".obj", ".ply", ".gltf", ".glb"}
)


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────


def validate_uuid(scan_id: str, *, field_name: str = "scanId") -> None:
    """Reject anything that isn't a canonical UUID string."""
    if not UUID_PATTERN.match(scan_id):
        raise HTTPException(
            status_code=400, detail=f"Invalid {field_name} format. Must be UUID."
        )


def validate_mesh_file(file: UploadFile, field_name: str) -> str:
    """Validate mesh upload filename and return its normalized `.suffix`.

    Open3D's `read_triangle_mesh` dispatches by suffix, so the caller must
    preserve it when persisting to disk.
    """
    if not file.filename:
        raise HTTPException(
            status_code=400, detail=f"{field_name} has no filename"
        )

    ext = Path(file.filename).suffix.lower()
    if not ext:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} filename has no extension. "
            f"Allowed: {', '.join(sorted(ALLOWED_MESH_EXTENSIONS))}",
        )
    if ext not in ALLOWED_MESH_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} has invalid extension {ext}. "
            f"Allowed: {', '.join(sorted(ALLOWED_MESH_EXTENSIONS))}",
        )
    return ext


async def save_upload(
    file: UploadFile,
    dest: Path,
    *,
    max_bytes: int = MAX_UPLOAD_SIZE,
    chunk_size: int = 1024 * 1024,
) -> Path:
    """Stream an UploadFile to disk in fixed-size chunks with a byte ceiling.

    Raises 413 and aborts the write the moment the total exceeds `max_bytes`
    so we never buffer more than one chunk of a malicious upload in memory.
    """
    total = 0
    with open(dest, "wb") as f:
        while chunk := await file.read(chunk_size):
            total += len(chunk)
            if total > max_bytes:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Max {max_bytes // (1024 * 1024)}MB",
                )
            f.write(chunk)
    return dest
