---
phase: 05-admin-dashboard-order-management
plan: 03
subsystem: admin
tags: [admin, dashboard, tanstack-table, shadcn-table, drizzle, filters, rbac]

requires:
  - phase: 05-admin-dashboard-order-management
    provides: "requireAdmin/isAdmin helpers (Plan 02), OrderStatus + labels types (Plan 01), orders + orderItems schema (Phase 04), insoleDesigns schema (Phase 03)"
provides:
  - "Admin dashboard route group (admin) with sidebar + layout + 403 gate"
  - "Dashboard overview page with 4 aggregate stat cards"
  - "GET /api/admin/orders with status/date/search/lineType filters"
  - "Filterable + sortable admin order table (TanStack Table + shadcn Table)"
  - "AdminOrderSummary type extending OrderSummary with customerName/Email/lineType"
affects: [05-04-order-detail-admin, 05-05-salted-reservations-admin]

tech-stack:
  added:
    - "@tanstack/react-table@^8 (client-side sorting/column model)"
    - "shadcn Table primitive (hand-authored, matches existing shadcn components in repo)"
  patterns:
    - "Admin route group (admin) to break out of (main) layout bottom tab bar"
    - "URL searchParams as single source of truth for admin filter state (mirrors Phase 3 product catalog)"
    - "Admin server components query Drizzle directly; /api/admin/orders duplicates logic for external callers"
    - "isAdmin() layout-level gate complements requireAdmin() in API routes for defense-in-depth (T-05-06)"

key-files:
  created:
    - "src/app/(admin)/admin/dashboard/layout.tsx"
    - "src/app/(admin)/admin/dashboard/page.tsx"
    - "src/app/(admin)/admin/dashboard/orders/page.tsx"
    - "src/components/admin/admin-sidebar.tsx"
    - "src/components/admin/dashboard-stats.tsx"
    - "src/components/admin/order-filters.tsx"
    - "src/components/admin/order-table.tsx"
    - "src/components/ui/table.tsx"
    - "src/app/api/admin/orders/route.ts"
  modified:
    - "package.json (add @tanstack/react-table)"

key-decisions:
  - "Admin server components query Drizzle directly instead of round-tripping /api/admin/orders; API kept in parallel for future external/CLI callers with filter logic mirrored"
  - "Filter state lives in URL searchParams (Phase 3 convention) so filtered views are shareable and server-rendered"
  - "Native <select> used for dropdowns — repo does not yet have shadcn Select/Popover, and install path (@radix-ui/react-select) would add deps; native keeps Task 2 scope small"
  - "shadcn Table primitive hand-authored to match existing shadcn components in repo instead of running `npx shadcn add table`"
  - "AdminOrderSummary exported from /api/admin/orders/route.ts to keep type colocated with its producer; server component imports it rather than creating a parallel types file"
  - "Representative lineType per order chosen as professional > general > null (highlights higher-tier designs in the list view)"
  - "Dashboard layout mounts Toaster directly so future mutation flows (order status update, reservation accept) can surface notifications without per-page wiring"
  - "Mobile sidebar is a slide-in drawer triggered from a fixed 14h top bar; desktop uses fixed 240px left column"

patterns-established:
  - "URL searchParams filter pattern reused across Phase 5 admin surfaces"
  - "Admin layout gate: auth() -> isAdmin(userId) -> redirect or 403 shell"
  - "TanStack Table column defs colocated with the table component; sortable headers render a SortIcon helper"

requirements-completed: [ADMN-01, ORDR-04]

duration: 4min
completed: 2026-04-10
---

# Phase 05 Plan 03: Admin Dashboard Shell + Filterable Order List Summary

**Admin route group with sidebar navigation, 4-card stats overview, and a TanStack Table order list filtered by status/date/customer/designLine with Drizzle-backed server queries.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-10T10:19:33Z
- **Completed:** 2026-04-10T10:24:11Z
- **Tasks:** 2
- **Files created:** 9
- **Files modified:** 2 (package.json, package-lock.json)

## Accomplishments

- `(admin)` route group boots cleanly without inheriting the `(main)` bottom tab bar and redirects unauthenticated users to `/login`
- Layout-level `isAdmin(userId)` gate renders a distinct 403 shell for non-admin authenticated users (T-05-06 defense-in-depth)
- Dashboard overview aggregates 4 KPIs directly via SQL `count(*)`, `sum()`, and status filters (total orders, today, in-progress, revenue)
- `/api/admin/orders` accepts `status`/`dateFrom`/`dateTo`/`search`/`lineType` and returns `AdminOrderSummary[]` with customer info and representative insole line type
- Admin orders page reuses the same Drizzle filter logic as the API route so the server-rendered list stays consistent with what external callers see
- `OrderFilters` pushes filter state into URL searchParams via `useTransition` so Back/Forward and page refresh preserve the active query
- `OrderTable` sorts 주문일/금액 client-side through `@tanstack/react-table` and navigates to `/admin/dashboard/orders/[id]` on row click (target for Plan 04)
- All Korean labels and status/line badges wired to shared `ORDER_STATUS_LABELS` and `ORDER_STATUS_BADGE_CLASSES` from `src/lib/types/order.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin layout, sidebar, dashboard overview, and orders API** — `5f1c03b` (feat)
2. **Task 2: Order list page with filterable data table** — `3e6aed1` (feat)

**Plan metadata:** pending (docs: complete plan — final commit of this run)

## Files Created/Modified

- `src/app/(admin)/admin/dashboard/layout.tsx` — Server layout with auth + isAdmin gate, sidebar slot, Toaster mount
- `src/app/(admin)/admin/dashboard/page.tsx` — Overview server component computing 4 KPIs via Drizzle aggregates
- `src/app/(admin)/admin/dashboard/orders/page.tsx` — Server-rendered order list reading URL searchParams
- `src/components/admin/admin-sidebar.tsx` — Client sidebar with desktop fixed column + mobile drawer, active route highlighting
- `src/components/admin/dashboard-stats.tsx` — Stat card grid (2x2 mobile / 4x1 desktop) using shadcn Card
- `src/components/admin/order-filters.tsx` — URL-synced filter form (status / date range / search / line type) with reset + active count
- `src/components/admin/order-table.tsx` — TanStack Table wrapper with sortable columns, status + line badges, row-click navigation
- `src/components/ui/table.tsx` — Hand-authored shadcn Table primitive (Table/TableHeader/TableBody/TableRow/TableHead/TableCell/…)
- `src/app/api/admin/orders/route.ts` — `GET /api/admin/orders` with admin gate and mirrored filter pipeline
- `package.json` / `package-lock.json` — Added `@tanstack/react-table`

## Decisions Made

- Server component fetches orders via Drizzle directly instead of looping through its own HTTP API (no extra round-trip, no fetch cache complexity); API route kept for future external consumers with filter logic intentionally mirrored
- URL searchParams chosen for filter persistence (shareable links, back/forward works, no client store)
- Native `<select>` elements used for dropdowns since the repo does not ship shadcn Select/Popover; keeps Task 2 scope tight and avoids adding Radix Select
- `shadcn/ui` Table primitive hand-authored to match the pattern used by other primitives already in `src/components/ui/`
- `AdminOrderSummary` type exported from the route file so the shape stays colocated with its producer; the server page imports from there rather than duplicating in `src/lib/types/order.ts`
- Representative lineType per order picked as `professional > general > null` to surface the higher-tier designs in the list view
- Toaster mounted at the admin layout so Plan 04/05 mutation flows can raise notifications without per-page wiring
- Layout 403 state is rendered inline (not a redirect) so admins-in-waiting see an actionable message instead of a silent bounce

## Deviations from Plan

None — plan executed exactly as written. No auto-fixes were triggered.

Notes on minor interpretation choices (not deviations):
- Plan instructed `npx shadcn@latest add table`; since the repo's shadcn components are hand-authored and the CLI is not set up, the primitive was written inline matching the existing pattern
- Plan referenced shadcn `Select`; used native `<select>` with matching styling because `Select` and its Radix dep are not in the repo yet

## Issues Encountered

None — both tasks passed `npx tsc --noEmit` on first run.

## User Setup Required

None — no external service configuration needed. The admin gate relies on the existing `users.role = 'admin'` column populated by Plan 02 migrations; promote an existing user with `UPDATE users SET role = 'admin' WHERE email = '...';` to exercise the flow.

## Next Phase Readiness

- Plan 04 (admin order detail + status mutation UI) can now link into `/admin/dashboard/orders/[id]` from the table row click handler
- Plan 05 (SALTED sessions + reservations admin) can reuse `AdminSidebar` links (already wired), the `(admin)` layout gate, and the URL-searchParams filter pattern from `OrderFilters`
- No blockers introduced. `requireAdmin()` remains the API-layer guarantee; the layout `isAdmin()` check is purely a UX shell

## Self-Check: PASSED

Verified files exist on disk:
- src/app/(admin)/admin/dashboard/layout.tsx — FOUND
- src/app/(admin)/admin/dashboard/page.tsx — FOUND
- src/app/(admin)/admin/dashboard/orders/page.tsx — FOUND
- src/components/admin/admin-sidebar.tsx — FOUND
- src/components/admin/dashboard-stats.tsx — FOUND
- src/components/admin/order-filters.tsx — FOUND
- src/components/admin/order-table.tsx — FOUND
- src/components/ui/table.tsx — FOUND
- src/app/api/admin/orders/route.ts — FOUND

Verified commits exist:
- 5f1c03b — FOUND (Task 1: admin shell + orders API)
- 3e6aed1 — FOUND (Task 2: order list + filters)

---
*Phase: 05-admin-dashboard-order-management*
*Completed: 2026-04-10*
