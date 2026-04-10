# Phase 5: Admin Dashboard & Order Management - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Full admin dashboard for order management, customer data viewing (3D scans, pressure data, SALTED sessions), insole design spec download (STL, parameters, TPU map), factory dispatch, and offline store reservation management. Plus user-facing order tracking with email notifications.

</domain>

<decisions>
## Implementation Decisions

### User-Facing Order Tracking
- **D-01:** Order status page at /mypage with status stages: 주문확인 → 인솔설계 → 제작중 → 배송중 → 완료
- **D-02:** Email notifications at each stage transition via Resend (Korean templates)
- **D-03:** Order detail page shows: items, shipping info, insole design summary, tracking number (when available)

### Admin Dashboard (관리자 전용)
- **D-04:** Admin dashboard at /admin/dashboard — separate from Payload CMS admin (/admin which manages products). Built with shadcn/ui components, NOT Payload CMS UI
- **D-05:** Order list with filters: status, date range, customer name/email, design line (Line 1 camera / Line 2 SALTED)
- **D-06:** Order detail view: customer info, scan data (3D model embed), insole design parameters, payment info, status controls
- **D-07:** Customer scan data viewer: embedded 3D foot model (reuse FootModel3D), measurement values, pressure heatmap
- **D-08:** Insole design spec viewer: 3D insole preview (reuse InsolePreview3D), design parameters table, TPU temperature map, STL file download button
- **D-09:** Factory dispatch: update order to "제작중" → auto-generate email to factory with design specs (STL attached or download link), parameter sheet, shipping address
- **D-10:** SALTED session viewer: raw pressure data timeline, biomechanical analysis results, before/after report if available
- **D-11:** Offline store reservation management: view upcoming reservations, mark as completed, kit inventory tracking (simple CRUD)

### Admin Access Control
- **D-12:** Admin routes protected by role check — only users with `role: 'admin'` in DB can access /admin/dashboard
- **D-13:** Admin role is set directly in DB (no self-registration for admin)

### Claude's Discretion
- Dashboard chart library choice (recharts vs chart.js)
- Data table library (TanStack Table recommended)
- Factory email template HTML structure
- Reservation time slot logic

</decisions>

<canonical_refs>
## Canonical References

- `.planning/PROJECT.md` — Two-line approach
- `.planning/REQUIREMENTS.md` — ORDR-01~04, ADMN-01~06
- `.planning/research/STACK.md` — Resend for emails, Drizzle for DB queries

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/scan/foot-model-3d.tsx` — 3D foot viewer for admin scan data view
- `src/components/insole/insole-preview-3d.tsx` — 3D insole preview for design spec viewer
- `src/components/scan/pressure-heatmap.tsx` — Pressure heatmap for admin data view
- `src/components/insole/before-after-report.tsx` — Verification report for SALTED sessions
- `src/lib/db/schema.ts` — orders, orderItems, footScans, insoleDesigns, saltedSessions tables
- `src/lib/email/order-confirmation.ts` — Resend email pattern to reuse

### Established Patterns
- shadcn/ui, Pretendard, Korean UI
- Server components with auth() check
- Zustand stores for client state
- API routes proxying to Python backend

### Integration Points
- Orders from Phase 4 checkout
- Scan/design data from Phases 2-3
- SALTED session data from Phase 3
- Phase 6 offline store reservations will read from reservation table created here

</code_context>

<specifics>
## Specific Ideas

- Admin dashboard is a SEPARATE section from Payload CMS admin — Payload manages products, dashboard manages operations
- Factory dispatch email should include STL download link (not attachment — files too large)
- TanStack Table for sortable/filterable data tables
- Admin should see both Line 1 and Line 2 orders clearly differentiated

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-admin-dashboard-order-management*
*Context gathered: 2026-04-10*
