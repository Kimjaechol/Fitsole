"""Joint angle computation from pose landmarks.

Computes ankle dorsiflexion/plantarflexion, pronation/supination,
and knee flexion angles from MediaPipe Pose landmarks across frames.
"""

import math


def _angle_between_points(
    p1: dict, p2: dict, p3: dict
) -> float:
    """Compute angle at p2 formed by p1-p2-p3 in degrees.

    Args:
        p1: First point {x, y, z}.
        p2: Vertex point {x, y, z}.
        p3: Third point {x, y, z}.

    Returns:
        Angle in degrees (0-180).
    """
    v1 = (p1["x"] - p2["x"], p1["y"] - p2["y"], p1["z"] - p2["z"])
    v2 = (p3["x"] - p2["x"], p3["y"] - p2["y"], p3["z"] - p2["z"])

    dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]
    mag1 = math.sqrt(v1[0] ** 2 + v1[1] ** 2 + v1[2] ** 2)
    mag2 = math.sqrt(v2[0] ** 2 + v2[1] ** 2 + v2[2] ** 2)

    if mag1 == 0 or mag2 == 0:
        return 0.0

    cos_angle = max(-1.0, min(1.0, dot / (mag1 * mag2)))
    return math.degrees(math.acos(cos_angle))


def _lateral_deviation(ankle: dict, heel: dict) -> float:
    """Compute lateral deviation angle between heel and ankle.

    Positive = inward roll (pronation), Negative = outward roll (supination).
    Uses x-z plane deviation relative to vertical alignment.

    Args:
        ankle: Ankle landmark {x, y, z}.
        heel: Heel landmark {x, y, z}.

    Returns:
        Lateral deviation angle in degrees.
    """
    dx = heel["x"] - ankle["x"]
    dz = heel["z"] - ankle["z"]
    dy = heel["y"] - ankle["y"]

    if abs(dy) < 1e-6:
        return 0.0

    # Lateral deviation from vertical alignment
    lateral_offset = math.sqrt(dx**2 + dz**2)
    deviation_angle = math.degrees(math.atan2(lateral_offset, abs(dy)))

    # Sign convention: positive x deviation = pronation (inward roll)
    if dx > 0:
        return deviation_angle
    return -deviation_angle


def compute_ankle_angles(landmarks_over_frames: list[dict]) -> list[dict]:
    """Compute ankle angles from landmarks across frames.

    For each frame, computes:
        - dorsiflexion_angle: Knee-Ankle-FootIndex angle (dorsiflexion/plantarflexion)
        - pronation_angle: Heel-Ankle lateral deviation (pronation/supination)

    Both left and right sides are computed when landmarks are available.

    Args:
        landmarks_over_frames: List of frame data from detect_landmarks().
            Each frame has 'landmarks' dict with named landmark positions.

    Returns:
        List of dicts per frame with:
            - frame_index: int
            - timestamp_ms: int
            - left_dorsiflexion: float (degrees)
            - right_dorsiflexion: float (degrees)
            - left_pronation: float (degrees, positive=pronation)
            - right_pronation: float (degrees, positive=pronation)
    """
    angles: list[dict] = []

    for frame in landmarks_over_frames:
        lm = frame.get("landmarks", {})
        frame_angles: dict = {
            "frame_index": frame["frame_index"],
            "timestamp_ms": frame["timestamp_ms"],
            "left_dorsiflexion": 0.0,
            "right_dorsiflexion": 0.0,
            "left_pronation": 0.0,
            "right_pronation": 0.0,
        }

        # Left ankle dorsiflexion: angle at LEFT_ANKLE from LEFT_KNEE to LEFT_FOOT_INDEX
        if all(k in lm for k in ("LEFT_KNEE", "LEFT_ANKLE", "LEFT_FOOT_INDEX")):
            frame_angles["left_dorsiflexion"] = _angle_between_points(
                lm["LEFT_KNEE"], lm["LEFT_ANKLE"], lm["LEFT_FOOT_INDEX"]
            )

        # Right ankle dorsiflexion
        if all(k in lm for k in ("RIGHT_KNEE", "RIGHT_ANKLE", "RIGHT_FOOT_INDEX")):
            frame_angles["right_dorsiflexion"] = _angle_between_points(
                lm["RIGHT_KNEE"], lm["RIGHT_ANKLE"], lm["RIGHT_FOOT_INDEX"]
            )

        # Left pronation/supination from heel-ankle lateral deviation
        if all(k in lm for k in ("LEFT_ANKLE", "LEFT_HEEL")):
            frame_angles["left_pronation"] = _lateral_deviation(
                lm["LEFT_ANKLE"], lm["LEFT_HEEL"]
            )

        # Right pronation/supination
        if all(k in lm for k in ("RIGHT_ANKLE", "RIGHT_HEEL")):
            frame_angles["right_pronation"] = _lateral_deviation(
                lm["RIGHT_ANKLE"], lm["RIGHT_HEEL"]
            )

        angles.append(frame_angles)

    return angles


def compute_knee_angles(landmarks_over_frames: list[dict]) -> list[dict]:
    """Compute knee flexion angles from landmarks across frames.

    Knee flexion angle from Hip-Knee-Ankle landmarks for both sides.

    Args:
        landmarks_over_frames: List of frame data from detect_landmarks().

    Returns:
        List of dicts per frame with:
            - frame_index: int
            - timestamp_ms: int
            - left_knee_flexion: float (degrees)
            - right_knee_flexion: float (degrees)
    """
    angles: list[dict] = []

    for frame in landmarks_over_frames:
        lm = frame.get("landmarks", {})
        frame_angles: dict = {
            "frame_index": frame["frame_index"],
            "timestamp_ms": frame["timestamp_ms"],
            "left_knee_flexion": 0.0,
            "right_knee_flexion": 0.0,
        }

        # Left knee flexion: angle at LEFT_KNEE from LEFT_HIP to LEFT_ANKLE
        if all(k in lm for k in ("LEFT_HIP", "LEFT_KNEE", "LEFT_ANKLE")):
            frame_angles["left_knee_flexion"] = _angle_between_points(
                lm["LEFT_HIP"], lm["LEFT_KNEE"], lm["LEFT_ANKLE"]
            )

        # Right knee flexion
        if all(k in lm for k in ("RIGHT_HIP", "RIGHT_KNEE", "RIGHT_ANKLE")):
            frame_angles["right_knee_flexion"] = _angle_between_points(
                lm["RIGHT_HIP"], lm["RIGHT_KNEE"], lm["RIGHT_ANKLE"]
            )

        angles.append(frame_angles)

    return angles
