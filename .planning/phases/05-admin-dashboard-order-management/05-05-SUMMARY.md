---
phase: 05-admin-dashboard-order-management
plan: 05
subsystem: admin-dashboard
tags: [admin, salted, reservations, kit-inventory, drizzle, korean-ui]
requires:
  - .planning/phases/05-admin-dashboard-order-management/05-02-SUMMARY.md
  - src/lib/admin-auth.ts
  - src/components/insole/before-after-report.tsx
  - src/lib/db/schema.ts
provides:
  - src/app/(admin)/admin/dashboard/salted/page.tsx
  - src/app/(admin)/admin/dashboard/reservations/page.tsx
  - src/components/admin/salted-session-table.tsx
  - src/components/admin/salted-session-detail.tsx
  - src/components/admin/salted-session-detail-panel.tsx
  - src/components/admin/reservation-table.tsx
  - src/components/admin/reservation-form.tsx
  - src/components/admin/kit-inventory-card.tsx
  - src/app/api/admin/salted/route.ts
  - src/app/api/admin/salted/[id]/route.ts
  - src/app/api/admin/reservations/route.ts
  - src/app/api/admin/reservations/[id]/route.ts
  - src/app/api/admin/kit-inventory/[id]/route.ts
affects:
  - src/lib/db/schema.ts
tech-stack:
  added: []
  patterns:
    - "Inline SVG line chart for pressure timeline (avoids pulling recharts as a new dep)"
    - "Safe jsonb coercion with fallbacks — detail viewer never crashes on partial data"
    - "Server component queries Drizzle directly; /api/admin/* mirror filter logic for external callers"
    - "Soft-delete via status=cancelled for reservations"
    - "Inline availableQuantity editor with server-enforced <= totalQuantity invariant"
key-files:
  created:
    - src/app/(admin)/admin/dashboard/salted/page.tsx
    - src/app/(admin)/admin/dashboard/reservations/page.tsx
    - src/components/admin/salted-session-table.tsx
    - src/components/admin/salted-session-detail.tsx
    - src/components/admin/salted-session-detail-panel.tsx
    - src/components/admin/reservation-table.tsx
    - src/components/admin/reservation-form.tsx
    - src/components/admin/kit-inventory-card.tsx
    - src/app/api/admin/salted/route.ts
    - src/app/api/admin/salted/[id]/route.ts
    - src/app/api/admin/reservations/route.ts
    - src/app/api/admin/reservations/[id]/route.ts
    - src/app/api/admin/kit-inventory/[id]/route.ts
  modified:
    - src/lib/db/schema.ts
decisions:
  - "Inline SVG line chart instead of adding recharts dependency — keeps scope tight, avoids bundle bloat for one chart"
  - "Dedicated /api/admin/kit-inventory/[id] PATCH route separate from reservations CRUD — Rule 2 addition to support inline editor"
  - "Soft delete reservations (status -> cancelled) instead of hard delete — preserves audit trail"
  - "Detail panel split into client wrapper (reads searchParams) + server page to stay inside Next.js server/client boundary"
  - "Coerce jsonb analysisResult with safe fallbacks — raw shape unknown at compile time so viewer must not crash on partial data"
  - "Kit inventory seeding left to DB/migration path (row insertion out of scope for this plan) — page renders empty state if no kits"
metrics:
  duration: ~12min
  completed: 2026-04-10
---

# Phase 05 Plan 05: SALTED Viewer and Reservation Management Summary

## One-liner

Admin SALTED session viewer with pressure timeline + biomechanical analysis, and offline store reservation CRUD with kit inventory tracking, completing the Phase 5 admin dashboard per D-10, D-11, ADMN-05, ADMN-06.

## Completed Tasks

| Task | Name                                                   | Commit    | Files                                                                                                                                                                                                                                                                                                                                                           |
| ---- | ------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | SALTED session viewer                                  | `ea314be` | `src/app/api/admin/salted/route.ts`, `src/app/api/admin/salted/[id]/route.ts`, `src/components/admin/salted-session-table.tsx`, `src/components/admin/salted-session-detail.tsx`, `src/components/admin/salted-session-detail-panel.tsx`, `src/app/(admin)/admin/dashboard/salted/page.tsx`                                                                     |
| 2    | Offline store reservation management and kit inventory | `7fed9d2` | `src/lib/db/schema.ts`, `src/app/api/admin/reservations/route.ts`, `src/app/api/admin/reservations/[id]/route.ts`, `src/app/api/admin/kit-inventory/[id]/route.ts`, `src/components/admin/reservation-table.tsx`, `src/components/admin/reservation-form.tsx`, `src/components/admin/kit-inventory-card.tsx`, `src/app/(admin)/admin/dashboard/reservations/page.tsx` |

## What Changed

### SALTED session viewer (Task 1)

- **`GET /api/admin/salted`** — lists all sessions joined with users for customer name/email. Raw pressure arrays intentionally stripped from the list response (fetched per-session).
- **`GET /api/admin/salted/[id]`** — returns the full session detail including `rawPressureData`, `analysisResult`, and any `insoleDesigns` attached to the same `scanId`.
- **`SaltedSessionTable`** — shadcn Table with Korean columns (고객명, 세션 유형, 측정 시간, 데이터 포인트 수, 측정일). Row click pushes `?id=<session>` into the URL.
- **`SaltedSessionDetail`** (client) — sections for 세션 정보, 생체역학 분석 (착지 패턴 / 프로네이션 / COP / 아치 유연도 / 체중 분포), 압력 데이터 타임라인 (inline SVG line chart, 1Hz downsampled), and 검증 보고서 (dynamic `BeforeAfterReport` with `ssr:false`). Also lists any linked insole designs so admin can jump to them.
- **`SaltedSessionDetailPanel`** — thin client wrapper that reads `?id=` and either renders the loader or a "select a session" placeholder.
- **Page `/admin/dashboard/salted`** — server component that queries Drizzle directly (parallel with `/api/admin/salted`). Two-column grid: list on the left, detail panel on the right.

### Reservations & kit inventory (Task 2)

- **Schema additions** (`src/lib/db/schema.ts`):
  - `reservationStatusEnum`: `pending | confirmed | completed | cancelled`
  - `reservations` table: customerName, customerPhone, customerEmail, reservationDate, timeSlot, serviceType, status, notes, createdAt, updatedAt
  - `kitInventory` table: kitName, totalQuantity, availableQuantity, lastUpdated
- **`GET /api/admin/reservations`** — filter by status (comma-separated), dateFrom, dateTo.
- **`POST /api/admin/reservations`** — Zod-validated create. customerName, customerPhone, reservationDate, timeSlot, serviceType required; customerEmail optional.
- **`PATCH /api/admin/reservations/[id]`** — partial update (any subset of reservation fields + status).
- **`DELETE /api/admin/reservations/[id]`** — soft delete (flips status to `cancelled`).
- **`PATCH /api/admin/kit-inventory/[id]`** — adjust `availableQuantity` with server-enforced `availableQuantity <= totalQuantity` invariant.
- **`ReservationTable`** (client) — inline filter form (status/date range), row actions based on current status (pending → 확인/취소, confirmed → 완료/취소, terminal states show dash), status badges with Korean labels. Uses `router.refresh()` after mutations.
- **`ReservationForm`** (client) — dialog form with 1-hour time slot picker (10:00–19:00), service type select, notes textarea. Client-side validation mirrors Zod schema for fast feedback.
- **`KitInventoryCard`** (client) — shows `사용 가능 / 전체`, progress bar, pencil icon toggles an inline numeric input with save/cancel actions. PATCHes `/api/admin/kit-inventory/[id]` and refreshes the page.
- **Page `/admin/dashboard/reservations`** — server component that fetches reservations (with filters mirrored from the API) and kit inventory in parallel.

## Key Decisions

- **Inline SVG chart, no recharts** — Pressure timeline is rendered with a hand-built SVG polyline + axis ticks. Adding a charting library for one chart would be bundle bloat. CONTEXT.md explicitly left this to Claude's discretion.
- **Safe jsonb coercion** — `rawPressureData` and `analysisResult` are jsonb columns whose exact shape is not enforced at write time. `coerceAnalysis()` and `buildTimeline()` both fall back to `—` / empty arrays on any missing/partial data so the admin viewer cannot crash on malformed records.
- **Server component queries Drizzle directly, mirrors /api/admin** — Same pattern as 05-02, 05-03, 05-04. The API routes exist for external callers and the list route type (`AdminSaltedSummary`, `AdminReservation`) is re-imported by the page for type parity.
- **Soft delete reservations** — `DELETE` flips status to `cancelled` rather than removing the row so cancelled bookings still show in filtered views and retain audit info.
- **Kit inventory PATCH as a separate route** — `/api/admin/kit-inventory/[id]` is a sibling rather than nesting under reservations, since kits are an independent resource. Split out under Rule 2 to support the inline editor pattern on the page.
- **Client wrapper for session detail panel** — Next.js server components can't use `useRouter`/`useSearchParams`; the detail panel component pulls the `selectedId` prop from the server page and handles the clear action client-side.

## Deviations from Plan

### Auto-added Critical Functionality

**1. [Rule 2 - Missing functionality] Dedicated kit inventory PATCH route**
- **Found during:** Task 2
- **Issue:** The plan called for inline editing of `availableQuantity` ("admin can click to edit availableQuantity (inline edit or small dialog)") but did not specify an API route for kit updates.
- **Fix:** Added `PATCH /api/admin/kit-inventory/[id]` with admin gate, Zod validation, and server-enforced `availableQuantity <= totalQuantity` invariant so the client cannot over-allocate.
- **Files added:** `src/app/api/admin/kit-inventory/[id]/route.ts`
- **Commit:** `7fed9d2`

**2. [Rule 2 - Missing functionality] Client wrapper for SALTED detail panel**
- **Found during:** Task 1
- **Issue:** The plan called for the page to be a server component but also described a `?id=xxx` URL param driving a detail view. Server components can't use `useRouter`/`useSearchParams`.
- **Fix:** Split the detail rendering into `SaltedSessionDetailPanel` (client wrapper, receives `selectedId` prop, handles clear) + `SaltedSessionDetailLoader` (fetches detail from API).
- **Files added:** `src/components/admin/salted-session-detail-panel.tsx`
- **Commit:** `ea314be`

Aside from these, the plan was executed as written.

## Known Stubs

None. The kit inventory page renders an empty state if no `kitInventory` rows exist in the DB — that is intentional per plan scope (no kit-row creation UI in this phase; seeding happens via DB migration / manual insert).

## Verification

- `npx tsc --noEmit` — passes (no type errors)
- Task 1 acceptance criteria:
  - SALTED sessions listed with customer info ✅
  - Session detail shows biomechanical analysis in Korean ✅
  - Pressure data timeline chart renders (inline SVG line chart) ✅
  - Before/after verification report shown when `analysisResult.verificationReport` is present ✅
  - Empty data states handled gracefully (dash placeholders, "원시 데이터 없음" banner) ✅
- Task 2 acceptance criteria:
  - Reservations table shows all reservations with Korean labels ✅
  - Admin can create new reservation via form dialog ✅
  - Admin can change reservation status (confirm, complete, cancel) ✅
  - Kit inventory shows available vs total counts with progress bar ✅
  - Date and status filters work (URL-driven, refetches server component) ✅
  - Zod validation on create and patch ✅
  - Korean labels throughout ✅

## Threat Surface

All routes match the plan's `<threat_model>` register (T-05-11 SALTED info disclosure, T-05-12 reservation tampering). Kit inventory PATCH is a sibling of the reservation endpoint and shares the same trust boundary (admin → DB write). No new undeclared network surface or trust boundaries introduced.

## Follow-ups

- Kit inventory seeding — add DB seed/migration in Phase 6 if marketing wants pre-populated kits, or expose a "new kit" dialog when a real operational need appears.
- Migration file generation (`drizzle-kit generate`) is not part of this repo's workflow — schema.ts changes are the source of truth and the DB is updated via `drizzle-kit push` at deploy time per prior phases' convention.

## Self-Check: PASSED

All 13 files created and both commits (`ea314be`, `7fed9d2`) present in `git log`.
