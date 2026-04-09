# Phase 2: Foot Scanning - Research

**Researched:** 2026-04-09
**Domain:** Video SfM 3D foot reconstruction, AI gait analysis, pressure estimation, 3D visualization
**Confidence:** MEDIUM

## Summary

This phase implements the core differentiator of FitSole: smartphone video-based 3D foot scanning using Structure-from-Motion (SfM), AI gait analysis from walking video, and AI-estimated pressure distribution. The architecture is a hybrid split -- the Next.js frontend handles video capture, camera guidance, and 3D visualization, while a Python FastAPI backend runs the heavy CV/ML processing (COLMAP SfM, MediaPipe Pose, pressure estimation).

The primary technical challenge is the SfM pipeline: extracting frames from 15-20s smartphone video, running COLMAP incremental reconstruction to produce a 3D point cloud/mesh, detecting A4 paper for scale calibration, and extracting foot measurements from the 3D model. Research confirms +-0.15mm mean error is achievable with SfM from smartphone video sequences (ScienceDirect 2025 paper). The gait analysis pipeline uses MediaPipe Pose Landmarker for 33-point body landmark detection from walking video, then analyzes ankle angles, gait patterns, and arch flexibility across frames.

A significant constraint is that the development machine lacks COLMAP, ffmpeg, Docker, and has Python 3.9.6 (pycolmap requires >=3.10). The Python backend must be developed within a Docker container or a virtual environment with Python 3.10+. The recommendation is to use Docker for the FastAPI backend to ensure reproducible COLMAP+GPU setup.

**Primary recommendation:** Use pycolmap (pip) for SfM processing inside a Dockerized FastAPI service, tus-js-client for resumable video upload, MediaPipe Pose Landmarker (Python server-side) for gait analysis, and React Three Fiber for 3D foot model visualization. Use glTF/GLB as the 3D model interchange format.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Video SfM scanning, NOT photo-based -- user records 15-20s video circling foot on A4 paper. SfM algorithm reconstructs 3D point cloud from frames. 6x more accurate than 3-photo method (+-0.15mm vs +-0.95mm)
- **D-02:** A4 paper calibration -- pixel-to-mm conversion from A4 dimensions (297mm x 210mm). Initial frames detect A4, scale applied to 3D model
- **D-03:** Server-side SfM processing -- COLMAP or OpenSfM on Python FastAPI backend with GPU. Client captures video, uploads to server for 3D reconstruction (3-5 min processing)
- **D-04:** SIFT feature point extraction from video frames for dense 3D point cloud generation
- **D-05:** Walking video capture -- user places phone on floor, walks 5-10 steps. 3-second timer before auto-start
- **D-06:** MediaPipe Pose for 33-point 3D body landmark detection from RGB walking video
- **D-07:** AI analyzes: gait pattern, ankle alignment (pronation/supination), arch flexibility (static vs dynamic comparison), weight-bearing foot deformation
- **D-08:** Weight-bearing deformation data: forefoot expands 9.7-10.4%, midfoot height decreases 15.1-18.2%, plantar contact area increases 11.4-23%
- **D-09:** AI-estimated pressure heatmap (no physical sensors) -- inputs: weight, foot size, arch height, gender, age. ML model predicts pressure distribution patterns. 70-80% accuracy vs physical sensors
- **D-10:** Pressure heatmap displayed on foot sole visualization with high-pressure zone warnings
- **D-11:** Static SfM: foot length, ball width, instep height, arch height, heel width, toe length
- **D-12:** Dynamic AI: gait pattern classification, ankle alignment (pronation/supination), arch flexibility index
- **D-13:** AI-estimated: plantar pressure distribution heatmap
- **D-14:** Entry via bottom tab "측정" tab -> onboarding guide (first time only)
- **D-15:** Step 1: A4 paper placement + foot positioning with AR overlay guide
- **D-16:** Step 2: Circular motion video recording (15-20s) with circular trajectory guide on screen + real-time frame quality check (blur/lighting warnings)
- **D-17:** Step 3: Walking video (5-10 steps) with floor-level camera placement guide + AI real-time landmark detection feedback
- **D-18:** Step 4: Processing screen ("처리 중...") -> 3D model rendering -> results display
- **D-19:** Quality scoring: automatic per-frame quality assessment, reject blurry/poorly lit frames, prompt re-scan with specific guidance
- **D-20:** Left/right foot scanned independently -- flow repeats for second foot
- **D-21:** Interactive 3D foot model (rotate/zoom) rendered with Three.js/React Three Fiber
- **D-22:** Measurement values displayed alongside 3D model
- **D-23:** Plantar pressure heatmap visualization (color-coded heat zones)
- **D-24:** CTA at bottom: "이 데이터로 맞춤 신발을 추천받으시겠습니까?"

### Claude's Discretion
- Specific COLMAP vs OpenSfM choice (both acceptable per report)
- Video upload chunking strategy and progress UI
- Exact frame selection algorithm from video
- 3D model file format (PLY, OBJ, or glTF)
- Specific MediaPipe model version and configuration

### Deferred Ideas (OUT OF SCOPE)
- Smart insole kit hardware integration -- Phase 6
- AR shoe try-on overlay -- future consideration
- Real-time on-device SfM processing -- future optimization
- LiDAR-specific path for iPhone Pro users -- future enhancement

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCAN-01 | User can launch guided foot scanning flow on smartphone camera | Camera API (getUserMedia), scan stepper UI, onboarding flow |
| SCAN-02 | User places foot on A4 paper for reference-object calibration | OpenCV contour detection for A4 rectangle, pixel-to-mm ratio from 297x210mm |
| SCAN-03 | System provides real-time guidance on lighting, angle, positioning during video scan | Client-side frame quality analysis (blur detection via Laplacian variance, brightness check), guidance overlay UI |
| SCAN-04 | System captures video (15-20s) and reconstructs 3D model via SfM (+-0.15mm) | pycolmap incremental SfM pipeline, SIFT features, video frame extraction via ffmpeg/OpenCV |
| SCAN-05 | System detects and stores left/right foot asymmetry separately | DB schema for per-foot measurements, comparison logic |
| SCAN-06 | System scores scan quality and prompts re-scan if insufficient | Quality scoring algorithm (blur, lighting, coverage, COLMAP reconstruction confidence) |
| SCAN-07 | User can view 3D foot model with measurement overlay and pressure heatmap | React Three Fiber + OrbitControls, GLB model loading, measurement line overlays, pressure heatmap texture |
| SCAN-08 | User can record walking video (5-10 steps) for AI gait analysis | Camera capture at floor level, 3-second countdown, step detection |
| SCAN-09 | System analyzes gait pattern, ankle alignment, arch flexibility | MediaPipe Pose 33-landmark detection, angle calculation between landmarks across frames |
| SCAN-10 | System generates AI-estimated pressure distribution heatmap | ML model with inputs (weight, foot size, arch height, gender, age), heatmap generation |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- GSD workflow enforcement: use `/gsd-quick`, `/gsd-debug`, or `/gsd-execute-phase` for repo changes
- No direct repo edits outside GSD workflow unless user explicitly asks

## Standard Stack

### Core (Phase 2 Specific)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pycolmap | latest (Apr 2026) | SfM reconstruction | Official Python bindings for COLMAP. pip-installable. Supports incremental SfM, SIFT features, bundle adjustment. GPU via pycolmap-cuda12 on Linux. [VERIFIED: pypi.org/project/pycolmap] |
| FastAPI | 0.115+ | Python CV backend | Async Python web framework for serving SfM and gait analysis endpoints. Already chosen in project stack. [VERIFIED: project STACK.md] |
| MediaPipe (Python) | latest | Gait landmark detection | Server-side 33-point pose landmark detection from walking video frames. More reliable than browser-side for analysis accuracy. [VERIFIED: ai.google.dev/edge/mediapipe] |
| OpenCV (Python) | 4.x | Image/video processing | Frame extraction from video, A4 paper detection (contour detection), blur detection (Laplacian), image quality analysis. [VERIFIED: docs.opencv.org] |
| @react-three/fiber | 9.5.0 | 3D visualization (React) | React wrapper for Three.js. v9 pairs with React 19. [VERIFIED: npm registry] |
| @react-three/drei | 10.7.7 | R3F helpers | OrbitControls, useGLTF, Environment for 3D foot model viewer. [VERIFIED: npm registry] |
| three | 0.183.2 | 3D engine | Underlying Three.js engine for R3F. GLB loading, point cloud rendering, measurement overlays. [VERIFIED: npm registry] |
| @mediapipe/tasks-vision | 0.10.34 | Client-side pose preview | Real-time body landmark detection in browser for walking video UI feedback (dots on video). [VERIFIED: npm registry] |
| tus-js-client | 4.3.1 | Resumable video upload | TUS protocol for reliable 200-500MB video uploads from smartphone to server. Resume on network interruption. [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| NumPy | latest | Numeric computation | Point cloud processing, measurement extraction, coordinate transforms in Python backend. [ASSUMED] |
| SciPy | latest | Scientific computing | Mesh processing, interpolation for pressure heatmap generation. [ASSUMED] |
| trimesh | latest | 3D mesh processing | Load/export meshes, extract measurements from 3D foot model, convert COLMAP output to GLB. [ASSUMED] |
| Open3D | latest | Point cloud processing | Point cloud cleanup, meshing (Poisson surface reconstruction), normal estimation from COLMAP output. [ASSUMED] |
| ffmpeg (system) | any | Video frame extraction | Extract frames from uploaded video at configurable FPS before COLMAP processing. [VERIFIED: standard tool] |
| Docker | any | Backend containerization | Package FastAPI + COLMAP + GPU dependencies in reproducible container. [ASSUMED] |
| Uppy | 5.2.0 | Upload UI (optional) | Pre-built React upload UI component with tus plugin, progress bar, retry. Alternative to raw tus-js-client. [VERIFIED: npm registry] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| COLMAP (pycolmap) | OpenSfM | OpenSfM requires building from source (no pip), less active maintenance, fewer features. COLMAP has pip wheels, GPU support, and is the standard in academia. Use COLMAP. |
| tus-js-client | Direct S3 presigned upload | S3 presigned upload lacks resume-on-disconnect for mobile networks. tus provides automatic resume. Use tus. |
| Uppy (full UI) | Raw tus-js-client | tus-js-client is lighter but needs custom progress UI. Uppy provides ready-made upload UI. Either works; tus-js-client + custom UI aligns better with shadcn/ui design system. |
| GLB format | PLY or OBJ | PLY is raw point cloud (no material support). OBJ is text-based (large files). GLB is binary glTF -- compact, supports materials/textures, native Three.js support via useGLTF. Use GLB. |
| Server-side MediaPipe | Browser-side MediaPipe | Browser-side works for real-time preview but server-side is more accurate for actual analysis with full resolution. Use both: browser for preview, server for analysis. |

**Installation:**

Frontend (Next.js):
```bash
npm install @react-three/fiber @react-three/drei three @mediapipe/tasks-vision tus-js-client
npm install -D @types/three
```

Backend (Python FastAPI, inside Docker):
```bash
pip install fastapi uvicorn pycolmap opencv-python-headless mediapipe numpy scipy trimesh open3d
# For GPU: pip install pycolmap-cuda12 (Linux only)
```

### Discretion Decisions (Recommendations)

**COLMAP over OpenSfM:** Use COLMAP via pycolmap. Rationale: pip-installable, GPU acceleration via CUDA wheels, active development (latest release Apr 6, 2026), comprehensive Python API for custom pipelines, dominant in academic SfM research. OpenSfM requires building from source with Ceres Solver dependency -- significantly harder to containerize. [VERIFIED: pypi.org, github.com/colmap/colmap]

**GLB as 3D model format:** Use glTF Binary (.glb). Rationale: compact binary format, native Three.js/R3F support via useGLTF, supports PBR materials for realistic rendering, wide ecosystem support. The pipeline converts COLMAP point cloud -> Open3D mesh -> trimesh GLB export. [VERIFIED: threejs.org docs, r3f docs]

**tus-js-client with custom progress UI:** Use tus-js-client directly (not Uppy) with a custom shadcn/ui progress bar. Rationale: smaller bundle, full control over UI to match the app's design system, simpler integration. Uppy adds 50KB+ bundle for features we don't need. [ASSUMED]

**Frame selection: every 0.5 seconds:** Extract frames at 2 FPS from 15-20s video = 30-40 frames. This provides sufficient overlap for COLMAP feature matching while keeping processing time reasonable. Use OpenCV or ffmpeg for extraction. Filter out blurry frames (Laplacian variance threshold). [ASSUMED]

**MediaPipe configuration:** Use `pose_landmarker_full.task` model for server-side gait analysis (highest accuracy). Use `pose_landmarker_lite.task` for browser-side real-time preview (fastest). [VERIFIED: ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker]

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)
```
src/
├── app/(main)/scan/
│   ├── page.tsx                    # Scan home (onboarding or history)
│   ├── new/
│   │   └── page.tsx                # Scan flow stepper (client component)
│   ├── processing/[id]/
│   │   └── page.tsx                # Processing status polling page
│   └── results/[id]/
│       └── page.tsx                # Results with 3D viewer
├── components/scan/
│   ├── scan-stepper.tsx            # 4-step progress indicator
│   ├── camera-viewfinder.tsx       # Fullscreen camera with getUserMedia
│   ├── recording-button.tsx        # 72px circle, start/stop
│   ├── guidance-overlay.tsx        # Real-time text guidance
│   ├── circular-guide.tsx          # SVG circular motion trajectory
│   ├── a4-paper-guide.tsx          # AR-style A4 rectangle overlay
│   ├── walking-guide.tsx           # Floor-level camera instructions
│   ├── quality-badge.tsx           # Quality score pill
│   ├── processing-animation.tsx    # Animated processing screen
│   ├── foot-model-3d.tsx           # R3F Canvas + OrbitControls
│   ├── measurement-card.tsx        # Label + value + unit card
│   ├── measurement-overlay.tsx     # 3D dimension lines on model
│   ├── pressure-heatmap.tsx        # Color-coded pressure on 3D model
│   ├── heatmap-legend.tsx          # Vertical gradient legend
│   ├── rescan-prompt.tsx           # Re-scan warning with guidance
│   ├── scan-onboarding.tsx         # First-time guide carousel
│   ├── scan-history.tsx            # Previous scan list
│   └── foot-side-selector.tsx      # Left/right foot toggle
├── lib/
│   ├── scan/
│   │   ├── store.ts                # Zustand store for scan workflow state
│   │   ├── camera.ts               # getUserMedia helpers, quality checks
│   │   ├── upload.ts               # tus-js-client upload wrapper
│   │   └── types.ts                # Scan-related TypeScript types
│   └── three/
│       ├── foot-viewer.tsx         # R3F scene setup for foot model
│       └── measurement-lines.tsx   # Three.js line geometry for dimensions
├── app/api/scan/
│   ├── upload/route.ts             # tus upload endpoint (or proxy to backend)
│   ├── status/[id]/route.ts        # Poll processing status
│   └── results/[id]/route.ts       # Fetch completed results
└── lib/db/
    └── schema.ts                   # Extended with footScans, footMeasurements tables

# Python Backend (separate service)
services/measurement/
├── Dockerfile                      # Python 3.12 + COLMAP + CUDA
├── requirements.txt
├── app/
│   ├── main.py                     # FastAPI app entry
│   ├── api/
│   │   ├── scan.py                 # POST /scan/process endpoint
│   │   ├── gait.py                 # POST /gait/analyze endpoint
│   │   └── pressure.py             # POST /pressure/estimate endpoint
│   ├── pipeline/
│   │   ├── frame_extractor.py      # Video -> frames (ffmpeg/OpenCV)
│   │   ├── quality_filter.py       # Blur/lighting frame filtering
│   │   ├── a4_detector.py          # A4 paper contour detection + scale
│   │   ├── sfm_reconstructor.py    # pycolmap incremental SfM
│   │   ├── mesh_generator.py       # Point cloud -> mesh (Open3D)
│   │   ├── measurement_extractor.py # Mesh -> foot dimensions
│   │   └── model_exporter.py       # Mesh -> GLB export (trimesh)
│   ├── gait/
│   │   ├── pose_detector.py        # MediaPipe Pose landmark detection
│   │   ├── angle_calculator.py     # Joint angle computation
│   │   ├── gait_classifier.py      # Pattern classification
│   │   └── arch_analyzer.py        # Arch flexibility analysis
│   └── pressure/
│       ├── estimator.py            # Pressure distribution ML model
│       └── heatmap_generator.py    # Generate heatmap image/data
├── models/                         # ML model weights
└── tests/
    ├── test_pipeline.py
    ├── test_gait.py
    └── test_pressure.py
```

### Pattern 1: Video-to-3D SfM Pipeline
**What:** Sequential pipeline: Video -> Frame Extraction -> Quality Filter -> A4 Detection/Calibration -> COLMAP SfM -> Point Cloud -> Mesh -> Measurements -> GLB Export
**When to use:** Processing every foot scan video upload
**Example:**
```python
# Source: pycolmap docs + COLMAP tutorial
import pycolmap
from pathlib import Path

def run_sfm_pipeline(frames_dir: Path, output_dir: Path) -> pycolmap.Reconstruction:
    """Run incremental SfM on extracted video frames."""
    output_dir.mkdir(exist_ok=True)
    
    # Feature extraction (SIFT as per D-04)
    pycolmap.extract_features(
        database_path=output_dir / "database.db",
        image_path=frames_dir,
        sift_options=pycolmap.SiftExtractionOptions()
    )
    
    # Feature matching
    pycolmap.match_sequential(
        database_path=output_dir / "database.db",
        matching_options=pycolmap.SequentialMatchingOptions()
    )
    
    # Incremental reconstruction
    reconstructions = pycolmap.incremental_mapping(
        database_path=output_dir / "database.db",
        image_path=frames_dir,
        output_path=output_dir / "sparse"
    )
    
    return reconstructions[0] if reconstructions else None
```
[VERIFIED: pycolmap PyPI docs, COLMAP documentation]

### Pattern 2: A4 Paper Detection and Scale Calibration
**What:** Detect the A4 paper rectangle in initial video frames using OpenCV contour detection, compute pixel-to-mm ratio from known A4 dimensions (297mm x 210mm).
**When to use:** Before SfM processing -- scale factor applied to 3D reconstruction output
**Example:**
```python
# Source: OpenCV contour detection + A4 calibration pattern
import cv2
import numpy as np

def detect_a4_paper(frame: np.ndarray) -> tuple[np.ndarray, float] | None:
    """Detect A4 paper and return corners + pixels_per_mm ratio."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    for contour in sorted(contours, key=cv2.contourArea, reverse=True):
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        
        if len(approx) == 4:
            # Verify aspect ratio matches A4 (297/210 = 1.414)
            rect = cv2.minAreaRect(contour)
            w, h = rect[1]
            ratio = max(w, h) / min(w, h) if min(w, h) > 0 else 0
            
            if 1.3 < ratio < 1.55:  # A4 aspect ratio tolerance
                # Calculate pixels per mm
                pixel_length = max(w, h)
                pixels_per_mm = pixel_length / 297.0  # A4 long edge
                return approx, pixels_per_mm
    
    return None
```
[ASSUMED -- standard OpenCV pattern, not verified against specific foot scanning implementation]

### Pattern 3: Gait Analysis from MediaPipe Landmarks
**What:** Extract pose landmarks from walking video frames, compute ankle angles over time, classify gait pattern
**When to use:** Processing walking video (SCAN-08, SCAN-09)
**Example:**
```python
# Source: MediaPipe Pose Landmarker docs
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np

def analyze_gait(video_path: str) -> dict:
    """Analyze gait from walking video using MediaPipe Pose."""
    base_options = python.BaseOptions(
        model_asset_path='pose_landmarker_full.task'
    )
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1
    )
    
    landmarker = vision.PoseLandmarker.create_from_options(options)
    
    # Process frames and collect ankle angles
    ankle_angles = []
    # Landmarks: LEFT_ANKLE=27, RIGHT_ANKLE=28, LEFT_KNEE=25, RIGHT_KNEE=26
    # LEFT_HEEL=29, RIGHT_HEEL=30, LEFT_FOOT_INDEX=31, RIGHT_FOOT_INDEX=32
    
    # ... frame processing loop ...
    
    return {
        "gait_pattern": classify_gait(ankle_angles),
        "ankle_alignment": compute_pronation_supination(ankle_angles),
        "arch_flexibility": compute_arch_flex_index(landmarks_over_time),
    }
```
[VERIFIED: MediaPipe Pose Landmarker landmark indices from ai.google.dev]

### Pattern 4: Resumable Video Upload with TUS
**What:** Upload 200-500MB video from smartphone to server with resume capability
**When to use:** After video recording completes, before processing
**Example:**
```typescript
// Source: tus-js-client docs
import * as tus from 'tus-js-client';

export function uploadScanVideo(
  file: File,
  scanId: string,
  onProgress: (percent: number) => void,
  onComplete: (url: string) => void,
): tus.Upload {
  const upload = new tus.Upload(file, {
    endpoint: '/api/scan/upload',
    retryDelays: [0, 1000, 3000, 5000],
    chunkSize: 5 * 1024 * 1024, // 5MB chunks
    metadata: {
      filename: file.name,
      filetype: file.type,
      scanId: scanId,
    },
    onProgress: (bytesUploaded, bytesTotal) => {
      onProgress(Math.round((bytesUploaded / bytesTotal) * 100));
    },
    onSuccess: () => {
      onComplete(upload.url!);
    },
  });
  
  upload.start();
  return upload;
}
```
[VERIFIED: tus-js-client GitHub docs]

### Anti-Patterns to Avoid
- **Running COLMAP in browser:** COLMAP requires C++/CUDA. Never attempt client-side SfM. Use server-side pycolmap exclusively.
- **Sending raw video to COLMAP:** Always extract and filter frames first. Sending 30fps video means 450-600 frames for 15-20s -- excessive. Extract at 2 FPS and filter blurry frames.
- **Blocking API during SfM processing:** SfM takes 3-5 minutes. Never use synchronous request/response. Use async job queue (background task or Celery) with status polling.
- **Storing 3D models in Postgres:** GLB files are 5-50MB. Store in S3/R2, save URL reference in database.
- **Skipping A4 detection validation:** If A4 paper is not detected, all measurements will be wrong. Fail early with re-scan prompt.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SfM reconstruction | Custom feature matching + bundle adjustment | pycolmap | COLMAP is the result of 10+ years of academic research. Hand-rolling SfM is a multi-year PhD project. |
| Pose landmark detection | Custom skeleton detection CNN | MediaPipe Pose Landmarker | Google's pre-trained model with 33 landmarks, optimized for mobile. Training custom model requires millions of labeled images. |
| Point cloud to mesh | Custom meshing algorithm | Open3D Poisson reconstruction | Meshing from noisy point clouds requires advanced algorithms (Poisson, Ball Pivoting). Open3D implements these. |
| Mesh to GLB export | Custom binary serializer | trimesh | glTF spec is complex (buffer views, accessors, materials). trimesh handles the serialization. |
| Resumable uploads | Custom chunked upload protocol | tus-js-client | TUS protocol handles resume, retry, chunk management, and works across network interruptions. |
| Camera access | Raw WebRTC | getUserMedia + standard helpers | Browser camera API is well-standardized. Just use getUserMedia with constraints. |
| Blur detection | Custom CNN for blur | OpenCV Laplacian variance | `cv2.Laplacian(gray, cv2.CV_64F).var()` -- single line, well-established technique. |

**Key insight:** This phase combines multiple deep technical domains (computer vision, 3D geometry, ML inference, 3D rendering). Each domain has mature open-source solutions. The engineering challenge is *orchestrating* these tools, not reimplementing them.

## Common Pitfalls

### Pitfall 1: Python Version Mismatch
**What goes wrong:** pycolmap requires Python >=3.10. Development machine has Python 3.9.6.
**Why it happens:** macOS ships with older Python. pip install pycolmap fails silently or with cryptic errors.
**How to avoid:** Use Docker for the Python backend. Dockerfile specifies `python:3.12-slim` base image with COLMAP dependencies.
**Warning signs:** `pip install pycolmap` fails, ImportError on pycolmap.

### Pitfall 2: COLMAP Sequential vs Exhaustive Matching
**What goes wrong:** Using exhaustive matching on 30-40 frames takes 10+ minutes instead of 3-5 minutes.
**Why it happens:** Exhaustive matching is O(n^2). Sequential matching assumes nearby frames overlap (true for video).
**How to avoid:** Use `pycolmap.match_sequential()` for video-sourced frames, NOT `pycolmap.match_exhaustive()`. Video frames have natural sequential overlap.
**Warning signs:** Processing time >5 minutes for a single foot scan.

### Pitfall 3: Missing A4 Paper in Frames
**What goes wrong:** A4 detection fails because paper is partially occluded by foot, or lighting creates glare on paper.
**Why it happens:** User places foot on paper (covering it) before the system detects the paper.
**How to avoid:** Detect A4 paper in the FIRST few frames before foot is placed. Guide user: "A4 용지를 놓고 잠시 기다려주세요" -> detect paper -> "이제 발을 올려주세요". Two-phase capture.
**Warning signs:** A4 detection returning None for >50% of initial frames.

### Pitfall 4: GLB File Size Explosion
**What goes wrong:** Dense COLMAP reconstruction produces 500K+ points, resulting in 50MB+ GLB files that crash mobile browsers.
**Why it happens:** No point cloud decimation or mesh simplification step.
**How to avoid:** Decimate point cloud to ~50K points with Open3D before meshing. Simplify mesh to ~20K faces. Target GLB size < 5MB. Use Draco compression for further reduction.
**Warning signs:** GLB files > 10MB, Three.js canvas freezing on mobile.

### Pitfall 5: Camera Permission UX on iOS Safari
**What goes wrong:** getUserMedia fails silently or with unhelpful error on iOS Safari.
**Why it happens:** iOS requires HTTPS, specific permission flow, and has different API constraints than Chrome.
**How to avoid:** Always serve over HTTPS (even in dev). Handle `NotAllowedError` and `NotFoundError` explicitly. Show iOS-specific guidance for enabling camera in Settings.
**Warning signs:** Camera works on desktop Chrome but fails on iPhone Safari.

### Pitfall 6: Video File Too Large for Upload
**What goes wrong:** 15-20s video at 4K/60fps = 500MB+. Upload takes too long, times out, or fails.
**Why it happens:** Modern smartphones record at high resolution by default.
**How to avoid:** Use getUserMedia constraints to limit resolution: `{ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } } }`. 1080p/30fps for 20s = ~60-100MB. Much more manageable.
**Warning signs:** Recorded files > 200MB.

### Pitfall 7: Processing Status Lost on Page Reload
**What goes wrong:** User navigates away or refreshes during 3-5 min processing, loses track of scan status.
**Why it happens:** Scan state only in browser memory (Zustand).
**How to avoid:** Create scan record in DB immediately when upload completes. Poll status from DB via API. User can navigate away and return to `/scan/processing/[id]` to see status. Use TanStack Query with 5s polling interval.
**Warning signs:** User complaints about "lost" scans.

## Code Examples

### Database Schema Extension
```typescript
// Source: Existing schema.ts pattern + phase requirements
import { pgTable, text, timestamp, uuid, real, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const scanStatusEnum = pgEnum('scan_status', [
  'uploading', 'processing', 'completed', 'failed'
]);

export const footSideEnum = pgEnum('foot_side', ['left', 'right']);

export const footScans = pgTable("foot_scans", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  footSide: footSideEnum("foot_side").notNull(),
  status: scanStatusEnum("status").notNull().default('uploading'),
  videoUrl: text("video_url"),           // S3/R2 URL of uploaded video
  modelUrl: text("model_url"),           // S3/R2 URL of GLB 3D model
  qualityScore: real("quality_score"),    // 0-100 quality score
  qualityLabel: text("quality_label"),    // 'good' | 'fair' | 'poor'
  processingStage: text("processing_stage"), // Current processing stage
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const footMeasurements = pgTable("foot_measurements", {
  id: uuid("id").defaultRandom().primaryKey(),
  scanId: uuid("scan_id").notNull().references(() => footScans.id, { onDelete: "cascade" }),
  footLength: real("foot_length"),       // mm
  ballWidth: real("ball_width"),         // mm
  instepHeight: real("instep_height"),   // mm
  archHeight: real("arch_height"),       // mm
  heelWidth: real("heel_width"),         // mm
  toeLength: real("toe_length"),         // mm
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gaitAnalysis = pgTable("gait_analysis", {
  id: uuid("id").defaultRandom().primaryKey(),
  scanId: uuid("scan_id").notNull().references(() => footScans.id, { onDelete: "cascade" }),
  gaitPattern: text("gait_pattern"),            // 'normal' | 'overpronation' | 'supination'
  ankleAlignment: text("ankle_alignment"),      // 'neutral' | 'pronation' | 'supination'
  archFlexibilityIndex: real("arch_flexibility_index"), // 0-1 ratio
  walkingVideoUrl: text("walking_video_url"),
  landmarksData: jsonb("landmarks_data"),       // Raw landmark data for future analysis
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pressureDistribution = pgTable("pressure_distribution", {
  id: uuid("id").defaultRandom().primaryKey(),
  scanId: uuid("scan_id").notNull().references(() => footScans.id, { onDelete: "cascade" }),
  heatmapData: jsonb("heatmap_data"),          // Pressure grid data for visualization
  highPressureZones: jsonb("high_pressure_zones"), // Array of warning zones
  inputWeight: real("input_weight"),            // kg
  inputGender: text("input_gender"),
  inputAge: real("input_age"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```
[ASSUMED -- based on existing schema pattern and requirements]

### React Three Fiber Foot Model Viewer
```typescript
// Source: R3F docs (r3f.docs.pmnd.rs)
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import { Suspense } from 'react';

function FootModel({ modelUrl }: { modelUrl: string }) {
  const { scene } = useGLTF(modelUrl);
  return <primitive object={scene} />;
}

export function FootModel3D({ modelUrl }: { modelUrl: string }) {
  return (
    <div className="h-[360px] w-full rounded-lg bg-slate-50 md:h-[480px]">
      <Canvas camera={{ position: [0, 0.3, 0.4], fov: 45 }}>
        <Suspense fallback={null}>
          <Environment preset="studio" />
          <FootModel modelUrl={modelUrl} />
          <OrbitControls
            enablePan={false}
            minDistance={0.2}
            maxDistance={1.0}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
```
[VERIFIED: r3f.docs.pmnd.rs/tutorials/loading-models]

### Camera Capture with Quality Checks
```typescript
// Source: MDN getUserMedia API
'use client';

export async function initCamera(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'environment' }, // Back camera
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    },
    audio: false,
  });
  return stream;
}

export function checkFrameQuality(
  canvas: HTMLCanvasElement
): { blur: boolean; dark: boolean } {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Brightness check (average pixel luminance)
  let totalLum = 0;
  for (let i = 0; i < data.length; i += 4) {
    totalLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const avgLum = totalLum / (data.length / 4);
  const dark = avgLum < 50;  // threshold
  
  // Blur is best detected server-side with OpenCV Laplacian
  // Client-side approximation: check edge contrast
  return { blur: false, dark };
}
```
[ASSUMED -- standard getUserMedia pattern]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 3-photo multi-view | Video SfM continuous capture | 2024-2025 | 6x accuracy improvement (+-0.15mm vs +-0.95mm). User's research confirms this. |
| Browser-side TF.js depth estimation | Server-side COLMAP SfM | 2024-2025 | Dramatically more accurate 3D reconstruction. Browser depth estimation (MiDaS) is approximate. |
| Separate pycolmap package | Integrated into colmap main package | 2025 | Python bindings now part of main COLMAP. Old standalone pycolmap repo deprecated. |
| COLMAP incremental mapper only | GLOMAP global mapper option | 2025-2026 | Global SfM alternative available but incremental is still recommended for sequential video frames. |
| MediaPipe legacy API | @mediapipe/tasks-vision (new Tasks API) | 2024 | New API is stable, supports WASM backend. Old @mediapipe/pose deprecated. |
| Three.js r140 | Three.js r183 (0.183.2) | Continuous | Major performance improvements, better GLTF support, improved mobile rendering. |

**Deprecated/outdated:**
- `@mediapipe/pose` (old package): Replaced by `@mediapipe/tasks-vision` with PoseLandmarker task. Do not use the legacy package. [VERIFIED: npm]
- Standalone `pycolmap` repo (github.com/colmap/pycolmap): Deprecated. Python bindings now live in main colmap repo. pip package name remains `pycolmap`. [VERIFIED: GitHub]
- Browser-side TF.js for foot measurement (from original STACK.md ADR-2): Superseded by user's decision D-03 for server-side SfM. TF.js/MiDaS monocular depth is not accurate enough for +-0.15mm requirement.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Frame extraction at 2 FPS (30-40 frames from 15-20s video) is optimal for COLMAP | Architecture Patterns | Too few frames = incomplete reconstruction. Too many = slow processing. May need tuning. |
| A2 | Open3D Poisson surface reconstruction is the right meshing approach for foot point clouds | Standard Stack | Alternative meshing algorithms (Ball Pivoting, Marching Cubes) may produce better foot meshes. |
| A3 | GLB file size < 5MB is achievable with 20K-face mesh + Draco compression | Common Pitfalls | May need more aggressive decimation or different compression for mobile. |
| A4 | Pressure estimation ML model can be a simple regression model with inputs (weight, foot size, arch height, gender, age) | Phase Requirements | 70-80% accuracy claim from user's report is unvalidated. May need a pretrained model or research literature. |
| A5 | Docker is the right approach for FastAPI+COLMAP backend | Standard Stack | Could use a cloud-hosted GPU service (Lambda GPU, Modal) instead of self-managed Docker. |
| A6 | trimesh can export COLMAP->Open3D mesh to GLB format | Standard Stack | Conversion chain (COLMAP -> Open3D -> trimesh -> GLB) may have compatibility issues. |
| A7 | Walking video analysis (MediaPipe) can run server-side on CPU (no GPU needed) | Architecture | MediaPipe Pose runs well on CPU for offline analysis. Real-time would need GPU. |
| A8 | tus protocol server-side can be implemented in Next.js API routes | Architecture | May need a separate tus server (tusd) if Next.js route handlers have size limits. Vercel has 4.5MB request body limit. |

## Open Questions

1. **TUS Server Implementation**
   - What we know: tus-js-client handles client-side. Server needs tus protocol support.
   - What's unclear: Can Next.js API routes handle tus protocol, or do we need tusd (standalone tus server)? Vercel has 4.5MB body limit -- incompatible with large file uploads. If deploying on Vercel, uploads must go directly to the Python backend or to S3.
   - Recommendation: Upload directly to Python FastAPI backend (not through Next.js). FastAPI can receive tus uploads via `tusd` sidecar or direct multipart upload to S3 with presigned URLs. Alternatively, use S3 presigned multipart upload and skip tus entirely.

2. **GPU Availability for COLMAP**
   - What we know: pycolmap-cuda12 provides GPU acceleration (Linux only). CPU-only pycolmap works but is slower.
   - What's unclear: How much slower is CPU-only COLMAP for 30-40 frames? Is 3-5 minutes achievable on CPU?
   - Recommendation: Start with CPU-only for development. Profile processing time. If >5 minutes, deploy to GPU instance (e.g., AWS g4dn.xlarge, GCP T4).

3. **Pressure Estimation Model**
   - What we know: D-09 specifies AI-estimated heatmap with 70-80% accuracy using weight/foot size/arch/gender/age inputs.
   - What's unclear: Is there a pre-trained model available, or must we train one? Where is the training data?
   - Recommendation: Start with a rule-based heuristic model (known pressure distribution patterns for arch types) as v1. Replace with ML model when training data is available from smart insole kit (Phase 6).

4. **3D Model Texture/Color**
   - What we know: COLMAP produces colored point clouds (uses photo RGB). GLB supports PBR materials.
   - What's unclear: Should the foot model have photo-realistic texture from the video frames, or a stylized/uniform material?
   - Recommendation: Use vertex colors from COLMAP reconstruction for realistic look. Simpler than UV-mapped textures and preserves the visual fidelity of the scan.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.12+ | FastAPI + pycolmap backend | Partial (3.9.6) | 3.9.6 | Use Docker with python:3.12 base image |
| COLMAP / pycolmap | SfM reconstruction (SCAN-04) | No | -- | Install via Docker/pip inside container |
| ffmpeg | Video frame extraction | No | -- | Use OpenCV VideoCapture in Python (cv2.VideoCapture) |
| Docker | Backend containerization | No | -- | Install Docker Desktop for Mac, or use cloud-hosted GPU service |
| Node.js | Next.js frontend | Yes | (via package.json) | -- |
| GPU (CUDA) | COLMAP acceleration | No (macOS) | -- | CPU-only pycolmap for dev, GPU instance for prod |

**Missing dependencies with no fallback:**
- Python 3.10+ is required for pycolmap. Docker is the most practical solution.
- At least one of Docker or cloud GPU service is needed for the backend.

**Missing dependencies with fallback:**
- ffmpeg: Use cv2.VideoCapture() instead (slightly less performant but functional)
- GPU: CPU-only COLMAP works, just slower. Acceptable for development.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.3 (frontend), pytest (backend) |
| Config file | `vitest.config.ts` (exists), `pytest.ini` (Wave 0) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run && cd services/measurement && pytest` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCAN-01 | Scan flow launches with camera | integration | `npx vitest run src/components/scan/__tests__/scan-stepper.test.tsx -t "launches scan flow"` | Wave 0 |
| SCAN-02 | A4 paper detection returns scale factor | unit (Python) | `pytest services/measurement/tests/test_a4_detector.py -x` | Wave 0 |
| SCAN-03 | Quality check detects blur/dark frames | unit (Python) | `pytest services/measurement/tests/test_quality_filter.py -x` | Wave 0 |
| SCAN-04 | SfM pipeline produces 3D model | integration (Python) | `pytest services/measurement/tests/test_pipeline.py -x` | Wave 0 |
| SCAN-05 | Left/right foot stored separately | unit | `npx vitest run src/lib/scan/__tests__/types.test.ts -t "foot side"` | Wave 0 |
| SCAN-06 | Quality scoring produces score + label | unit (Python) | `pytest services/measurement/tests/test_quality_filter.py -t "score"` | Wave 0 |
| SCAN-07 | 3D model renders in R3F viewer | integration | `npx vitest run src/components/scan/__tests__/foot-model-3d.test.tsx` | Wave 0 |
| SCAN-08 | Walking video capture triggers gait analysis | integration | Manual -- requires camera |
| SCAN-09 | Gait analysis produces pattern + alignment + flexibility | unit (Python) | `pytest services/measurement/tests/test_gait.py -x` | Wave 0 |
| SCAN-10 | Pressure heatmap generated from inputs | unit (Python) | `pytest services/measurement/tests/test_pressure.py -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run` (frontend tests)
- **Per wave merge:** `npx vitest run && cd services/measurement && pytest`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `services/measurement/` directory -- entire Python backend structure
- [ ] `services/measurement/requirements.txt` -- Python dependencies
- [ ] `services/measurement/tests/` -- Python test directory and conftest.py
- [ ] `src/components/scan/__tests__/` -- Frontend scan component tests
- [ ] `src/lib/scan/__tests__/` -- Scan utility tests
- [ ] pytest configuration (pytest.ini or pyproject.toml)
- [ ] Test fixtures: sample video frames, sample COLMAP output, sample GLB model

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Auth.js session check before scan access (existing) |
| V3 Session Management | Yes | Existing session management from Phase 1 |
| V4 Access Control | Yes | Users can only access their own scans. Scan results scoped by userId. |
| V5 Input Validation | Yes | Zod validation for scan metadata, file type/size validation for video uploads |
| V6 Cryptography | No | No crypto operations in this phase |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious file upload (non-video files disguised as video) | Tampering | Validate MIME type and file extension. Scan with ffprobe/cv2 before processing. |
| Path traversal in scan ID | Tampering | UUID-only scan IDs, parameterized queries via Drizzle |
| Denial of Service via large uploads | Denial of Service | File size limit (500MB max), rate limiting on upload endpoint |
| IDOR on scan results | Information Disclosure | Always filter by authenticated userId in DB queries |
| Server-side command injection via filename | Tampering | Sanitize filenames, use UUID-based storage keys, never pass user input to shell |

## Sources

### Primary (HIGH confidence)
- [pycolmap PyPI](https://pypi.org/project/pycolmap/) -- pip installable, Python >=3.10, latest Apr 2026
- [COLMAP Documentation](https://colmap.github.io/) -- SfM pipeline, Python API, sequential matching
- [MediaPipe Pose Landmarker Web JS](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js) -- 33 landmarks, Tasks API
- [React Three Fiber docs](https://r3f.docs.pmnd.rs/tutorials/loading-models) -- GLB loading, OrbitControls
- [tus-js-client GitHub](https://github.com/tus/tus-js-client) -- Resumable upload protocol
- [ScienceDirect 2025 SfM foot measurement](https://www.sciencedirect.com/science/article/abs/pii/S0141938225003531) -- +-0.15mm accuracy validation
- npm registry versions verified: @react-three/fiber 9.5.0, @react-three/drei 10.7.7, three 0.183.2, @mediapipe/tasks-vision 0.10.34, tus-js-client 4.3.1

### Secondary (MEDIUM confidence)
- [COLMAP Python API Reference (DeepWiki)](https://deepwiki.com/colmap/colmap/5.1-python-api-reference) -- pycolmap API patterns
- [OpenCV A4 detection pattern](https://docs.opencv.org/4.x/d5/dae/tutorial_aruco_detection.html) -- Contour detection for reference objects
- [Uppy Next.js integration](https://uppy.io/docs/nextjs/) -- Alternative upload UI
- [NextJS-TUS GitHub example](https://github.com/zacheryvaughn/NextJS-TUS) -- TUS + Next.js pattern

### Tertiary (LOW confidence)
- Pressure estimation model architecture -- no verified pre-trained model found. Rule-based heuristic recommended as v1.
- Open3D Poisson reconstruction for foot meshes -- assumed based on general 3D reconstruction practice, not verified for foot-specific use case.

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM -- pycolmap and R3F versions verified, but end-to-end pipeline untested. Pressure estimation model is LOW confidence.
- Architecture: MEDIUM -- SfM pipeline pattern is well-established in academia but specific FastAPI+COLMAP orchestration is custom work.
- Pitfalls: HIGH -- Camera, upload, and processing pitfalls are well-documented across the ecosystem.

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 days -- mature technologies, slow-moving domain)
