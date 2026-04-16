"""FitSole Measurement Service - FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.gait import router as gait_router
from app.api.insole import router as insole_router
from app.api.pressure import router as pressure_router
from app.api.salted import router as salted_router
from app.api.scan import router as scan_router
from app.api.shoe_merge import router as shoe_merge_router
from app.api.shoe_scan import router as shoe_scan_router

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
app.include_router(shoe_scan_router)
app.include_router(shoe_merge_router)


@app.get("/")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
