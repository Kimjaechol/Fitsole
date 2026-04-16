"""Startup guard that prevents duplicate (method, path) FastAPI routes.

FastAPI silently lets later ``@router.post`` decorators override earlier
ones that share the same method+path, which is a footgun: a copy-paste
mistake or an accidental merge of two endpoint files into one namespace
would ship to prod unnoticed. ``assert_unique_routes`` turns that silent
override into a ``RuntimeError`` at module load time so the failure
surfaces in local dev, CI, and container boot alike.

Lives in its own module (no FastAPI dependency beyond ``APIRoute``) so
tests can exercise the invariant without importing ``app.main`` — which
pulls in open3d and other heavy ML deps that aren't available in every
developer environment.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.routing import APIRoute


def assert_unique_routes(application: FastAPI) -> None:
    """Raise if any (method, path) pair is registered twice on ``application``.

    Runs in O(routes × methods-per-route). Call it once after every
    ``include_router`` block and once more at the end of module load; cheap
    enough to run in prod boot, strict enough to catch the only class of
    collision FastAPI doesn't reject on its own.
    """
    seen: dict[tuple[str, str], str] = {}
    for route in application.routes:
        if not isinstance(route, APIRoute):
            continue
        for method in route.methods or set():
            key = (method, route.path)
            owner = f"{route.endpoint.__module__}.{route.endpoint.__qualname__}"
            if key in seen:
                raise RuntimeError(
                    f"Duplicate route {method} {route.path}: "
                    f"{seen[key]} vs {owner}"
                )
            seen[key] = owner
