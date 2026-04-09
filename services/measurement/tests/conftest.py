"""Test configuration and fixtures for measurement service tests."""

import tempfile
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create a FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def sample_frames_dir():
    """Create a temporary directory with sample frame images for testing."""
    with tempfile.TemporaryDirectory(prefix="fitsole_test_frames_") as tmpdir:
        frames_dir = Path(tmpdir)

        # Generate simple test images (640x480, 3 channels)
        for i in range(5):
            # Create a synthetic image with some variation
            img = np.random.randint(100, 200, (480, 640, 3), dtype=np.uint8)
            frame_path = frames_dir / f"frame_{i:04d}.jpg"

            # Write as raw bytes (tests don't need valid JPEG encoding)
            # For actual tests with OpenCV, use cv2.imwrite
            img.tofile(str(frame_path))

        yield frames_dir


@pytest.fixture
def sample_video_path():
    """Create a temporary path for test video files."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        yield Path(f.name)
