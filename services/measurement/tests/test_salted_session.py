"""Tests for SALTED session management and data parsing.

TDD RED phase: tests written before implementation.
Tests session storage, validation, and data parsing.
"""

import pytest

from app.salted.models import SaltedPressureFrame, SaltedSessionInput


def _make_frames(count: int, interval_ms: float = 10.0) -> list[SaltedPressureFrame]:
    """Generate simple pressure frames for testing."""
    return [
        SaltedPressureFrame(
            timestamp=i * interval_ms,
            pressure_array=[100.0] * 200,
            imu_data=None,
        )
        for i in range(count)
    ]


class TestDataParser:
    """Test raw BLE data parsing."""

    def test_parse_pressure_frames_valid_input(self):
        from app.salted.data_parser import parse_pressure_frames

        raw_data = [
            {
                "timestamp": 0.0,
                "pressure_array": [100.0] * 200,
                "imu_data": None,
            },
            {
                "timestamp": 10.0,
                "pressure_array": [200.0] * 200,
                "imu_data": {"accel_x": 1.0, "accel_y": 0, "accel_z": 9.81,
                             "gyro_x": 0, "gyro_y": 0, "gyro_z": 0},
            },
        ]
        frames = parse_pressure_frames(raw_data)
        assert len(frames) == 2
        assert isinstance(frames[0], SaltedPressureFrame)
        assert frames[1].imu_data is not None

    def test_parse_pressure_frames_empty_input(self):
        from app.salted.data_parser import parse_pressure_frames

        frames = parse_pressure_frames([])
        assert frames == []


class TestSessionValidation:
    """Test session data validation."""

    def test_validate_session_sufficient_duration(self):
        from app.salted.data_parser import validate_session_data

        # 5 min at 100Hz = 30000 frames, timestamps span 0..299990 ms = 300s
        frames = _make_frames(30000)
        is_valid, msg = validate_session_data(frames, min_duration_s=240)
        assert is_valid, f"Session should be valid: {msg}"

    def test_validate_session_too_short(self):
        from app.salted.data_parser import validate_session_data

        # Only 100 frames at 10ms = 1 second
        frames = _make_frames(100)
        is_valid, msg = validate_session_data(frames, min_duration_s=240)
        assert not is_valid
        assert "duration" in msg.lower() or "short" in msg.lower()

    def test_validate_session_empty(self):
        from app.salted.data_parser import validate_session_data

        is_valid, msg = validate_session_data([])
        assert not is_valid


class TestSessionManager:
    """Test session storage and retrieval."""

    def test_store_session_returns_id(self):
        from app.salted.session_manager import store_session

        session_input = SaltedSessionInput(
            user_id="user-123",
            scan_id=None,
            session_type="initial",
            frames=_make_frames(100),
            duration_seconds=10.0,
        )
        session_id = store_session(session_input)
        assert session_id is not None
        assert len(session_id) > 0

    def test_get_session_with_correct_user(self):
        from app.salted.session_manager import store_session, get_session

        session_input = SaltedSessionInput(
            user_id="user-456",
            session_type="initial",
            frames=_make_frames(50),
            duration_seconds=5.0,
        )
        session_id = store_session(session_input)
        result = get_session(session_id, user_id="user-456")
        assert result is not None
        assert result["user_id"] == "user-456"

    def test_get_session_idor_prevention(self):
        """Session filtered by user_id — different user cannot access (T-03-12)."""
        from app.salted.session_manager import store_session, get_session

        session_input = SaltedSessionInput(
            user_id="user-owner",
            session_type="initial",
            frames=_make_frames(50),
            duration_seconds=5.0,
        )
        session_id = store_session(session_input)
        # Different user tries to access
        result = get_session(session_id, user_id="user-attacker")
        assert result is None, "Different user should not be able to access session"

    def test_get_user_sessions(self):
        from app.salted.session_manager import store_session, get_user_sessions

        user_id = "user-list-test"
        for _ in range(3):
            store_session(SaltedSessionInput(
                user_id=user_id,
                session_type="initial",
                frames=_make_frames(10),
                duration_seconds=1.0,
            ))
        sessions = get_user_sessions(user_id)
        assert len(sessions) >= 3


class TestPressureDataValidation:
    """Test T-03-11: Server-side validation of pressure data ranges."""

    def test_pressure_values_validated(self):
        from app.salted.data_parser import validate_session_data

        # Create frames with anomalous pressure values (>1000 kPa)
        frames = [
            SaltedPressureFrame(
                timestamp=i * 10.0,
                pressure_array=[2000.0] * 200,  # Anomalous: exceeds 1000 kPa
                imu_data=None,
            )
            for i in range(100)
        ]
        is_valid, msg = validate_session_data(frames, min_duration_s=0)
        # Should flag anomalous readings even if duration is ok
        assert not is_valid or "anomal" in msg.lower()
