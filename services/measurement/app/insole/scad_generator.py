"""
OpenSCAD .scad file generator for parametric insole design (D-10).

Renders Jinja2 templates with DesignParams to produce valid OpenSCAD files.
"""

from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from app.insole.models import DesignParams

# Template directory alongside this module
_TEMPLATE_DIR = Path(__file__).parent / "templates"

# T-03-09: Cap $fn at 100 for production to prevent DoS via excessive facets
_MAX_RESOLUTION = 100


def generate_scad_file(params: DesignParams, resolution: int = 50) -> str:
    """Generate OpenSCAD .scad file content from design parameters.

    Args:
        params: Validated insole design parameters.
        resolution: OpenSCAD $fn value (facet count). Capped at 100.

    Returns:
        Rendered .scad file content as string.
    """
    # Enforce resolution cap (T-03-09 mitigation)
    capped_resolution = min(resolution, _MAX_RESOLUTION)

    env = Environment(
        loader=FileSystemLoader(str(_TEMPLATE_DIR)),
        # Keep OpenSCAD comments intact
        keep_trailing_newline=True,
    )
    template = env.get_template("insole_base.scad")

    # Render with all DesignParams fields + resolution
    context = params.model_dump()
    context["resolution"] = capped_resolution

    return template.render(**context)


def save_scad_file(
    params: DesignParams, output_path: Path, resolution: int = 50
) -> Path:
    """Generate and save .scad file to disk.

    Args:
        params: Validated insole design parameters.
        output_path: Destination file path.
        resolution: OpenSCAD $fn value (facet count). Capped at 100.

    Returns:
        The output path.
    """
    content = generate_scad_file(params, resolution)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content)
    return output_path
