"""
STL exporter using OpenSCAD CLI (D-10).

Converts rendered .scad files to STL format via OpenSCAD subprocess.
Handles graceful degradation when OpenSCAD is not installed.
"""

import shutil
import subprocess
import tempfile
from pathlib import Path

from app.insole.models import DesignParams
from app.insole.scad_generator import generate_scad_file

# T-03-09: Subprocess timeout for STL generation (seconds)
_OPENSCAD_TIMEOUT = 120


def is_openscad_available() -> bool:
    """Check if OpenSCAD binary is available in PATH.

    Returns:
        True if openscad command is found, False otherwise.
    """
    return shutil.which("openscad") is not None


def export_stl(scad_content: str, output_dir: Path, filename: str = "insole") -> Path:
    """Export .scad content to STL via OpenSCAD CLI.

    Args:
        scad_content: Rendered OpenSCAD file content.
        output_dir: Directory to write output files.
        filename: Base filename (without extension).

    Returns:
        Path to the generated .stl file.

    Raises:
        FileNotFoundError: If OpenSCAD is not installed.
        RuntimeError: If OpenSCAD returns a non-zero exit code.
        subprocess.TimeoutExpired: If generation exceeds timeout.
    """
    if not is_openscad_available():
        raise FileNotFoundError(
            "OpenSCAD is not installed or not found in PATH. "
            "Install OpenSCAD (apt-get install openscad) or add it to PATH."
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    stl_path = output_dir / f"{filename}.stl"

    # Write scad content to a temp file in output_dir
    scad_path = output_dir / f"{filename}_tmp.scad"
    try:
        scad_path.write_text(scad_content)

        result = subprocess.run(
            ["openscad", "-o", str(stl_path), str(scad_path)],
            capture_output=True,
            text=True,
            timeout=_OPENSCAD_TIMEOUT,
        )

        if result.returncode != 0:
            raise RuntimeError(
                f"OpenSCAD failed with exit code {result.returncode}: {result.stderr}"
            )
    finally:
        # Clean up temp .scad file
        if scad_path.exists():
            scad_path.unlink()

    return stl_path


def generate_insole_stl(
    params: DesignParams, output_dir: Path, resolution: int = 50
) -> Path:
    """Generate insole STL from design parameters.

    Convenience function combining .scad generation and STL export.

    Args:
        params: Validated insole design parameters.
        output_dir: Directory to write the STL file.
        resolution: OpenSCAD $fn value (capped at 100).

    Returns:
        Path to the generated .stl file.
    """
    scad_content = generate_scad_file(params, resolution)
    return export_stl(scad_content, output_dir)
