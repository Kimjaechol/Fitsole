---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
stopped_at: Completed 06-03-PLAN.md — Phase 06 ready for verification
last_updated: "2026-04-11T00:55:00.000Z"
last_activity: 2026-04-11 - Completed quick task 260411-deo: shoe-merge-client UI + SOP + wholesaler manual
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 31
  completed_plans: 31
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-09)

**Core value:** 정확한 발 측정 데이터를 기반으로 개인 맞춤 인솔을 설계하여, 착용자의 발 건강과 편안함을 과학적으로 보장하는 것.
**Current focus:** Phase 06 — Segmentation, Support & Offline Store

## Current Position

Phase: 06
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-04-10

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 39
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | - | - |
| 02 | 8 | - | - |
| 03 | 8 | - | - |
| 04 | 3 | - | - |
| 05 | 5 | - | - |
| 06 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01 P01 | 19min | 2 tasks | 39 files |
| Phase 01 P02 | 8min | 2 tasks | 11 files |
| Phase 01 P03 | 3min | 2 tasks | 8 files |
| Phase 01 P04 | 5min | 2 tasks | 9 files |
| Phase 02-foot-scanning P01 | 3min | 2 tasks | 6 files |
| Phase 02-foot-scanning P02 | 5min | 2 tasks | 17 files |
| Phase 02-foot-scanning P03 | 4min | 2 tasks | 19 files |
| Phase 02-foot-scanning P04 | 4min | 2 tasks | 12 files |
| Phase 02-foot-scanning P05 | 5min | 2 tasks | 10 files |
| Phase 02-foot-scanning P06 | 4min | 2 tasks | 8 files |
| Phase 02-foot-scanning P07 | 17min | 2 tasks | 4 files |
| Phase 02-foot-scanning P08 | 4min | 2 tasks | 4 files |
| Phase 03-01 P01 | 3min | 2 tasks | 7 files |
| Phase 03-02 P02 | 6min | 2 tasks | 14 files |
| Phase 03-insole-design-product-catalog P03 | 7min | 2 tasks | 5 files |
| Phase 03-insole-design-product-catalog P04 | 4min | 2 tasks | 8 files |
| Phase 03-insole-design-product-catalog P05 | 7min | 2 tasks | 10 files |
| Phase 03-insole-design-product-catalog P06 | 5min | 2 tasks | 12 files |
| Phase 03-insole-design-product-catalog P06 | 5min | 2 tasks | 12 files |
| Phase 03-insole-design-product-catalog P07 | 5min | 3 tasks | 8 files |
| Phase 03-insole-design-product-catalog P08 | 2min | 2 tasks | 2 files |
| Phase 04-shopping-checkout P01 | 5min | 2 tasks | 7 files |
| Phase 04-shopping-checkout P02 | 4min | 2 tasks | 11 files |
| Phase 04-shopping-checkout P03 | 4min | 2 tasks | 5 files |
| Phase 05-admin-dashboard-order-management P01 | 15min | 2 tasks | 7 files |
| Phase 05-admin-dashboard-order-management P02 | 6min | 2 tasks | 4 files |
| Phase 05-admin-dashboard-order-management P03 | 4min | 2 tasks | 9 files |
| Phase 05-admin-dashboard-order-management P04 | 8min | 2 tasks | 8 files |
| Phase 05-admin-dashboard-order-management P05 | 12min | 2 tasks | 13 files |
| Phase 06-segmentation-support-offline-store P01 | 39min | 2 tasks | 18 files |
| Phase 06-segmentation-support-offline-store P02 | 27min | 2 tasks | 16 files |
| Phase 06-segmentation-support-offline-store P03 | 8min | 2 tasks | 14 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Scanning is Phase 2 (highest-risk component validated before downstream investment)
- [Roadmap]: Insole design coupled with product catalog (Phase 3) per shoe-insole compatibility requirement
- [Phase 01]: Used next/font/local for Pretendard instead of CDN for optimal CLS performance
- [Phase 01]: Pinned next-auth to 5.0.0-beta.30 for stability over @latest tag
- [Phase 01]: Used bcryptjs (pure JS) over argon2 for serverless compatibility
- [Phase 01]: Removed horizontal padding from (main) layout for full-bleed landing sections
- [Phase 01]: Password reset always returns 200 regardless of email existence (user enumeration prevention)
- [Phase 01]: Auth layout uses SessionProvider wrapper; Resend email with console.log dev fallback
- [Phase 01]: EmptyState component uses Lucide icons at 64px with muted color for consistent empty state UX
- [Phase 01]: Reorder button uses aria-disabled and pointer-events-none for accessible disabled state
- [Phase 01]: Account deletion shows toast (v1 not implemented) rather than error
- [Phase 02-foot-scanning]: Zustand persist partializes only isOnboarded flag to localStorage, transient scan state stays in memory
- [Phase 02-foot-scanning]: All scan API routes filter by userId for IDOR prevention (T-02-01)
- [Phase 02-foot-scanning]: Sequential matching over exhaustive for video SfM (temporal frame overlap)
- [Phase 02-foot-scanning]: Median A4 calibration from first 5 frames for noise reduction
- [Phase 02-foot-scanning]: Recording pulse animation in globals.css for Tailwind v4 compatibility (no styled-jsx)
- [Phase 02-foot-scanning]: Client-side quality check limited to brightness; blur detection deferred to server-side OpenCV Laplacian
- [Phase 02-foot-scanning]: 4-degree pronation threshold for gait classification (normal vs overpronation/supination)
- [Phase 02-foot-scanning]: Rule-based heuristic pressure model with arch/weight/gender/age adjustments; 20x10 plantar grid
- [Phase 02-foot-scanning]: Korean zone labels for pressure warnings (전족부/중족부/후족부/내측/외측)
- [Phase 02-foot-scanning]: Added QueryClientProvider to root layout for app-wide TanStack Query support
- [Phase 02-foot-scanning]: TUS upload uses 5MB chunks with retry delays [0,1000,3000,5000] per RESEARCH
- [Phase 02-foot-scanning]: Used explicit width:32 style instead of Tailwind w-8 for heatmap legend to match UI-SPEC dimension spec
- [Phase 02-foot-scanning]: Upload proxy forwards video directly to Python backend (Vercel 4.5MB body limit bypass)
- [Phase 02-foot-scanning]: Sequential orchestration of SfM/gait/pressure endpoints with per-step processingStage updates for status polling
- [Phase 02-foot-scanning]: Gait video routed at upload time via type metadata, process route reads gait from DB
- [Phase 03-01]: Used jsonb columns for designParams and hardnessMap to store complex nested structures without additional tables
- [Phase 03-01]: SALTED scanId FK uses onDelete set null (session data valuable even if scan deleted)
- [Phase 03-01]: Pydantic Field constraints enforce D-01/D-02 ranges at API boundary (arch 25-60mm, heelCup 15-35mm)
- [Phase 03-02]: Created separate Payload Users collection for admin auth, isolated from customer-facing NextAuth users
- [Phase 03-02]: Public read access on Products/Categories/Media collections; write restricted to authenticated admin users
- [Phase 03-insole-design-product-catalog]: Used in-memory dict store for designs as DB placeholder; default measurement fallbacks for dev/demo mode
- [Phase 03-insole-design-product-catalog]: Hardness map returns copy of VARIOSHORE_ZONES constant; Korean sizing: foot_length mm = shoe size number
- [Phase 03-insole-design-product-catalog]: Resolution ($fn) capped at 100 per T-03-09; OpenSCAD subprocess timeout=120s; graceful degradation when OpenSCAD not installed
- [Phase 03-insole-design-product-catalog]: Mockable SaltedAdapter interface for development without physical SALTED hardware; 20x10 pressure grid with 60% threshold for landing pattern classification
- [Phase 03-insole-design-product-catalog]: Payload Local API with depth:2 for populated category/image relationships in server component product queries
- [Phase 03-insole-design-product-catalog]: Procedural Three.js BoxGeometry per insole zone rather than external GLB model (simpler, no asset dependency)
- [Phase 03-insole-design-product-catalog]: URL searchParams for product filter state enabling shareable URLs and server-side Payload queries
- [Phase 03-insole-design-product-catalog]: Payload Local API with depth:2 for populated category/image relationships in server component product queries
- [Phase 03-insole-design-product-catalog]: Procedural Three.js BoxGeometry per insole zone rather than external GLB model (simpler, no asset dependency)
- [Phase 03-insole-design-product-catalog]: URL searchParams for product filter state enabling shareable URLs and server-side Payload queries
- [Phase 03-insole-design-product-catalog]: VerificationReport includes success boolean field per D-09 thresholds (>=30% reduction, >=40% area increase)
- [Phase 03-insole-design-product-catalog]: API proxy routes use MEASUREMENT_SERVICE_URL env var; T-03-19 frame/duration limits enforced in proxy
- [Phase 03-insole-design-product-catalog]: Dynamic import with ssr:false for R3F components on product page; 240px compact height for embedded insole preview
- [Phase 04-shopping-checkout]: Cart deduplicates by productId+size+designId; free shipping over 50,000 KRW
- [Phase 04-shopping-checkout]: Toss Payments widgets API for SDK integration with customerKey-based initialization
- [Phase 04-shopping-checkout]: Server-side price validation via Payload Local API to prevent price tampering (T-04-03)
- [Phase 04-shopping-checkout]: Daum Postcode script loaded dynamically on button click rather than in global layout
- [Phase 04-shopping-checkout]: Fire-and-forget email after confirm response to avoid blocking user
- [Phase 04-shopping-checkout]: Webhook always returns 200 to prevent Toss retry storms
- [Phase 04-shopping-checkout]: Amount verification in confirm endpoint before calling Toss API
- [Phase 05-admin-dashboard-order-management]: Order type contracts placed in src/lib/types/order.ts for cross-role reuse (user mypage + upcoming admin dashboard)
- [Phase 05-admin-dashboard-order-management]: IDOR-safe order routes use WHERE (id AND userId) and return 404 on mismatch to avoid enumeration
- [Phase 05-admin-dashboard-order-management]: users.role column added proactively with default 'user' so future admin RBAC middleware reads directly from NextAuth session
- [Phase 05-admin-dashboard-order-management]: ORDER_STATUS_STEPS excludes pending and cancelled; cancelled renders as distinct banner so the progress bar keeps a stable 5-step shape
- [Phase 05-admin-dashboard-order-management]: requireAdmin() re-queries users.role from DB on every admin request so role changes take effect immediately (T-05-03)
- [Phase 05-admin-dashboard-order-management]: AdminAuthError carries discriminated 401|403 status for clean route handler mapping across future admin routes
- [Phase 05-admin-dashboard-order-management]: Middleware only guards /admin/dashboard; /admin stays reserved for Payload CMS (D-04)
- [Phase 05-admin-dashboard-order-management]: sendOrderStatusEmail() short-circuits for pending/cancelled so callers can pass any OrderStatus without pre-filtering
- [Phase 05-admin-dashboard-order-management]: PATCH only overwrites trackingNumber/trackingCarrier when explicitly provided, avoiding accidental clobbering on re-send flows
- [Phase 05-admin-dashboard-order-management]: Zod enum declared as const-tuple satisfies readonly OrderStatus[] keeping DB enum, TS type, and runtime validator in sync
- [Phase 05-admin-dashboard-order-management]: Admin server components query Drizzle directly; /api/admin/orders mirrors filter logic for external callers
- [Phase 05-admin-dashboard-order-management]: URL searchParams drive admin filter state (Phase 3 convention) so filtered views are shareable and server-rendered
- [Phase 05-admin-dashboard-order-management]: Native <select> used for admin filter dropdowns because shadcn Select/Radix Select not in repo yet; keeps Task 2 scope tight
- [Phase 05-admin-dashboard-order-management]: AdminOrderSummary type exported from /api/admin/orders/route.ts (colocated with producer) rather than duplicating in src/lib/types/order.ts
- [Phase 05-admin-dashboard-order-management]: Admin server components query Drizzle directly; /api/admin/orders kept in parallel with mirrored filter logic for external callers
- [Phase 05-admin-dashboard-order-management]: Admin filter state lives in URL searchParams (Phase 3 product catalog convention) so filtered order views are shareable and server-rendered
- [Phase 05-admin-dashboard-order-management]: Native <select> for admin dropdowns — shadcn Select/Popover + Radix Select not yet in repo; keeps dependency surface small
- [Phase 05-admin-dashboard-order-management]: AdminOrderSummary exported from /api/admin/orders/route.ts (colocated with producer) rather than duplicated in src/lib/types/order.ts
- [Phase 05-admin-dashboard-order-management]: Representative order lineType picked as professional > general > null in the admin list view to surface higher-tier designs first
- [Phase 05-admin-dashboard-order-management]: Admin server components query Drizzle directly; mirror /api/admin endpoints for external callers
- [Phase 05-admin-dashboard-order-management]: PressureHeatmap rendered as FootModel3D children for shared R3F Canvas (matches scan results page)
- [Phase 05-admin-dashboard-order-management]: Factory dispatch route awaits the email send so admins get explicit pass/fail; updates status BEFORE sending so retries cannot fire from stale designing state
- [Phase 05-admin-dashboard-order-management]: AdminOrderDetail / AdminScanData / AdminDesignData types colocated with the GET /api/admin/orders/[id] route and re-imported by the page
- [Phase 05-admin-dashboard-order-management]: DesignSpecViewer coerces stored designParams JSON into typed DesignParams with safe fallbacks so the 3D preview never crashes on partial data
- [Phase 05-admin-dashboard-order-management]: FACTORY_EMAIL env var with factory@fitsole.kr default per CONTEXT.md (factory partner not yet identified)
- [Phase 05-admin-dashboard-order-management]: Inline SVG line chart for SALTED pressure timeline avoids pulling recharts dependency for a single chart
- [Phase 05-admin-dashboard-order-management]: jsonb coercion with safe fallbacks in SALTED detail viewer so partial/malformed analysisResult never crashes UI
- [Phase 05-admin-dashboard-order-management]: Reservations use soft delete (status=cancelled) to preserve audit trail and keep cancelled bookings in filtered views
- [Phase 05-admin-dashboard-order-management]: Kit inventory PATCH endpoint (/api/admin/kit-inventory/[id]) enforces availableQuantity <= totalQuantity server-side
- [Phase 06-segmentation-support-offline-store]: users.segment stored as nullable text (not pgEnum) so guests/legacy rows map cleanly to null and future segments need no migration
- [Phase 06-segmentation-support-offline-store]: SessionProvider scoped to (main) layout (not root) so admin/payload trees stay free of next-auth context
- [Phase 06-segmentation-support-offline-store]: SegmentProvider precedence is DB > localStorage for authenticated users; guest selections auto-persist to DB on first authenticated reconcile
- [Phase 06-segmentation-support-offline-store]: SEGMENT_TO_CATEGORIES aligned to existing Payload Korean top-level slugs (운동화/구두/샌들) with TODO for richer mapping when subcategories land
- [Phase 06-segmentation-support-offline-store]: POST /api/user/segment ignores body userId; only updates WHERE users.id = session.user.id (T-06-02 mitigation)
- [Phase 06-segmentation-support-offline-store]: Catalog segment filter is additive: segment categories unioned with explicit ?category= rather than replacing
- [Phase 06-segmentation-support-offline-store]: SiteFooter rendered inside (main) <main> to coexist with BottomTabBar without overlap
- [Phase 06-segmentation-support-offline-store]: POST /api/support/contact always returns 200 on valid input even when sendSupportContactEmail throws (T-06-07 mitigation)
- [Phase 06-segmentation-support-offline-store]: Contact form submissions not persisted to DB in v1 (T-06-08 accepted); Resend delivery log is the audit trail
- [Phase 06-segmentation-support-offline-store]: escapeHtml helper inline in src/lib/email/support-contact.ts to mitigate T-06-09 injection into email body
- [Phase 06-segmentation-support-offline-store]: afterEach(cleanup) required in Vitest @testing-library page tests to prevent DOM leakage across getByRole queries
- [Phase 06-segmentation-support-offline-store]: Extracted createReservationSchema to @/lib/reservations/schema so public route avoids admin-auth/next-auth transitive import
- [Phase 06-segmentation-support-offline-store]: Public /api/reservations (not /api/admin/reservations) — admin route is auth-gated; public form needs its own POST-only endpoint with past-date refinement
- [Phase 06-segmentation-support-offline-store]: StoreLocationMap falls back to '지도 준비 중' placeholder when KAKAO_MAP_KEY env var is unset, avoiding hard dev/preview failures
- [Phase 06-segmentation-support-offline-store]: Service type labels (일반/SALTED 정밀/운동선수 키트 대여) map to existing ServiceType enum values (measurement/consultation/pickup) — no schema migration

### Pending Todos

None yet.

### Blockers/Concerns

- Factory partner not yet identified -- needed before Phase 5 execution
- MediaPipe foot landmark accuracy unvalidated -- critical risk for Phase 2

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260411-deo | shoe-merge-client UI + SOP + wholesaler manual | 2026-04-11 | 0b4cd9c | [260411-deo-shoe-merge-client-ui-sop-wholesaler-manu](./quick/260411-deo-shoe-merge-client-ui-sop-wholesaler-manu/) |

## Session Continuity

Last session: 2026-04-11T00:55:00.000Z
Stopped at: Completed quick task 260411-deo — shoe-merge-client UI + SOP + wholesaler manual
Resume file: None
