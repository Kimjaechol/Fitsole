---
phase: 02-foot-scanning
plan: 02
subsystem: measurement-service
tags: [sfm, colmap, fastapi, opencv, 3d-reconstruction, foot-measurement]
dependency_graph:
  requires: []
  provides: [sfm-pipeline, measurement-api, a4-calibration, glb-export]
  affects: [scan-frontend, results-viewer, insole-design]
tech_stack:
  added: [fastapi, pycolmap, opencv-python-headless, mediapipe, open3d, trimesh, numpy, scipy]
  patterns: [pipeline-module-pattern, a4-paper-calibration, poisson-reconstruction]
key_files:
  created:
    - services/measurement/Dockerfile
    - services/measurement/requirements.txt
    - services/measurement/docker-compose.yml
    - services/measurement/app/main.py
    - services/measurement/app/api/scan.py
    - services/measurement/app/pipeline/frame_extractor.py
    - services/measurement/app/pipeline/quality_filter.py
    - services/measurement/app/pipeline/a4_detector.py
    - services/measurement/app/pipeline/sfm_reconstructor.py
    - services/measurement/app/pipeline/mesh_generator.py
    - services/measurement/app/pipeline/measurement_extractor.py
    - services/measurement/app/pipeline/model_exporter.py
    - services/measurement/tests/conftest.py
  modified: []
decisions:
  - "Used pycolmap with sequential matching (not exhaustive) per RESEARCH Pitfall 2 for video frame temporal ordering"
  - "A4 calibration uses median of first 5 frames for robustness against single-frame detection errors"
  - "Poisson reconstruction with 50K point cloud cap and 20K face mesh limit for GLB < 5MB target"
  - "Measurement extraction uses Z-axis cross-section regions (percentages) for anatomical landmark estimation"
metrics:
  duration: 5min
  completed: 2026-04-09
  tasks: 2
  files: 17
---

# Phase 02 Plan 02: SfM Processing Pipeline Summary

Dockerized Python FastAPI service with complete 7-module SfM pipeline: video frame extraction at 2 FPS, Laplacian-based quality filtering with 3-tier scoring, A4 paper contour detection for pixel-to-mm calibration (297x210mm), COLMAP incremental reconstruction via pycolmap (SIFT + sequential matching), Open3D Poisson mesh generation with decimation, 6-dimension foot measurement extraction, and trimesh GLB export.

## What Was Built

### Task 1: Python backend scaffold with Docker and FastAPI
- **Commit:** 8da6e7c
- FastAPI app ("FitSole Measurement Service") with CORS for localhost:3000 and fitsole.kr
- POST /scan/process endpoint accepting video upload with full processing pipeline orchestration
- Dockerfile based on python:3.12-slim with ffmpeg, OpenCV system deps
- docker-compose.yml with port 8000 and dev volume mount
- Threat mitigations implemented:
  - T-02-04: MIME type validation (video/* only)
  - T-02-05: 500MB file size limit, temp directory cleanup
  - T-02-06: UUID format validation for scanId, path sanitization
- pytest conftest.py with TestClient and sample frame fixtures

### Task 2: SfM processing pipeline modules (7 modules)
- **Commit:** 80a9a76
- **frame_extractor.py**: cv2.VideoCapture frame extraction at configurable FPS (default 2.0), sequential JPEG naming for COLMAP compatibility
- **quality_filter.py**: Laplacian variance blur detection (threshold 100), luminance darkness check (threshold 50), composite 0-100 scoring, 3-tier labels (good >= 70, fair >= 40, poor < 40)
- **a4_detector.py**: Canny edge + contour detection, 4-corner polygon filtering, A4 aspect ratio validation (1.3-1.55), median pixels_per_mm from first 5 frames
- **sfm_reconstructor.py**: pycolmap SIFT extraction (8192 max features), sequential matching (overlap=10, no loop detection), incremental mapping with bundle adjustment
- **mesh_generator.py**: Open3D point cloud creation, random downsampling to 50K points, normal estimation, Poisson reconstruction (depth 8), quadric decimation to 20K faces
- **measurement_extractor.py**: 6 anatomical measurements via Z-axis cross-sections -- foot_length, ball_width (55-75%), instep_height (40-55%), arch_height (30-50%), heel_width (0-15%), toe_length (80-100%)
- **model_exporter.py**: Open3D to trimesh conversion with vertex color transfer, GLB binary export, 5MB size warning

## Deviations from Plan

None - plan executed exactly as written. Threat model mitigations (T-02-04, T-02-05, T-02-06) were specified in the plan's threat_model section and implemented in scan.py.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| GLB model URL placeholder | services/measurement/app/api/scan.py | ~144 | Returns local path `/models/{scanId}_{footSide}.glb` instead of S3/R2 URL. File storage integration is future work (noted with TODO comment). |

## Threat Flags

None - all endpoints and trust boundaries match the plan's threat model (T-02-04, T-02-05, T-02-06).

## Decisions Made

1. **Sequential matching over exhaustive** -- Video frames have natural temporal overlap, sequential matching is both faster and more appropriate per RESEARCH Pitfall 2
2. **Median A4 calibration** -- Using median of detected scales across first 5 frames reduces single-frame detection noise
3. **50K/20K decimation targets** -- Balances reconstruction fidelity against mobile GLB viewing performance (< 5MB target)
4. **Z-axis cross-section measurement** -- Foot anatomy mapped to Z-axis percentage regions for measurement extraction without ML-based landmark detection

## Self-Check: PASSED

- All 13 created files verified on disk
- Both commit hashes (8da6e7c, 80a9a76) verified in git log
