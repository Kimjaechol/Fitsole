# Phase 2: Foot Scanning - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning
**Source:** User-provided research report (비대면 발 측정 기술 종합 보고서 v1.0)

<domain>
## Phase Boundary

Smartphone video-based foot 3D scanning with SfM reconstruction (±0.15mm accuracy), AI gait analysis from walking video, pressure distribution estimation, and 3D foot model visualization with measurement overlay. Covers both static measurement (video SfM) and dynamic measurement (gait analysis). Results saved to user profile.

</domain>

<decisions>
## Implementation Decisions

### Scanning Method
- **D-01:** Video SfM scanning, NOT photo-based — user records 15-20s video circling foot on A4 paper. SfM algorithm reconstructs 3D point cloud from frames. 6x more accurate than 3-photo method (±0.15mm vs ±0.95mm)
- **D-02:** A4 paper calibration — pixel-to-mm conversion from A4 dimensions (297mm × 210mm). Initial frames detect A4, scale applied to 3D model
- **D-03:** Server-side SfM processing — COLMAP or OpenSfM on Python FastAPI backend with GPU. Client captures video, uploads to server for 3D reconstruction (3-5 min processing)
- **D-04:** SIFT feature point extraction from video frames for dense 3D point cloud generation

### Gait Analysis (Dynamic Measurement)
- **D-05:** Walking video capture — user places phone on floor, walks 5-10 steps. 3-second timer before auto-start
- **D-06:** MediaPipe Pose for 33-point 3D body landmark detection from RGB walking video
- **D-07:** AI analyzes: gait pattern, ankle alignment (pronation/supination), arch flexibility (static vs dynamic comparison), weight-bearing foot deformation
- **D-08:** Weight-bearing deformation data: forefoot expands 9.7-10.4%, midfoot height decreases 15.1-18.2%, plantar contact area increases 11.4-23%

### Pressure Distribution
- **D-09:** AI-estimated pressure heatmap (no physical sensors for online users) — inputs: weight, foot size, arch height, gender, age. ML model predicts pressure distribution patterns. 70-80% accuracy vs physical sensors
- **D-10:** Pressure heatmap displayed on foot sole visualization with high-pressure zone warnings

### Measurement Items (9 total)
- **D-11:** Static SfM: foot length, ball width, instep height, arch height, heel width, toe length
- **D-12:** Dynamic AI: gait pattern classification, ankle alignment (pronation/supination), arch flexibility index
- **D-13:** AI-estimated: plantar pressure distribution heatmap

### Scan UX Flow
- **D-14:** Entry via bottom tab "측정" tab → onboarding guide (first time only)
- **D-15:** Step 1: A4 paper placement + foot positioning with AR overlay guide
- **D-16:** Step 2: Circular motion video recording (15-20s) with circular trajectory guide on screen + real-time frame quality check (blur/lighting warnings)
- **D-17:** Step 3: Walking video (5-10 steps) with floor-level camera placement guide + AI real-time landmark detection feedback
- **D-18:** Step 4: Processing screen ("처리 중...") → 3D model rendering → results display
- **D-19:** Quality scoring: automatic per-frame quality assessment, reject blurry/poorly lit frames, prompt re-scan with specific guidance ("조명을 밝게 해주세요", "더 천천히 돌아주세요")
- **D-20:** Left/right foot scanned independently — flow repeats for second foot

### Results Display
- **D-21:** Interactive 3D foot model (rotate/zoom) rendered with Three.js/React Three Fiber
- **D-22:** Measurement values displayed alongside 3D model (길이, 볼, 발등, 아치, etc.)
- **D-23:** Plantar pressure heatmap visualization (color-coded heat zones)
- **D-24:** CTA at bottom: "이 데이터로 맞춤 신발을 추천받으시겠습니까?"

### Claude's Discretion
- Specific COLMAP vs OpenSfM choice (both acceptable per report)
- Video upload chunking strategy and progress UI
- Exact frame selection algorithm from video
- 3D model file format (PLY, OBJ, or glTF)
- Specific MediaPipe model version and configuration

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, updated with video SfM and smart insole kit decisions
- `.planning/REQUIREMENTS.md` — SCAN-01~10 requirements for this phase
- `.planning/research/STACK.md` — Python FastAPI for backend processing, Three.js for 3D visualization
- `.planning/research/ARCHITECTURE.md` — Client-side lightweight ML + server-side heavy CV/ML split

### Research Report (User-Provided)
- User's research report embedded in this CONTEXT.md decisions — covers SfM technology, A4 calibration, AI gait analysis, pressure estimation, smart insole kit, competitive benchmarks
- Key papers: "Efficient 3D foot measurement from smartphone sequences" (ScienceDirect 2025), FOUND (WACV 2024), FootNet
- Key tools: COLMAP, OpenSfM, MediaPipe Pose, OpenCV

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/layout/bottom-tab-bar.tsx` — "측정" tab entry point (Phase 1)
- `src/app/(main)/scan/page.tsx` — Placeholder scan page (Phase 1)
- `src/lib/db/schema.ts` — Drizzle schema, will need footScans/footMeasurements tables
- `src/lib/auth.ts` — Auth for protecting scan results (session-based)
- `src/components/empty-state.tsx` — Reusable empty state component

### Established Patterns
- shadcn/ui components with Tailwind CSS 4.x
- Pretendard font, blue-600/emerald-600 accent colors
- Server components with auth() check for protected pages
- Korean-language UI throughout

### Integration Points
- Scan results must save to user profile (footProfiles in DB)
- Profile page foot-profile-tab must show scan results instead of empty state after scanning
- Future Phase 3 (Insole Design) consumes scan measurement data

</code_context>

<specifics>
## Specific Ideas

- Video SfM provides 6x accuracy improvement over 3-photo method per user's research report
- Processing time 3-5 minutes is acceptable — show engaging "처리 중" animation with progress
- Walking video analysis is a separate step after static scan — not combined
- Pressure heatmap is AI-estimated (not sensor-based) for online users
- Smart insole kit is NOT part of this phase — it's for Phase 6 (offline store)
- 3D foot model should be interactive (rotate/zoom) using Three.js or React Three Fiber

</specifics>

<deferred>
## Deferred Ideas

- Smart insole kit hardware integration — Phase 6 (offline store + athlete segment)
- AR shoe try-on overlay — future consideration
- Real-time on-device SfM processing (currently server-side) — future optimization
- LiDAR-specific path for iPhone Pro users — future enhancement

</deferred>

---

*Phase: 02-foot-scanning*
*Context gathered: 2026-04-09*
