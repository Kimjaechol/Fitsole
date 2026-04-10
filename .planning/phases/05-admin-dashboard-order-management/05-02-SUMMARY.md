---
phase: 05-admin-dashboard-order-management
plan: 02
subsystem: api
tags: [admin-auth, order-status, email-notifications, rbac, nextauth, drizzle, resend, zod, middleware]

requires:
  - phase: 05-admin-dashboard-order-management
    provides: users.role column, shared OrderStatus contracts (05-01)
  - phase: 04-shopping-checkout
    provides: orders/orderItems tables, sendOrderConfirmationEmail Resend pattern
  - phase: 01
    provides: NextAuth session + middleware wiring

provides:
  - sendOrderStatusEmail(): Korean-templated status notification email with 5-step progress bar and conditional tracking section
  - requireAdmin() / isAdmin(): DB-backed role re-check on every admin request (T-05-03 mitigation)
  - PATCH /api/admin/orders/[id]/status: Zod-validated, admin-gated status update with fire-and-forget customer email
  - /admin/dashboard route guard via extended middleware matcher

affects: [05-03-admin-dashboard, 05-04-order-tracking, 05-05-factory-dispatch, future RBAC routes]

tech-stack:
  added: []
  patterns:
    - "Admin gating: requireAdmin() throws AdminAuthError(401|403); route handler catches and maps to NextResponse"
    - "Fire-and-forget email: call returning promise is .catch()-logged, never awaited, matching checkout/confirm pattern"
    - "Middleware keeps /admin reserved for Payload CMS; only /admin/dashboard/:path* is guarded by NextAuth"
    - "Status enum duplicated as const-tuple for Zod z.enum() while satisfying shared OrderStatus type"

key-files:
  created:
    - src/lib/email/order-status-notification.ts
    - src/lib/admin-auth.ts
    - src/app/api/admin/orders/[id]/status/route.ts
  modified:
    - src/middleware.ts

key-decisions:
  - "requireAdmin() always re-queries users.role from DB (not from session) so role downgrades take effect immediately (T-05-03)"
  - "AdminAuthError carries an explicit 401 | 403 status so handlers don't have to guess auth vs authorization"
  - "Middleware only guards /admin/dashboard — /admin stays reserved for Payload CMS (D-04)"
  - "sendOrderStatusEmail() early-returns for pending/cancelled so callers can pass any OrderStatus without a precondition check"
  - "Tracking section in email renders only when status=shipping AND trackingNumber is provided, matching D-03"
  - "PATCH only overwrites trackingNumber/trackingCarrier when explicitly supplied to avoid clobbering existing values"

patterns-established:
  - "AdminAuthError: typed exception pattern for auth/authorization gates, maps cleanly to HTTP status codes"
  - "Status email fire-and-forget: mirrors checkout/confirm email dispatch; network failures never block the response"
  - "Zod const-tuple enum derived from shared type via `satisfies readonly OrderStatus[]` keeps DB enum, TypeScript type, and runtime validator in sync"

requirements-completed: [ORDR-02, ORDR-03, ADMN-04]

duration: 6min
completed: 2026-04-09
---

# Phase 05 Plan 02: Order Status API with Email Notifications and Admin Auth Summary

**PATCH /api/admin/orders/[id]/status gated by DB-backed requireAdmin(), firing Korean status emails via Resend with the existing order-confirmation pattern, and middleware now guarding /admin/dashboard.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-09T07:34:25Z
- **Completed:** 2026-04-09T07:40:00Z (approx)
- **Tasks:** 2
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- Order status notification email supporting all 5 notifiable stages (paid/designing/manufacturing/shipping/delivered) with Korean progress bar and conditional shipping-tracking section (D-02, ORDR-02).
- Admin role enforcement with `requireAdmin()` / `isAdmin()` that re-checks `users.role` in the DB on every request — not just the session — mitigating T-05-03 elevation of privilege.
- PATCH endpoint for status updates with Zod enum validation (T-05-04), optional tracking field passthrough, and fire-and-forget customer notification email (D-09 partial, ORDR-03).
- Middleware extended to guard `/admin/dashboard/:path*`, while leaving `/admin` intact for Payload CMS (D-04, T-05-05).

## Task Commits

Each task was committed atomically:

1. **Task 1: Order status notification emails** — `3d6641e` (feat)
2. **Task 2: Admin auth middleware and order status update API** — `723d738` (feat)

_Plan metadata commit follows after SUMMARY/STATE updates._

## Files Created/Modified

- `src/lib/email/order-status-notification.ts` — New. `sendOrderStatusEmail()` mirrors `order-confirmation.ts`: Resend with dev-console fallback, Korean templates, 5-step text progress bar, tracking section when shipping + trackingNumber present.
- `src/lib/admin-auth.ts` — New. `requireAdmin()` throws `AdminAuthError(401|403)` after re-checking `users.role` in DB. `isAdmin(userId)` is a non-throwing boolean helper for UI.
- `src/app/api/admin/orders/[id]/status/route.ts` — New. PATCH handler: admin gate → body parse → Zod enum validation → DB update → fetch customer email → fire-and-forget status email. Returns updated order.
- `src/middleware.ts` — Modified. Matcher gains `/admin/dashboard/:path*`. Inline comment clarifies that `/admin` is left to Payload CMS and full role enforcement happens in `requireAdmin()`, not the edge middleware.

## Decisions Made

- **DB-first role check, not JWT claim.** NextAuth session only carries `id`; reading `role` from DB on every call means admin revocation is immediate. Acceptable latency hit because admin routes are low-volume.
- **Typed auth exception.** Introduced `AdminAuthError` with a discriminated `status: 401 | 403`. Route handlers catch once and map cleanly, avoiding nested conditionals and ensuring consistent error bodies across future admin routes.
- **Middleware stays lightweight.** Edge middleware only proves a session exists; it cannot talk to Drizzle cheaply. The DB role check lives in API handlers/server components. This split is documented in the middleware comment so future contributors don't try to add role checks there.
- **Enum single source of truth.** The PATCH handler declares the enum as `const ORDER_STATUS_VALUES = [...] as const satisfies readonly OrderStatus[]`, so TypeScript still flags drift from the shared `OrderStatus` type while Zod gets a const-tuple at runtime.
- **Tracking overwrite guard.** The PATCH handler only writes `trackingNumber`/`trackingCarrier` when the caller explicitly passes them. A future "re-send email" flow can PATCH with just `{ status }` without accidentally nulling tracking data.
- **Cancelled/pending do not email.** `sendOrderStatusEmail()` short-circuits for `pending` and `cancelled` so handlers can call it with any `OrderStatus` without pre-filtering. Keeps call sites simple.

## Deviations from Plan

None — plan executed exactly as written. `src/middleware.ts` already existed (it protects `/mypage` and `/api/profile`), so I extended its matcher instead of creating a new file, exactly as the plan's "If middleware.ts exists, extend it" branch instructed.

## Issues Encountered

None. Both tasks typechecked cleanly on the first attempt (`npx tsc --noEmit` exit 0).

## User Setup Required

None — no new environment variables or external-service configuration required. `RESEND_API_KEY` remains optional in dev (falls back to console logging). `EMAIL_FROM` is reused from the existing confirmation email pipeline. Admin users must still be promoted directly in the DB (`UPDATE users SET role='admin' WHERE email=...`) per D-13; no self-service path exists by design.

## Next Phase Readiness

- **05-03 (admin dashboard UI)** can now rely on `requireAdmin()` in server components and call the PATCH endpoint from status-change controls. The middleware matcher already covers the dashboard routes.
- **05-04 (user-facing order tracking)** can consume the same `sendOrderStatusEmail()` via any background job that transitions state.
- **05-05 (factory dispatch)** can trigger the email by PATCHing to `manufacturing`, avoiding a duplicate email pipeline.
- No blockers. Factory partner identification remains open per STATE.md blockers (unchanged, not a gate for this plan).

## Self-Check: PASSED

**Files:**
- FOUND: src/lib/email/order-status-notification.ts
- FOUND: src/lib/admin-auth.ts
- FOUND: src/app/api/admin/orders/[id]/status/route.ts
- FOUND: src/middleware.ts (modified)

**Commits:**
- FOUND: 3d6641e (Task 1)
- FOUND: 723d738 (Task 2)

**Verification:**
- `npx tsc --noEmit` → exit 0

---
*Phase: 05-admin-dashboard-order-management*
*Completed: 2026-04-09*
