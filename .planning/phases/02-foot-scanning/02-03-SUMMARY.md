---
phase: 02-foot-scanning
plan: 03
subsystem: ui
tags: [camera, getUserMedia, scan-components, korean-l10n, accessibility, shadcn]

# Dependency graph
requires:
  - phase: 02-01
    provides: "Scan types (ScanStatus, FootSide, QualityWarning) and Zustand store (useScanStore)"
provides:
  - "11 scan UI components for camera viewfinder, recording, guidance, onboarding, quality feedback"
  - "Camera utility library (initCamera, checkFrameQuality, stopCamera)"
  - "6 new shadcn/ui components (progress, dialog, alert, badge, toggle, skeleton)"
affects: [02-05-scan-flow-pages, 02-06-processing, 02-07-results]

# Tech tracking
tech-stack:
  added: ["@radix-ui/react-dialog", "@radix-ui/react-progress", "@radix-ui/react-toggle"]
  patterns: ["Fullscreen camera viewfinder with stream cleanup on unmount", "Korean-only copywriting contract", "CSS keyframe animation for recording pulse"]

key-files:
  created:
    - src/lib/scan/camera.ts
    - src/components/scan/scan-stepper.tsx
    - src/components/scan/camera-viewfinder.tsx
    - src/components/scan/recording-button.tsx
    - src/components/scan/guidance-overlay.tsx
    - src/components/scan/circular-guide.tsx
    - src/components/scan/a4-paper-guide.tsx
    - src/components/scan/walking-guide.tsx
    - src/components/scan/quality-badge.tsx
    - src/components/scan/rescan-prompt.tsx
    - src/components/scan/scan-onboarding.tsx
    - src/components/scan/foot-side-selector.tsx
  modified:
    - src/app/globals.css

key-decisions:
  - "Recording pulse animation defined in globals.css rather than styled-jsx for Tailwind v4 compatibility"
  - "Client-side quality check limited to brightness only; blur detection deferred to server-side OpenCV Laplacian"

patterns-established:
  - "Scan components use 'use client' directive and follow Korean copywriting contract from UI-SPEC"
  - "Camera stream cleanup on unmount via stopCamera() for T-02-07 mitigation"

requirements-completed: [SCAN-01, SCAN-03]

# Metrics
duration: 4min
completed: 2026-04-09
---

# Phase 02 Plan 03: Scan UI Components Summary

**11 scan UI components with fullscreen camera viewfinder (1080p/30fps), 72px recording button with pulse, circular/A4 guides, Korean onboarding carousel, and quality feedback badges**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-09T16:08:36Z
- **Completed:** 2026-04-09T16:12:48Z
- **Tasks:** 2
- **Files modified:** 19

## Accomplishments
- Camera utility with 1080p/30fps constraints, brightness quality check, and stream cleanup
- 7 core scan components: stepper, viewfinder, recording button, guidance overlay, circular guide, A4 paper guide
- 5 supporting components: walking guide, quality badge, rescan prompt, onboarding carousel, foot side selector
- All Korean copy matches UI-SPEC copywriting contract exactly
- Accessibility attributes on all interactive elements (progressbar, aria-live, aria-label)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install shadcn components and create camera utility + core scan components** - `a33f8da` (feat)
2. **Task 2: Walking guide, quality badge, rescan prompt, onboarding, and foot selector** - `7e2266e` (feat)

## Files Created/Modified
- `src/lib/scan/camera.ts` - Camera init (1080p/30fps), frame quality check, stream stop
- `src/components/scan/scan-stepper.tsx` - 4-step progress with Korean labels and progressbar role
- `src/components/scan/camera-viewfinder.tsx` - Fullscreen camera with error handling and dark overlay
- `src/components/scan/recording-button.tsx` - 72px button with pulse animation and haptic feedback
- `src/components/scan/guidance-overlay.tsx` - Semi-transparent text overlay for real-time warnings
- `src/components/scan/circular-guide.tsx` - 280px SVG circle with progress arc and animated dot
- `src/components/scan/a4-paper-guide.tsx` - A4 rectangle overlay (297:210) with detection colors
- `src/components/scan/walking-guide.tsx` - Floor-level instruction with step counter
- `src/components/scan/quality-badge.tsx` - 36px pill badge with good/fair/poor color states
- `src/components/scan/rescan-prompt.tsx` - Destructive alert with Korean guidance and rescan CTA
- `src/components/scan/scan-onboarding.tsx` - 3-step carousel with markOnboarded persistence
- `src/components/scan/foot-side-selector.tsx` - Left/right foot SVG icons with checkmark
- `src/app/globals.css` - Added recording-pulse keyframe animation
- `src/components/ui/progress.tsx` - shadcn progress component
- `src/components/ui/dialog.tsx` - shadcn dialog component
- `src/components/ui/alert.tsx` - shadcn alert component
- `src/components/ui/badge.tsx` - shadcn badge component
- `src/components/ui/toggle.tsx` - shadcn toggle component
- `src/components/ui/skeleton.tsx` - shadcn skeleton component

## Decisions Made
- Recording pulse animation defined in globals.css rather than styled-jsx for Tailwind v4 compatibility
- Client-side quality check limited to brightness only; blur detection deferred to server-side OpenCV Laplacian per RESEARCH

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error in camera-viewfinder onFrame callback**
- **Found during:** Task 1
- **Issue:** Optional `onFrame` prop invoked without null check inside closure, causing TS2722
- **Fix:** Changed `onFrame(canvas)` to `onFrame?.(canvas)` with optional chaining
- **Files modified:** src/components/scan/camera-viewfinder.tsx
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** a33f8da (Task 1 commit)

**2. [Rule 3 - Blocking] Moved recording-pulse animation from styled-jsx to globals.css**
- **Found during:** Task 1
- **Issue:** styled-jsx `<style jsx>` tag would cause TypeScript/build issues in Next.js App Router without explicit styled-jsx setup
- **Fix:** Defined `@keyframes recording-pulse` and `.animate-recording-pulse` in globals.css
- **Files modified:** src/app/globals.css, src/components/scan/recording-button.tsx
- **Verification:** Build passes, animation class referenced correctly
- **Committed in:** a33f8da (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Threat Surface
No new threat surface beyond what is documented in the plan's threat model. Camera stream cleanup (T-02-07) and 1080p constraint (T-02-08) both implemented as specified.

## Next Phase Readiness
- All 11 scan UI components ready for composition into scan flow pages (Plan 05)
- Camera utility library ready for integration with MediaRecorder in Plan 04
- Quality badge and rescan prompt ready for results display in Plan 07

## Self-Check: PASSED

All 18 created files verified present. Both task commits (a33f8da, 7e2266e) verified in git log.

---
*Phase: 02-foot-scanning*
*Completed: 2026-04-09*
