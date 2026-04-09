"""FitSole Measurement Service - FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.scan import router as scan_router

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

app.include_router(scan_router)


@app.get("/")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
