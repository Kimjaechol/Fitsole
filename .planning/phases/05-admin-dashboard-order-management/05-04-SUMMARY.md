---
phase: 05-admin-dashboard-order-management
plan: 04
subsystem: admin
tags: [admin, orders, three-fiber, react-three-fiber, drizzle, resend, factory-dispatch, shadcn]

requires:
  - phase: 05-01
    provides: shared OrderDetail / OrderStatus types in src/lib/types/order.ts
  - phase: 05-02
    provides: requireAdmin() and PATCH /api/admin/orders/[id]/status route
  - phase: 05-03
    provides: admin dashboard shell, orders list, AdminOrderSummary type
  - phase: 02-foot-scanning
    provides: footScans/footMeasurements/pressureDistribution/gaitAnalysis tables, FootModel3D, PressureHeatmap components
  - phase: 03-insole-design-product-catalog
    provides: insoleDesigns table, InsolePreview3D, VARIOSHORE_ZONES + DesignParams types

provides:
  - GET /api/admin/orders/[id] enriched detail (customer, items, designs, scans)
  - POST /api/admin/orders/[id]/dispatch (factory dispatch with state guard)
  - /admin/dashboard/orders/[id] full order detail page (tabs: 주문 정보 / 스캔 데이터 / 인솔 설계)
  - ScanDataViewer reusing FootModel3D + PressureHeatmap
  - DesignSpecViewer reusing InsolePreview3D with TPU temperature map + STL download
  - StatusControls with workflow-aware buttons + dispatch dialog + tracking inputs
  - sendFactoryDispatchEmail with Korean 제작 의뢰서 (per-item params, hardness, STL links)

affects: [05-05, phase-06]

tech-stack:
  added: []
  patterns:
    - "Admin server components query Drizzle directly; mirror /api/admin endpoints for external callers (Phase 05-03 convention)"
    - "Composite client viewers reuse scan/insole 3D primitives with `'use client'` instead of next/dynamic ssr:false"
    - "PressureHeatmap rendered as children of FootModel3D so both share the same R3F Canvas"
    - "Status workflow encoded as kind-discriminated Action union (status | ship | dispatch) with one Dialog driving all confirmations"

key-files:
  created:
    - "src/app/api/admin/orders/[id]/route.ts"
    - "src/app/api/admin/orders/[id]/dispatch/route.ts"
    - "src/app/(admin)/admin/dashboard/orders/[id]/page.tsx"
    - "src/components/admin/scan-data-viewer.tsx"
    - "src/components/admin/design-spec-viewer.tsx"
    - "src/components/admin/order-detail-view.tsx"
    - "src/components/admin/status-controls.tsx"
    - "src/lib/email/factory-dispatch.ts"
  modified: []

key-decisions:
  - "Status controls scaffolded in Task 1 (alongside the page) so the order detail page typechecks; dispatch endpoint + factory email added in Task 2 with the button already wired"
  - "PressureHeatmap rendered as FootModel3D children rather than a separate Canvas — matches existing scan results page usage"
  - "Customer foot scans queried per-userId (not per-order) so admins see the underlying scan data the design was generated from, deduped to one per foot side"
  - "Factory dispatch route awaits the email send so admins get explicit pass/fail feedback (502 with stale-state warning), but customer status email stays fire-and-forget"
  - "Dispatch route updates status BEFORE sending email so a retry from a stale designing state is impossible"
  - "AdminOrderDetail / AdminScanData / AdminDesignData types colocated with the GET route (Phase 05-03 convention) and re-imported by the page"
  - "Native <select> for carrier dropdown — no shadcn Select component in repo yet (Phase 05-03 convention)"
  - "DesignSpecViewer coerces stored designParams JSON into typed DesignParams with safe fallbacks so the 3D preview never crashes on partial data"
  - "FACTORY_EMAIL env var with factory@fitsole.kr default per CONTEXT.md specifics (factory partner not yet identified)"

patterns-established:
  - "AdminOrderDetail type colocation: API route file owns the type, page imports it from the route module"
  - "Confirmation Dialog drives multi-action flows via discriminated union state instead of multiple Dialog components"
  - "DesignParams coercion helper pattern for displaying possibly-partial design JSON in 3D viewers"

requirements-completed: [ADMN-02, ADMN-03, ADMN-04]

duration: 8min
completed: 2026-04-10
---

# Phase 05 Plan 04: Admin Order Detail + Factory Dispatch Summary

**Admin order detail page with embedded 3D foot scan + insole viewers, status workflow controls, and Korean factory dispatch email carrying per-zone TPU specs and STL download links**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-10T10:59:28Z
- **Completed:** 2026-04-10T11:08:01Z
- **Tasks:** 2
- **Files created:** 8

## Accomplishments

- Admins can now open any order at `/admin/dashboard/orders/[id]` and see customer info, items, shipping, and payment in tab 1
- Tab 2 renders the customer's most recent left/right foot scans inside reused `FootModel3D`, with a toggle that overlays `PressureHeatmap` and a Korean-labeled measurement table (D-07)
- Tab 3 renders one `DesignSpecViewer` per insole-bearing item with reused `InsolePreview3D`, parameter table, Varioshore TPU temperature map, line type badge (camera vs SALTED), and STL download button (D-08)
- `StatusControls` exposes workflow-aware transition buttons: `paid → designing`, `designing → manufacturing` (via dispatch), `manufacturing → shipping` (with tracking inputs), `shipping → delivered` — all gated through a single confirmation Dialog with sonner toast feedback (D-06)
- `POST /api/admin/orders/[id]/dispatch` validates the order is in `designing` (T-05-09 tampering mitigation), updates to `manufacturing`, and sends the factory dispatch email with full design specs + STL links plus a fire-and-forget customer status notification (D-09, ADMN-04)
- `sendFactoryDispatchEmail` produces a Korean 제작 의뢰서 with per-item TPU temperature/hardness tables, factory-direct shipping address, and Resend/dev-console-fallback parity with the rest of the email modules

## Task Commits

1. **Task 1: Admin order detail page with scan and design viewers** — `ff33900` (feat)
2. **Task 2: Factory dispatch endpoint with design spec email** — `b05582d` (feat)

## Files Created/Modified

- `src/app/api/admin/orders/[id]/route.ts` — Enriched admin order GET; exports `AdminOrderDetail`, `AdminScanData`, `AdminDesignData`, `AdminOrderItemDetail` types
- `src/app/api/admin/orders/[id]/dispatch/route.ts` — POST dispatch endpoint with status guard and atomic transition
- `src/app/(admin)/admin/dashboard/orders/[id]/page.tsx` — Server component loading order detail directly via Drizzle, renders OrderDetailView + StatusControls
- `src/components/admin/scan-data-viewer.tsx` — Per-foot scan card with 3D model, heatmap toggle, measurement table, gait summary
- `src/components/admin/design-spec-viewer.tsx` — Per-design 3D preview, parameter + TPU tables, STL download
- `src/components/admin/order-detail-view.tsx` — Tabbed view assembling all three sections
- `src/components/admin/status-controls.tsx` — Workflow-aware action buttons, confirmation dialog, tracking number/carrier inputs
- `src/lib/email/factory-dispatch.ts` — Factory dispatch HTML email + Resend/dev fallback

## Decisions Made

See key-decisions in frontmatter.

## Deviations from Plan

**1. [Rule 3 — Blocking] Created status-controls.tsx in Task 1 (was scoped to Task 2)**

- **Found during:** Task 1 (admin order detail page)
- **Issue:** Task 1's page.tsx imports `StatusControls`, but the plan placed `status-controls.tsx` under Task 2's files. With the verify step running `npx tsc --noEmit` per task, Task 1's typecheck would fail with a missing module error.
- **Fix:** Created the full `StatusControls` component in Task 1 wired to the existing `PATCH /api/admin/orders/[id]/status` endpoint and stubbing the dispatch button to call `POST /dispatch`. Task 2 then added the `/dispatch` route + factory email — no further changes to `status-controls.tsx` were needed since the wiring was already present.
- **Files modified:** `src/components/admin/status-controls.tsx`
- **Verification:** `npx tsc --noEmit` exited 0 after Task 1; behavior matches the plan's Task 2 acceptance criteria.
- **Committed in:** `ff33900` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Pure ordering refinement — both tasks shipped exactly the artifacts the plan asked for; only the file boundary between the two task commits shifted by one component.

## Issues Encountered

None.

## User Setup Required

None for this plan. Optional environment variable:

- `FACTORY_EMAIL` — recipient address for factory dispatch emails. Defaults to `factory@fitsole.kr` if unset (factory partner not yet identified per the standing Phase 5 blocker).

## Next Phase Readiness

- Plan 05 (offline store reservations + final phase polish) is now unblocked.
- The factory partner blocker remains: `FACTORY_EMAIL` defaults to a placeholder address. Once a real partner is selected, set the env var — no code change required.
- Three.js bundles only load when admins navigate to a specific order detail page (client component boundary), keeping the orders list page lean.

## Self-Check: PASSED

All 8 created files exist on disk:
- src/app/api/admin/orders/[id]/route.ts
- src/app/api/admin/orders/[id]/dispatch/route.ts
- src/app/(admin)/admin/dashboard/orders/[id]/page.tsx
- src/components/admin/scan-data-viewer.tsx
- src/components/admin/design-spec-viewer.tsx
- src/components/admin/order-detail-view.tsx
- src/components/admin/status-controls.tsx
- src/lib/email/factory-dispatch.ts

Both task commits exist in git history:
- ff33900 (Task 1)
- b05582d (Task 2)

---
*Phase: 05-admin-dashboard-order-management*
*Completed: 2026-04-10*
