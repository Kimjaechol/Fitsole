"""Guard tests for the FastAPI route uniqueness invariant.

The guard itself lives in ``app.route_uniqueness`` specifically so these
tests don't have to import ``app.main`` — which transitively pulls in
open3d and other ML deps that aren't installed in every dev env. We
verify three behaviours on throwaway FastAPI apps:

1. ``assert_unique_routes`` raises on a synthesized (method, path) duplicate.
2. Same path + different HTTP methods is NOT a collision.
3. An app with no APIRoute instances (e.g., only middleware/WebSocket) is
   considered trivially unique.
"""

from __future__ import annotations

import pytest
from fastapi import APIRouter, FastAPI

from app.route_uniqueness import assert_unique_routes


def test_assert_unique_routes_raises_on_duplicate() -> None:
    """A synthesized duplicate must trip the guard immediately."""
    app = FastAPI()
    router = APIRouter()

    @router.post("/collide")
    async def first() -> dict[str, str]:
        return {"who": "first"}

    @router.post("/collide")
    async def second() -> dict[str, str]:
        return {"who": "second"}

    app.include_router(router)

    with pytest.raises(RuntimeError, match="Duplicate route POST /collide"):
        assert_unique_routes(app)


def test_assert_unique_routes_allows_same_path_different_methods() -> None:
    """GET /foo and POST /foo are distinct — must NOT be flagged."""
    app = FastAPI()
    router = APIRouter()

    @router.get("/foo")
    async def read() -> dict[str, str]:
        return {}

    @router.post("/foo")
    async def write() -> dict[str, str]:
        return {}

    app.include_router(router)

    # Should return without raising.
    assert_unique_routes(app)


def test_assert_unique_routes_ok_on_empty_app() -> None:
    """A freshly created FastAPI app has only the default docs routes and
    must pass the guard without raising."""
    assert_unique_routes(FastAPI())
