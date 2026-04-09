---
phase: 02-foot-scanning
verified: 2026-04-09T00:00:00Z
status: gaps_found
score: 17/21 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Complete flow works end-to-end: scan -> upload -> process -> results"
    status: failed
    reason: "The Next.js /api/scan/process orchestration route is never called from the frontend. The upload route (/api/scan/upload) calls Python /scan/process directly but does not trigger gait analysis or pressure estimation. After upload, the user is redirected to /scan/processing/[id] which only polls status — it never invokes /api/scan/process."
    artifacts:
      - path: "src/app/api/scan/process/route.ts"
        issue: "Route exists and is correct but is never called from frontend — completely orphaned"
      - path: "src/app/(main)/scan/processing/[id]/page.tsx"
        issue: "Only polls status; never triggers /api/scan/process to complete the pipeline"
    missing:
      - "Frontend must call POST /api/scan/process after upload completes (in scan new page or processing page)"
      - "The gait analysis and pressure estimation orchestration must be triggered from the client flow"

  - truth: "Video uploads via tus-js-client with progress indicator"
    status: partial
    reason: "The gait video from step 3 is uploaded via the same uploadScanVideo() utility to /api/scan/upload, which forwards to Python /scan/process (SfM endpoint). The gait video is never sent to Python /gait/analyze. Both foot scan and walking videos are treated identically by the upload route."
    artifacts:
      - path: "src/lib/scan/upload.ts"
        issue: "Single upload endpoint /api/scan/upload used for both foot and gait video — no distinction"
      - path: "src/app/api/scan/upload/route.ts"
        issue: "Always forwards video to /scan/process (SfM), never to /gait/analyze"
      - path: "src/app/(main)/scan/new/page.tsx"
        issue: "Step 3 walking video calls same uploadScanVideo() as foot video, no separate gait upload path"
    missing:
      - "Separate upload path or metadata field to distinguish gait video from foot scan video"
      - "Walking video must reach Python /gait/analyze endpoint with the video file as UploadFile"

  - truth: "Processing trigger API calls Python backend scan/gait/pressure endpoints"
    status: failed
    reason: "Two wiring failures: (1) /api/scan/process calls Python /gait/analyze with JSON body { scanId } but the Python endpoint requires UploadFile (video file) + scanId as form fields — this would return a 422 validation error at runtime. (2) /api/scan/process calls /pressure/estimate without required fields weight, gender, and age — Python Pydantic model requires all three (weight: float required, gender: str required, age: float required) and the Next.js call only sends scanId, footLength, ballWidth, archHeight."
    artifacts:
      - path: "src/app/api/scan/process/route.ts"
        issue: "Calls /gait/analyze with JSON { scanId } but Python endpoint requires multipart UploadFile + scanId"
      - path: "src/app/api/scan/process/route.ts"
        issue: "Calls /pressure/estimate without weight, gender, age (required by Pydantic model)"
      - path: "services/measurement/app/api/gait.py"
        issue: "Endpoint requires UploadFile as form parameter, incompatible with JSON body call"
      - path: "services/measurement/app/api/pressure.py"
        issue: "weight, gender, age are required fields; missing from Next.js call"
    missing:
      - "Gait call must forward video as multipart form data to Python /gait/analyze"
      - "Pressure call must include weight, gender, age (requires user profile data or scan-time input)"
      - "User weight/gender/age fields need a collection mechanism (profile form or scan flow step)"
deferred: []
human_verification:
  - test: "Scan flow mobile rendering and camera access"
    expected: "Camera viewfinder opens fullscreen, A4 guide visible, 72px recording button renders, circular guide animates, 3-second countdown appears"
    why_human: "Browser camera API (getUserMedia) requires real device/browser, cannot verify programmatically"
  - test: "3D foot model renders in results page"
    expected: "React Three Fiber Canvas renders with OrbitControls allowing rotate/zoom; pressure heatmap overlay toggles correctly"
    why_human: "WebGL rendering requires browser, useGLTF loads from URL that requires real model file"
  - test: "Python backend COLMAP SfM accuracy"
    expected: "Reconstructed foot measurements achieve ±0.15mm accuracy target (SCAN-04)"
    why_human: "Accuracy claims require running actual reconstruction with calibrated input — cannot verify from code alone"
  - test: "MediaPipe Pose model file availability"
    expected: "pose_landmarker_full.task model file exists in services/measurement/models/ directory"
    why_human: "SUMMARY noted this must be downloaded manually before running — cannot verify file presence without running the container"
---

# Phase 2: Foot Scanning Verification Report

**Phase Goal:** Users can measure their feet using smartphone video SfM scanning (±0.15mm accuracy) with AI gait analysis, view 3D foot model with pressure heatmap, and results are saved to their profile
**Verified:** 2026-04-09
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Scan workflow types define all 9 measurement items and scan states | ✓ VERIFIED | types.ts exports FootMeasurement (6 fields), GaitAnalysisResult (3 fields), 9-state ScanStatus enum |
| 2 | Zustand store manages scan flow state machine | ✓ VERIFIED | store.ts exports useScanStore with all 9 states, actions, and localStorage persist for isOnboarded |
| 3 | Database schema stores left/right foot scans independently with all measurement fields | ✓ VERIFIED | schema.ts: footScans, footMeasurements, gaitAnalysis, pressureDistribution with FK cascade |
| 4 | API routes exist for creating scans, checking status, and fetching results | ✓ VERIFIED | create, status/[id], results/[id] routes all exist with auth + IDOR prevention |
| 5 | Python FastAPI server starts and accepts POST /scan/process requests | ✓ VERIFIED | app/main.py with FastAPI, scan.py with /scan/process endpoint, Dockerfile present |
| 6 | COLMAP SfM reconstructs 3D point cloud from extracted frames | ✓ VERIFIED | sfm_reconstructor.py uses pycolmap SIFT + sequential matching + incremental_mapping |
| 7 | A4 paper is detected with pixel-to-mm scale calculation | ✓ VERIFIED | a4_detector.py: 297x210mm A4, Canny+contour detection, pixels_per_mm computed |
| 8 | Point cloud converted to mesh and exported as GLB | ✓ VERIFIED | mesh_generator.py (Open3D Poisson), model_exporter.py (trimesh GLB) |
| 9 | Foot measurements (6 items) extracted from 3D mesh | ✓ VERIFIED | measurement_extractor.py extracts foot_length, ball_width, instep_height, arch_height, heel_width, toe_length |
| 10 | Quality scoring produces 0-100 score with good/fair/poor label | ✓ VERIFIED | quality_filter.py: Laplacian blur + luminance, thresholds >= 70 = good, >= 40 = fair, < 40 = poor |
| 11 | Camera viewfinder opens fullscreen with back camera | ✓ VERIFIED | camera-viewfinder.tsx uses initCamera() with facingMode:environment, 1920x1080 constraints |
| 12 | Recording button starts/stops video recording with countdown | ✓ VERIFIED | recording-button.tsx 72px with pulse; scan/new/page.tsx has 3-second countdown |
| 13 | Scan flow page shows 4-step stepper with camera viewfinder | ✓ VERIFIED | scan-stepper.tsx: 발 위치/영상 촬영/보행 촬영/결과, wired in new/page.tsx |
| 14 | MediaPipe Pose detects landmarks and classifies gait | ✓ VERIFIED | pose_detector.py PoseLandmarker, gait_classifier.py classify_gait with overpronation/supination |
| 15 | Pressure heatmap generated and displayed | ✓ VERIFIED | estimator.py + heatmap_generator.py produce grid; pressure-heatmap.tsx renders 6-color gradient |
| 16 | 3D foot model loads with OrbitControls and pressure heatmap overlay | ✓ VERIFIED | foot-model-3d.tsx: R3F Canvas, useGLTF, OrbitControls; PressureHeatmap toggleable |
| 17 | Results page shows measurements, gait, and heatmap with CTA | ✓ VERIFIED | results/[id]/page.tsx: all 6 Korean labels, 보행 분석, 발목 정렬, 아치 유연성, CTA 이 데이터로 맞춤 신발을 추천받으시겠습니까? |
| 18 | Video uploads via tus-js-client with progress | ✗ PARTIAL | TUS upload works for foot video; gait video never reaches /gait/analyze (same endpoint, SfM-only) |
| 19 | Processing trigger API calls Python backend scan/gait/pressure endpoints | ✗ FAILED | /api/scan/process never called from frontend; gait call uses JSON (Python needs UploadFile); pressure call missing weight/gender/age |
| 20 | Profile page foot profile tab shows saved scan results | ✓ VERIFIED | foot-profile-tab.tsx fetches /api/scan/history, shows quality badge/measurements/links |
| 21 | Complete flow works end-to-end: scan -> upload -> process -> results | ✗ FAILED | Orchestration route orphaned; gait and pressure steps never execute in production flow |

**Score:** 17/21 truths verified (3 failed, 1 partial)

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/lib/scan/types.ts` | ✓ VERIFIED | All types: ScanStatus (9 states), FootMeasurement (6 fields), GaitAnalysisResult, PressureData, ScanSession |
| `src/lib/scan/store.ts` | ✓ VERIFIED | useScanStore with all actions and localStorage persist |
| `src/lib/db/schema.ts` | ✓ VERIFIED | 4 scan tables with FK cascade |
| `src/app/api/scan/create/route.ts` | ✓ VERIFIED | POST with Zod validation, auth, 201 response |
| `src/app/api/scan/status/[id]/route.ts` | ✓ VERIFIED | GET with userId filter IDOR prevention |
| `src/app/api/scan/results/[id]/route.ts` | ✓ VERIFIED | GET with parallel queries for measurements/gait/pressure |
| `services/measurement/app/main.py` | ✓ VERIFIED | FastAPI with scan, gait, pressure routers |
| `services/measurement/app/pipeline/sfm_reconstructor.py` | ✓ VERIFIED | pycolmap SIFT + sequential matching + incremental_mapping |
| `services/measurement/app/pipeline/a4_detector.py` | ✓ VERIFIED | 297x210mm A4, pixels_per_mm calibration |
| `services/measurement/app/pipeline/measurement_extractor.py` | ✓ VERIFIED | 6 measurements in mm |
| `services/measurement/Dockerfile` | ✓ VERIFIED | python:3.12-slim base |
| `services/measurement/app/gait/pose_detector.py` | ✓ VERIFIED | PoseLandmarker, 33 landmarks |
| `services/measurement/app/gait/gait_classifier.py` | ✓ VERIFIED | classify_gait: normal/overpronation/supination |
| `services/measurement/app/pressure/estimator.py` | ✓ VERIFIED | estimate_pressure with arch type + biometric adjustments |
| `services/measurement/app/pressure/heatmap_generator.py` | ✓ VERIFIED | generate_heatmap with Korean zone labels |
| `src/lib/scan/camera.ts` | ✓ VERIFIED | initCamera(), checkFrameQuality(), stopCamera() |
| `src/components/scan/camera-viewfinder.tsx` | ✓ VERIFIED | getUserMedia, fullscreen, Korean aria-label |
| `src/components/scan/recording-button.tsx` | ✓ VERIFIED | 72px, pulse animation, vibrate haptic |
| `src/components/scan/scan-stepper.tsx` | ✓ VERIFIED | Korean labels, progressbar role |
| `src/components/scan/foot-model-3d.tsx` | ✓ VERIFIED | R3F Canvas, useGLTF, OrbitControls, Skeleton fallback |
| `src/components/scan/pressure-heatmap.tsx` | ✓ VERIFIED | 6-color gradient #3B82F6 to #EF4444 |
| `src/app/(main)/scan/page.tsx` | ✓ VERIFIED | isOnboarded check, ScanOnboarding, EmptyState, 발 측정 시작하기 |
| `src/app/(main)/scan/new/page.tsx` | ✓ VERIFIED | All 4 steps, MediaRecorder, all scan components wired, Zustand store |
| `src/app/(main)/scan/processing/[id]/page.tsx` | ✓ VERIFIED | useQuery polling 5s, ProcessingAnimation, redirect on complete |
| `src/app/(main)/scan/results/[id]/page.tsx` | ✓ VERIFIED | FootModel3D, 6 Korean labels, gait section, asymmetry detection, CTA |
| `src/lib/scan/upload.ts` | ⚠️ PARTIAL | TUS upload works; endpoint /api/scan/upload only handles SfM (not gait) |
| `src/app/api/scan/upload/route.ts` | ⚠️ PARTIAL | Auth, IDOR, MIME validation present; always forwards to /scan/process not /gait/analyze |
| `src/app/api/scan/process/route.ts` | ✗ ORPHANED | Correct orchestration logic but never called from frontend; gait call API mismatch; pressure missing required fields |
| `src/components/profile/foot-profile-tab.tsx` | ✓ VERIFIED | Fetches /api/scan/history, shows quality badge, foot side, measurements, links to results |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| store.ts | types.ts | imports ScanStatus, FootSide | ✓ WIRED | Verified via imports |
| results/[id]/route.ts | schema.ts | queries footScans + joins | ✓ WIRED | Promise.all with footMeasurements, gaitAnalysis, pressureDistribution |
| api/scan/scan.py | sfm_reconstructor.py | imports run_sfm_pipeline | ✓ WIRED | Line 18: from app.pipeline.sfm_reconstructor import ... |
| sfm_reconstructor.py | a4_detector.py | uses A4 scale factor | ✓ WIRED | Line 12: from app.pipeline.a4_detector import calibrate_from_frames |
| api/gait.py | pose_detector.py | imports detect_landmarks | ✓ WIRED | Line 17: from app.gait.pose_detector import detect_landmarks |
| api/pressure.py | estimator.py | imports estimate_pressure | ✓ WIRED | Line 11: from app.pressure.estimator import estimate_pressure |
| scan/new/page.tsx | store.ts | reads/updates state machine | ✓ WIRED | useScanStore() used throughout |
| scan/new/page.tsx | upload.ts | calls uploadScanVideo | ✓ WIRED | Line 155 in handleRecordingComplete |
| processing/[id]/page.tsx | api/scan/status/[id] | polls status 5s | ✓ WIRED | refetchInterval: 5000 with fetch to /api/scan/status/${scanId} |
| results/[id]/page.tsx | api/scan/results/[id] | fetches full results | ✓ WIRED | fetch(`/api/scan/results/${params.id}`) line 74 |
| scan/upload/route.ts | Python /scan/process | proxies video | ✓ WIRED | Line 84: `${MEASUREMENT_SERVICE_URL}/scan/process` |
| **scan/new/page.tsx** | **api/scan/process/route.ts** | **trigger orchestration** | **✗ NOT_WIRED** | **/api/scan/process is never called from frontend** |
| **api/scan/process/route.ts** | **Python /gait/analyze** | **send gait video** | **✗ BROKEN** | **Sends JSON { scanId }; Python requires UploadFile form data** |
| **api/scan/process/route.ts** | **Python /pressure/estimate** | **send biometric inputs** | **✗ BROKEN** | **Missing required fields: weight, gender, age** |
| foot-profile-tab.tsx | api/scan/history | fetches scan history | ✓ WIRED | fetch("/api/scan/history") in useEffect |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| results/[id]/page.tsx | scanResults (measurements, gait, pressure) | GET /api/scan/results/[id] -> DB joins | Real DB queries if data written | ⚠️ HOLLOW — data never reaches DB (gait/pressure pipeline not triggered) |
| foot-profile-tab.tsx | scans[] | GET /api/scan/history -> DB query | Real DB queries | ✓ FLOWING (for completed scans — conditional on gap closure) |
| processing/[id]/page.tsx | status/processingStage | GET /api/scan/status/[id] -> DB | Real DB query | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Python scan.py parses | `python3 -c "import ast; ast.parse(open('...').read())"` | All pipeline modules valid Python | ✓ PASS |
| TypeScript types export ScanStatus | grep ScanStatus src/lib/scan/types.ts | Found at line 5 | ✓ PASS |
| TUS upload utility | grep "tus\|chunkSize\|retryDelays" upload.ts | All present | ✓ PASS |
| A4 dimensions 297mm | grep "297\|A4" a4_detector.py | Lines 16-17: A4_HEIGHT_MM = 297.0 | ✓ PASS |
| /api/scan/process called from frontend | grep -rn "api/scan/process" src/ | Zero matches in frontend code | ✗ FAIL — orphaned |
| gait/analyze accepts JSON body | Python gait.py endpoint signature | Requires UploadFile form param | ✗ FAIL — API mismatch |
| pressure/estimate receives weight/gender/age | grep in process/route.ts | Only scanId + foot dimensions sent | ✗ FAIL — missing required fields |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SCAN-01 | 02-01, 02-03, 02-05, 02-07 | User can launch guided foot scanning flow | ✓ SATISFIED | /scan page, scan/new page, 4-step flow implemented |
| SCAN-02 | 02-02 | User places foot on A4 paper for calibration | ✓ SATISFIED | a4_detector.py with 297x210mm calibration, A4PaperGuide component |
| SCAN-03 | 02-03, 02-05 | Real-time guidance on lighting, angle, positioning | ✓ SATISFIED | guidance-overlay.tsx, checkFrameQuality() brightness check, GuidanceOverlay in scan flow |
| SCAN-04 | 02-02 | Video capture, 3D SfM reconstruction ±0.15mm | ✓ SATISFIED (code) / ? HUMAN (accuracy) | COLMAP SfM pipeline implemented; accuracy needs physical testing |
| SCAN-05 | 02-01, 02-06 | Left/right foot asymmetry detection and storage | ✓ SATISFIED | footSideEnum in schema, FootSideSelector, asymmetry detection in results page (3mm threshold) |
| SCAN-06 | 02-02, 02-03, 02-05 | Scan quality scoring and rescan prompt | ✓ SATISFIED | quality_filter.py, quality-badge.tsx, rescan-prompt.tsx |
| SCAN-07 | 02-06 | View 3D model with measurement overlay and heatmap | ✓ SATISFIED (code) / ? HUMAN (rendering) | foot-model-3d.tsx, measurement-overlay.tsx, pressure-heatmap.tsx |
| SCAN-08 | 02-04, 02-07 | Record walking video for gait analysis | ✗ BLOCKED | Step 3 records walking video but upload never reaches /gait/analyze; gait orchestration not triggered |
| SCAN-09 | 02-04, 02-07 | Analyze gait pattern, ankle alignment, arch flexibility | ✗ BLOCKED | Python pipeline exists but never invoked from end-to-end flow (API wiring broken) |
| SCAN-10 | 02-04, 02-06, 02-07 | AI pressure distribution heatmap | ✗ BLOCKED | Python pipeline exists; Next.js call missing required weight/gender/age fields; orchestration not triggered |

**Traceability note:** SCAN-08, SCAN-09, SCAN-10 are marked as checked in REQUIREMENTS.md but are absent from the Phase 2 traceability table (table ends at SCAN-07). This is a documentation gap — the requirements themselves were intended for Phase 2 and implemented (partially) in Plan 04 and Plan 07.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `services/measurement/app/api/scan.py:162` | `model_url = f"/models/{scanId}_{footSide}.glb"` — local file path, not accessible URL | ⚠️ Warning | 3D viewer will fail to load model in browser (path not served by any route) |
| `services/measurement/app/api/scan.py:120,133,146` | `"modelUrl": None` in error branches | ℹ️ Info | Expected fallback; results page defaults to '/models/foot-default.glb' |
| `src/app/api/scan/process/route.ts` | Route is never invoked from client code | 🛑 Blocker | Gait analysis and pressure estimation never execute in production |

---

### Human Verification Required

#### 1. Camera and Scan Flow on Mobile

**Test:** Open http://localhost:3000/scan on a smartphone (or Chrome DevTools mobile emulation with camera access). Tap through onboarding, tap "발 측정 시작하기", and verify the camera viewfinder opens fullscreen with back camera.
**Expected:** Fullscreen camera view, A4 paper guide rectangle visible, 72px blue recording button at bottom center, Korean guidance overlay.
**Why human:** getUserMedia requires actual browser + device camera permission.

#### 2. 3D Foot Model Rendering

**Test:** Navigate to /scan/results/[any-id] with valid scan data. Verify the 3D viewer renders and OrbitControls allow rotation.
**Expected:** R3F Canvas renders foot model; drag rotates; pinch zooms; pressure heatmap toggle switches overlay.
**Why human:** WebGL rendering requires browser; useGLTF needs real GLB model URL.

#### 3. COLMAP SfM Accuracy Validation

**Test:** Run the measurement service with a test foot video and A4 paper, compare extracted measurements against physical ground truth.
**Expected:** foot_length, ball_width, instep_height within ±0.15mm of physical measurement.
**Why human:** Accuracy claims cannot be verified from code alone; require physical testing with calibrated reference objects.

#### 4. MediaPipe Model File

**Test:** Check that `services/measurement/models/pose_landmarker_full.task` exists before starting the Docker container.
**Expected:** File present; gait analysis succeeds when called with a walking video.
**Why human:** 02-04-SUMMARY noted the .task model must be manually downloaded; file presence cannot be verified from code review alone.

---

### Gaps Summary

Three root causes underlie the four gap truths:

**Root Cause A — Orphaned orchestration route (gaps 3 & 4):**
`/api/scan/process` is the only Next.js route that orchestrates all three backend calls (SfM + gait + pressure). It is correctly implemented but is never called from the frontend. After upload completes, `scan/new/page.tsx` navigates to `/scan/processing/[id]`, which only polls status. Since no code ever triggers `/api/scan/process`, the gait and pressure analysis stages never run.

**Root Cause B — API contract mismatch for gait (gap 3):**
Even if `/api/scan/process` were called, the gait call would fail: Python `/gait/analyze` requires `UploadFile` (video file via multipart form), but `process/route.ts` sends `Content-Type: application/json` with only `{ scanId }`. FastAPI would return 422 Unprocessable Entity.

**Root Cause C — Missing biometric inputs for pressure (gap 3):**
Python `/pressure/estimate` requires `weight`, `gender`, and `age` as Pydantic required fields. The Next.js call omits all three — only `scanId`, `footLength`, `ballWidth`, `archHeight` are sent. FastAPI would return 422 Unprocessable Entity. There is also no mechanism in the current scan flow to collect weight/gender/age from the user.

**What works:** The SfM pipeline (foot video -> COLMAP -> measurements -> GLB), the scan UI (all components, 4-step flow, TUS upload), the scan status polling, and the results page rendering are all correctly implemented and wired. The gaps are in the backend integration layer (Plan 07).

---

_Verified: 2026-04-09_
_Verifier: Claude (gsd-verifier)_
