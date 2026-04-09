"""Tests for before/after verification report generation.

TDD RED phase: tests written before implementation.
Tests peak pressure reduction, contact area increase, zone comparisons, success flag.
"""

import pytest

from app.salted.models import SaltedPressureFrame


# ── Helpers ──────────────────────────────────────

GRID_ROWS = 20
GRID_COLS = 10
SENSOR_COUNT = GRID_ROWS * GRID_COLS


def _make_frames(
    count: int,
    base_pressure: float = 300.0,
    coverage_ratio: float = 0.6,
    interval_ms: float = 10.0,
) -> list[SaltedPressureFrame]:
    """Generate pressure frames with controllable peak and coverage.

    Args:
        count: Number of frames.
        base_pressure: Base pressure for active sensors.
        coverage_ratio: Fraction of sensors above zero (0-1).
        interval_ms: Interval between frames.
    """
    active_count = int(SENSOR_COUNT * coverage_ratio)
    pressure_array = [base_pressure] * active_count + [0.0] * (SENSOR_COUNT - active_count)
    return [
        SaltedPressureFrame(
            timestamp=i * interval_ms,
            pressure_array=pressure_array,
            imu_data=None,
        )
        for i in range(count)
    ]


def _make_zone_frames(
    count: int,
    zone_pressures: dict[str, float],
    interval_ms: float = 10.0,
) -> list[SaltedPressureFrame]:
    """Generate frames with per-zone pressure values.

    zone_pressures keys: forefoot, midfoot, hindfoot, medial, lateral
    """
    pressure_array = [0.0] * SENSOR_COUNT
    for r in range(GRID_ROWS):
        for c in range(GRID_COLS):
            idx = r * GRID_COLS + c
            # Row-based zones
            if r < 6:
                val = zone_pressures.get("hindfoot", 100.0)
            elif r < 14:
                val = zone_pressures.get("midfoot", 100.0)
            else:
                val = zone_pressures.get("forefoot", 100.0)
            # Column-based zones (overlay)
            if c < 5:
                val *= zone_pressures.get("medial", 1.0) if "medial" in zone_pressures else 1.0
            else:
                val *= zone_pressures.get("lateral", 1.0) if "lateral" in zone_pressures else 1.0
            pressure_array[idx] = val

    return [
        SaltedPressureFrame(
            timestamp=i * interval_ms,
            pressure_array=pressure_array,
            imu_data=None,
        )
        for i in range(count)
    ]


# ── Store helper ─────────────────────────────────

def _store_test_session(user_id: str, frames: list[SaltedPressureFrame]) -> str:
    """Store frames as a session and return session_id."""
    from app.salted.models import SaltedSessionInput
    from app.salted.session_manager import store_session

    session_input = SaltedSessionInput(
        user_id=user_id,
        session_type="initial",
        frames=frames,
        duration_seconds=len(frames) * 0.01,
    )
    session_id = store_session(session_input)

    # Also store raw frames for report retrieval
    from app.salted.session_manager import _sessions
    _sessions[session_id]["frames"] = [f.model_dump() for f in frames]

    return session_id


# ── Tests ────────────────────────────────────────

class TestPeakPressureReduction:
    """Test peak pressure reduction calculation."""

    def test_peak_pressure_reduced(self):
        from app.insole.report_generator import generate_verification_report

        user_id = "user-report-1"
        # Initial: high pressure (500 kPa peak)
        initial_frames = _make_frames(100, base_pressure=500.0, coverage_ratio=0.5)
        initial_id = _store_test_session(user_id, initial_frames)
        # Verification: lower pressure (200 kPa peak -> 60% reduction)
        verif_frames = _make_frames(100, base_pressure=200.0, coverage_ratio=0.5)
        verif_id = _store_test_session(user_id, verif_frames)

        report = generate_verification_report(initial_id, verif_id, user_id)
        assert report.peak_pressure_reduction_pct > 0
        assert abs(report.peak_pressure_reduction_pct - 60.0) < 1.0

    def test_peak_pressure_not_reduced(self):
        from app.insole.report_generator import generate_verification_report

        user_id = "user-report-2"
        # Initial: low pressure
        initial_frames = _make_frames(100, base_pressure=100.0, coverage_ratio=0.5)
        initial_id = _store_test_session(user_id, initial_frames)
        # Verification: higher pressure (worsened)
        verif_frames = _make_frames(100, base_pressure=300.0, coverage_ratio=0.5)
        verif_id = _store_test_session(user_id, verif_frames)

        report = generate_verification_report(initial_id, verif_id, user_id)
        assert report.peak_pressure_reduction_pct < 0


class TestContactAreaIncrease:
    """Test contact area increase calculation."""

    def test_contact_area_increased(self):
        from app.insole.report_generator import generate_verification_report

        user_id = "user-report-3"
        # Initial: 40% coverage
        initial_frames = _make_frames(100, base_pressure=300.0, coverage_ratio=0.4)
        initial_id = _store_test_session(user_id, initial_frames)
        # Verification: 80% coverage (100% increase)
        verif_frames = _make_frames(100, base_pressure=300.0, coverage_ratio=0.8)
        verif_id = _store_test_session(user_id, verif_frames)

        report = generate_verification_report(initial_id, verif_id, user_id)
        assert report.contact_area_increase_pct > 0
        assert abs(report.contact_area_increase_pct - 100.0) < 5.0


class TestZoneComparisons:
    """Test zone-by-zone comparison."""

    def test_zone_comparisons_cover_five_zones(self):
        from app.insole.report_generator import generate_verification_report

        user_id = "user-report-4"
        initial_frames = _make_frames(50, base_pressure=400.0, coverage_ratio=0.6)
        initial_id = _store_test_session(user_id, initial_frames)
        verif_frames = _make_frames(50, base_pressure=250.0, coverage_ratio=0.8)
        verif_id = _store_test_session(user_id, verif_frames)

        report = generate_verification_report(initial_id, verif_id, user_id)
        assert len(report.zone_comparisons) == 5

        zone_names = [zc.zone for zc in report.zone_comparisons]
        for expected in ["forefoot", "midfoot", "hindfoot", "medial", "lateral"]:
            assert expected in zone_names, f"Missing zone: {expected}"

    def test_zone_improvement_values(self):
        from app.insole.report_generator import generate_verification_report

        user_id = "user-report-5"
        initial_frames = _make_zone_frames(50, {
            "forefoot": 400.0, "midfoot": 300.0, "hindfoot": 500.0,
        })
        initial_id = _store_test_session(user_id, initial_frames)
        verif_frames = _make_zone_frames(50, {
            "forefoot": 200.0, "midfoot": 200.0, "hindfoot": 250.0,
        })
        verif_id = _store_test_session(user_id, verif_frames)

        report = generate_verification_report(initial_id, verif_id, user_id)
        for zc in report.zone_comparisons:
            assert zc.before >= 0
            assert zc.after >= 0
            # improvement = (before - after) / before * 100
            if zc.before > 0:
                expected_improvement = (zc.before - zc.after) / zc.before * 100
                assert abs(zc.improvement - expected_improvement) < 1.0


class TestSuccessFlag:
    """Test success flag logic per D-09: >=30% reduction AND >=40% area increase."""

    def test_success_when_both_targets_met(self):
        from app.insole.report_generator import generate_verification_report

        user_id = "user-report-6"
        # Initial: high pressure, low coverage
        initial_frames = _make_frames(50, base_pressure=500.0, coverage_ratio=0.4)
        initial_id = _store_test_session(user_id, initial_frames)
        # Verification: 40% of peak (60% reduction), 80% coverage (100% increase)
        verif_frames = _make_frames(50, base_pressure=200.0, coverage_ratio=0.8)
        verif_id = _store_test_session(user_id, verif_frames)

        report = generate_verification_report(initial_id, verif_id, user_id)
        assert report.peak_pressure_reduction_pct >= 30
        assert report.contact_area_increase_pct >= 40
        assert report.success is True

    def test_failure_when_reduction_insufficient(self):
        from app.insole.report_generator import generate_verification_report

        user_id = "user-report-7"
        # Only 10% peak reduction
        initial_frames = _make_frames(50, base_pressure=500.0, coverage_ratio=0.4)
        initial_id = _store_test_session(user_id, initial_frames)
        verif_frames = _make_frames(50, base_pressure=450.0, coverage_ratio=0.8)
        verif_id = _store_test_session(user_id, verif_frames)

        report = generate_verification_report(initial_id, verif_id, user_id)
        assert report.success is False

    def test_failure_when_area_increase_insufficient(self):
        from app.insole.report_generator import generate_verification_report

        user_id = "user-report-8"
        # Good reduction but only 10% area increase
        initial_frames = _make_frames(50, base_pressure=500.0, coverage_ratio=0.5)
        initial_id = _store_test_session(user_id, initial_frames)
        verif_frames = _make_frames(50, base_pressure=200.0, coverage_ratio=0.55)
        verif_id = _store_test_session(user_id, verif_frames)

        report = generate_verification_report(initial_id, verif_id, user_id)
        assert report.success is False


class TestIdorPrevention:
    """Test T-03-17: Both sessions must belong to user_id."""

    def test_cross_user_session_rejected(self):
        from app.insole.report_generator import generate_verification_report

        user_a = "user-a"
        user_b = "user-b"
        frames_a = _make_frames(50, base_pressure=300.0)
        frames_b = _make_frames(50, base_pressure=200.0)
        session_a = _store_test_session(user_a, frames_a)
        session_b = _store_test_session(user_b, frames_b)

        # user_a tries to compare their session with user_b's session
        with pytest.raises(ValueError, match="[Ss]ession"):
            generate_verification_report(session_a, session_b, user_a)
