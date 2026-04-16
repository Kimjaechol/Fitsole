"""FitSole Measurement Service - FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.gait import router as gait_router
from app.api.insole import router as insole_router
from app.api.pressure import router as pressure_router
from app.api.salted import router as salted_router
from app.api.scan import router as scan_router
from app.api.shoe_scan import router as shoe_scan_router
from app.route_uniqueness import assert_unique_routes

# Side-effect import: shoe_merge imports shoe_scan.router and decorates its
# /merge and /grade endpoints onto it. Without this import the decorators
# never run and those endpoints would be missing from the app. Kept next to
# shoe_scan_router so the dependency is visually obvious.
import app.api.shoe_merge  # noqa: F401

app = FastAPI(
    title="FitSole Measurement Service",
    description="SfM-based foot measurement processing pipeline",
    version="1.0.0",
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "https://fitsole.kr",  # Production domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(gait_router)
app.include_router(insole_router)
app.include_router(pressure_router)
app.include_router(salted_router)
app.include_router(scan_router)

# shoe_scan_router owns the /shoe-scan prefix and carries every route in
# that URL space (process/merge/grade all decorate this single instance).
# There is no sibling router to mount, so a duplicate prefix declaration is
# structurally impossible; the assertion below catches accidental duplicate
# @router.post decorators for any method/path pair anywhere in the app.
app.include_router(shoe_scan_router)


assert_unique_routes(app)


@app.get("/")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


assert_unique_routes(app)  # re-run after health_check registered
