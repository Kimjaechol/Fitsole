---
phase: 05-admin-dashboard-order-management
plan: 01
subsystem: ui
tags: [next-js, drizzle, orders, mypage, korean-ui, shadcn]

requires:
  - phase: 04-shopping-checkout
    provides: orders/orderItems tables populated by Toss Payments confirm flow
  - phase: 03-insole-design-product-catalog
    provides: insoleDesigns table with designParams (archHeight, heelCupDepth, lineType)
  - phase: 01-foundation
    provides: NextAuth session with user.id on JWT
provides:
  - Shared Order type contracts (OrderStatus, OrderSummary, OrderDetail, OrderItemDetail, OrderInsoleDesignSummary)
  - Korean status labels and 5-step progress constants (ORDER_STATUS_LABELS, ORDER_STATUS_STEPS)
  - users.role column (default "user") enabling admin RBAC
  - orders.trackingNumber / trackingCarrier columns
  - GET /api/orders — user's order list, IDOR-safe
  - GET /api/orders/[id] — user's order detail, IDOR-safe
  - /mypage order history tab wired to real data
  - /mypage/orders and /mypage/orders/[id] pages
affects: [05-02 admin dashboard, 05-03 factory dispatch, 05-04 email notifications]

tech-stack:
  added: []
  patterns:
    - "Shared type contracts module in src/lib/types/ for cross-role reuse (user view + upcoming admin view)"
    - "IDOR prevention via WHERE (id AND userId) on all user-scoped reads; 404 on mismatch to avoid enumeration"
    - "Client-side fetch in OrderHistoryTab, server-component fetch on dedicated /mypage/orders pages (dual-path for linkability)"
    - "Order status progress bar with compile-time step list (ORDER_STATUS_STEPS) and Korean labels"

key-files:
  created:
    - src/lib/types/order.ts
    - src/app/api/orders/route.ts
    - src/app/api/orders/[id]/route.ts
    - src/app/(main)/mypage/orders/page.tsx
    - src/app/(main)/mypage/orders/[id]/page.tsx
  modified:
    - src/lib/db/schema.ts
    - src/components/profile/order-history-tab.tsx

key-decisions:
  - "Order type contracts live in src/lib/types/order.ts (not co-located with API route) to enable admin dashboard reuse in 05-02"
  - "ORDER_STATUS_STEPS excludes pending and cancelled — pending is pre-checkout, cancelled shown as distinct banner instead of progress bar"
  - "users.role column (default 'user') added here rather than deferred to 05-02 to keep schema migration atomic and let the admin auth check in future plans read from the existing session"
  - "404 (not 403) when order belongs to a different user — avoids differential response that would enable order enumeration"
  - "Tracking carrier stored as separate column (trackingCarrier) rather than encoded in trackingNumber — enables carrier-aware tracking link generation in future"
  - "extractNumber helper tolerates multiple param key casings (archHeight / arch_height) so insole summary works regardless of Line 1 vs Line 2 param shape"
  - "/mypage/orders standalone page duplicates API query logic server-side instead of fetching own API — avoids SSR fetch round-trip and keeps auth synchronous via server session"

patterns-established:
  - "Korean UI contract pattern: status labels + Tailwind badge class maps co-located in types module for single source of truth"
  - "IDOR-safe detail route: WHERE id AND userId, return 404 on miss"
  - "Server component + auth() + redirect('/login') pattern for authenticated mypage sub-pages"

requirements-completed: [ORDR-01]

duration: 15min
completed: 2026-04-10
---

# Phase 05 Plan 01: User Order Tracking Summary

**User-facing order tracking on /mypage with shared Order type contracts, Korean status progress bar, IDOR-safe API routes, and insole design summary per D-01/D-03**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-10T04:58:20Z
- **Completed:** 2026-04-10T07:12:29Z
- **Tasks:** 2
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments

- Shared `src/lib/types/order.ts` contracts consumed by both user-facing pages and the upcoming admin dashboard — single source of truth for `OrderStatus`, Korean labels, badge classes, and detail shapes
- `GET /api/orders` and `GET /api/orders/[id]` routes with session-scoped filtering (T-05-01 IDOR, T-05-02 spoofing) and 404-on-mismatch to prevent enumeration
- Schema extension: `users.role` (default `"user"`) for RBAC, plus `orders.trackingNumber` / `orders.trackingCarrier` per D-03
- Order history tab now fetches live data with loading state, empty state preserved, card list with Korean status badge and "외 N건" summary
- `/mypage/orders` server-rendered list (dedicated URL, used as back-target from the detail page) and `/mypage/orders/[id]` detail page with 5-step progress bar (주문확인 → 인솔설계 → 제작중 → 배송중 → 완료)
- Order detail renders four sections: 주문 상품, 인솔 설계 요약 (conditional on designId, shows archHeight/heelCupDepth and lineType label), 배송 정보 (tracking number + carrier when set), 결제 정보

## Task Commits

1. **Task 1: Order type contracts and API routes** — `09e5201` (feat)
2. **Task 2: Order list and detail UI pages** — `6f8bb24` (feat)

## Files Created/Modified

- `src/lib/types/order.ts` — Shared OrderStatus / OrderSummary / OrderDetail / OrderItemDetail / OrderInsoleDesignSummary contracts, Korean label maps, badge class map, helpers
- `src/app/api/orders/route.ts` — GET user's order list with itemCount + firstItemName aggregation
- `src/app/api/orders/[id]/route.ts` — GET single order detail with insole design summary join
- `src/app/(main)/mypage/orders/page.tsx` — Server component order list (direct-link target)
- `src/app/(main)/mypage/orders/[id]/page.tsx` — Server component detail page with status progress bar and all four sections
- `src/lib/db/schema.ts` — Added users.role, orders.trackingNumber, orders.trackingCarrier
- `src/components/profile/order-history-tab.tsx` — Client component rewrite: fetches /api/orders, renders card list, preserves empty state and reorder button

## Decisions Made

- Order type contracts placed in `src/lib/types/order.ts` (not `src/app/api/orders/`) so the upcoming 05-02 admin dashboard can import them without coupling to the user API route module
- `users.role` schema column added proactively here (plan frontmatter did not list it as required migration, but plan action item #2 explicitly required it per D-12/D-13). Keeping the admin role in the main users table lets NextAuth session.user.role flow through naturally.
- `ORDER_STATUS_STEPS` excludes `pending` (pre-checkout) and `cancelled` (terminal failure) — cancelled orders render a red banner instead of the progress bar, which keeps the step count stable at 5 for the visual design
- 404 (not 403) response when order belongs to another user, matching OWASP IDOR guidance to not leak existence
- Detail page uses a small `extractNumber` helper that tolerates both camelCase and snake_case param keys — future-proofs against variations between Line 1 (camera) and Line 2 (SALTED) design param shapes written by the Python microservice
- Back button target: the plan said "Back button linking to /mypage (order history tab)", and `/mypage` is where the order history tab lives. The back buttons link to `/mypage` rather than `/mypage/orders` so users return to the tabbed profile view they started from

## Deviations from Plan

None — plan executed exactly as written. Both tasks completed with all acceptance criteria satisfied. The `users.role` and `orders.trackingNumber`/`trackingCarrier` columns listed in Task 1 action item #2 were added as specified.

## Issues Encountered

None. TypeScript `--noEmit` passed cleanly after both tasks. No runtime testing was performed (no dev server started) but the plan's `<verify>` block only required `npx tsc --noEmit`, which succeeded.

## User Setup Required

None for this plan. A Drizzle migration will need to be generated and applied (`npx drizzle-kit generate` then push/migrate) before the `users.role`, `orders.tracking_number`, and `orders.tracking_carrier` columns exist in any running database. That is a standard migration step, not external service config, so no USER-SETUP.md is warranted.

## Known Stubs

None that block the plan goal. The `insoleDesigns` summary will only render when an order item has a `designId`, which depends on Phase 04 checkout correctly populating `orderItems.designId`. If a production order lacks `designId`, the 인솔 설계 요약 section is simply omitted — this is the intended conditional render, not a stub.

## Next Phase Readiness

- Order type contracts ready for consumption by **05-02** (admin dashboard) — admin can reuse `OrderStatus`, `ORDER_STATUS_LABELS`, `OrderDetail`, etc. unchanged
- `users.role` column available for admin RBAC middleware in **05-02**
- `orders.trackingNumber` / `trackingCarrier` columns ready to be written by **05-03** factory dispatch / **05-04** shipping updates
- The mypage order list depends on Phase 04 orders being populated — no orders in DB means the empty state renders, which is the correct behaviour

---

## Self-Check: PASSED

**Files verified on disk:**
- FOUND: src/lib/types/order.ts
- FOUND: src/app/api/orders/route.ts
- FOUND: src/app/api/orders/[id]/route.ts
- FOUND: src/app/(main)/mypage/orders/page.tsx
- FOUND: src/app/(main)/mypage/orders/[id]/page.tsx
- FOUND: src/lib/db/schema.ts (modified: users.role, orders.trackingNumber/trackingCarrier)
- FOUND: src/components/profile/order-history-tab.tsx (rewritten)

**Commits verified:**
- FOUND: 09e5201 (Task 1: feat order types + API routes)
- FOUND: 6f8bb24 (Task 2: feat order list + detail UI)

**Verification command:** `npx tsc --noEmit` — exit code 0, no diagnostics.

---
*Phase: 05-admin-dashboard-order-management*
*Completed: 2026-04-10*
