---
phase: 06-segmentation-support-offline-store
plan: 02
subsystem: ui
tags: [support, faq, guarantee, email, resend, zod, react-hook-form, radix-accordion, shadcn, nextjs]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "(main) layout, shadcn UI primitives, sonner toaster, react-hook-form, Resend email pattern"
  - phase: 04-shopping-checkout
    provides: "Resend + dev-console-fallback email pattern from order-confirmation.ts and order-status-notification.ts"
  - phase: 05-admin-dashboard-order-management
    provides: "Zod + Korean error messages API pattern from /api/admin/reservations/route.ts; FACTORY_EMAIL default env-var convention"
provides:
  - "FAQ page with Radix-based Accordion (5 locked sections per D-07)"
  - "90-day satisfaction guarantee page (D-09)"
  - "Free remake policy page (D-10)"
  - "Contact form + /api/support/contact + sendSupportContactEmail (D-08, SUPP-02)"
  - "Site-wide footer surfacing 90일 만족 보장 on every (main) route (D-09)"
  - "shadcn Accordion primitive reusable across the app"
affects: [06-03-offline-store, future-marketing-pages, future-cms-content]

# Tech tracking
tech-stack:
  added:
    - "@radix-ui/react-accordion (^1.x)"
  patterns:
    - "User-facing public POST endpoint with Zod validation + Korean error messages"
    - "HTML-email escaping helper to mitigate T-06-09 injection"
    - "Email send wrapped in try/catch + 200 response (no backend leakage, T-06-07)"
    - "Test cleanup() in afterEach to prevent DOM leakage between @testing-library renders"

key-files:
  created:
    - src/components/ui/accordion.tsx
    - src/app/(main)/faq/page.tsx
    - src/app/(main)/guarantee/page.tsx
    - src/app/(main)/remake-policy/page.tsx
    - src/app/(main)/support/page.tsx
    - src/app/api/support/contact/route.ts
    - src/lib/email/support-contact.ts
    - src/components/support/contact-form.tsx
    - src/components/layout/site-footer.tsx
    - src/app/(main)/faq/__tests__/page.test.tsx
    - src/components/layout/__tests__/site-footer.test.tsx
    - src/lib/email/__tests__/support-contact.test.ts
    - src/app/api/support/contact/__tests__/route.test.ts
  modified:
    - src/app/(main)/layout.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "SiteFooter rendered inside the (main) <main> element (after children, before BottomTabBar) so it sits above the mobile tab bar without layout overlap"
  - "FAQ Q&A content uses plain Korean boilerplate per CONTEXT.md 'Claude's Discretion' — no CMS-backed FAQ in v1"
  - "Contact form does NOT persist submissions to DB (T-06-08 accepted) — Resend delivery log is sufficient audit trail"
  - "POST /api/support/contact always returns 200 on valid input even if email send throws, to avoid leaking backend failures (T-06-07)"
  - "Tests use afterEach(cleanup) because Vitest @testing-library does not auto-unmount between its"
  - "HTML escape helper included inline in support-contact.ts rather than importing a library (tiny surface, no new deps)"
  - "vi.mock('resend') uses a class-based mock so `new Resend(key)` succeeds; plain vi.fn().mockImplementation returns a non-constructor function"
  - "replyTo on the support email points to the customer's address so the team can reply directly from their inbox"

patterns-established:
  - "Public unauthenticated POST endpoint pattern: Zod parse → 400 with Korean issues array → send email → always 200 on success/silent email failure"
  - "Radix Accordion wrapped in shadcn style with chevron rotation and cn() util — reusable across future pages"
  - "SUPPORT_EMAIL env var with hardcoded support@fitsole.kr default (mirrors Phase 5 FACTORY_EMAIL pattern for unknown-partner defaults)"
  - "Site footer as a standalone server component wired once in the (main) layout"

requirements-completed: [SUPP-01, SUPP-02, SUPP-03]

# Metrics
duration: 27min
completed: 2026-04-10
---

# Phase 06 Plan 02: Support & Guarantee Features Summary

**FAQ with Radix Accordion, /guarantee + /remake-policy trust pages, contact form POSTing to /api/support/contact with Resend + dev-console fallback email, and site-wide footer surfacing 90일 만족 보장 on every (main) route.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-04-10T13:19:53Z
- **Completed:** 2026-04-10T13:46:29Z
- **Tasks:** 2 (both TDD: RED → GREEN)
- **Files created:** 13
- **Files modified:** 3
- **Test count:** 26 new tests (all passing)

## Accomplishments

- **SUPP-01 — FAQ:** /faq page with 5 locked sections (측정 정확도, 배송, 반품/교환, 맞춤 인솔, 오프라인 매장) built on a freshly added shadcn-style Radix Accordion primitive. Questions cover ±0.15mm accuracy, 2-3 week lead times, 50,000원 free-shipping threshold, Varioshore TPU zone hardness, and cross-links to /guarantee, /remake-policy, and /stores/gangnam.
- **SUPP-03 — 90-day guarantee surface:** /guarantee page with hero, boundary/scope list, 3-step claim process, and remake cross-link (D-09). SiteFooter now renders a prominent "90일 만족 보장" badge with ShieldCheck icon on every (main) route — including the landing page — satisfying the D-09 landing-footer visibility requirement.
- **SUPP-02 — Contact form end-to-end:** /support page renders ContactForm (react-hook-form + zodResolver + sonner toasts) that POSTs to /api/support/contact. Server validates with the same Zod schema, calls sendSupportContactEmail, and returns 200. sendSupportContactEmail uses the established Resend pattern with dev-console fallback and a `replyTo` header pointing back at the customer.
- **D-10 — Free remake policy page:** /remake-policy explains conditions, the 4-step process (문의 접수 → 원인 분석 → 재제작 → 배송), 2-3 week duration, and a CTA back to /support.
- **Security mitigations:** T-06-05 (Zod field validation with Korean errors), T-06-07 (200 even on email failure — no backend leak), T-06-09 (escapeHtml helper escapes all user text in email body). T-06-06 and T-06-08 accepted per threat register.

## Task Commits

Each task was executed TDD-style (test → feat) and committed atomically:

1. **Task 1 RED (failing tests):** `d719239` — `test(06-02): add failing tests for FAQ, guarantee, remake, footer`
2. **Task 1 GREEN (implementation):** `f3acce7` — `feat(06-02): FAQ, guarantee, remake-policy, site footer`
3. **Task 2 RED (failing tests):** `5edf016` — `test(06-02): add failing tests for support contact email and API route`
4. **Task 2 GREEN (implementation):** `91b6a43` — `feat(06-02): support contact form, API route, Resend-integrated email`

**Plan metadata commit:** (pending — see final_commit step)

## Files Created/Modified

### Created

- `src/components/ui/accordion.tsx` — shadcn-style wrapper around @radix-ui/react-accordion (Item / Trigger / Content) with chevron rotation and cn() util
- `src/app/(main)/faq/page.tsx` — FAQ page with 5 sections and 13 total Q&A items, single-collapsible accordion per section
- `src/app/(main)/guarantee/page.tsx` — Hero, scope list, 3-step claim process, remake/support cross-links
- `src/app/(main)/remake-policy/page.tsx` — Conditions, 4-step process cards, duration, support CTA
- `src/app/(main)/support/page.tsx` — H1, response-time intro, ContactForm mount, fallback mailto/faq block
- `src/components/support/contact-form.tsx` — Client component: react-hook-form + zodResolver + sonner toasts + native select
- `src/lib/email/support-contact.ts` — sendSupportContactEmail + escapeHtml helper + CATEGORY_LABELS, follows Resend + dev-console fallback pattern
- `src/app/api/support/contact/route.ts` — POST handler with Zod schema (also exported for tests), swallows email failures and returns 200
- `src/components/layout/site-footer.tsx` — Server component: ShieldCheck badge, nav row, company info, © line
- `src/app/(main)/faq/__tests__/page.test.tsx` — 9 tests covering FAQ sections, Radix semantics, guarantee content, remake steps
- `src/components/layout/__tests__/site-footer.test.tsx` — 4 tests covering badge, nav links, and /stores/gangnam visibility
- `src/lib/email/__tests__/support-contact.test.ts` — 7 tests covering dev fallback, Resend branch, SUPPORT_EMAIL default, category label, fire-and-forget, HTML injection escaping
- `src/app/api/support/contact/__tests__/route.test.ts` — 7 tests covering happy path, invalid email/category/message/body, silent email failure

### Modified

- `src/app/(main)/layout.tsx` — Added SiteFooter import and `<SiteFooter />` inside `<main>` after children (before BottomTabBar)
- `package.json` + `package-lock.json` — Added `@radix-ui/react-accordion` runtime dependency

## Decisions Made

- **Footer placement inside `<main>`** — Placing SiteFooter inside `<main className="flex-1 pb-[72px] md:pb-0">` (after the children container, before BottomTabBar) preserves the existing sticky bottom tab bar on mobile and the sticky footer on desktop without needing layout rewrites.
- **FAQ content is boilerplate Korean** — Per 06-CONTEXT.md "Claude's Discretion", the plan explicitly allows plain boilerplate Q&A. No CMS integration in v1.
- **No DB persistence for contact messages** — T-06-08 disposition was `accept` in the threat register. Resend delivery log is sufficient audit for v1 low volume.
- **Always return 200 on valid input** — Even when sendSupportContactEmail throws, the route returns `{ok:true}` to avoid leaking backend state to unauthenticated callers (T-06-07). The email sender already wraps its own send in try/catch but the route has a defensive try/catch too.
- **Class-based vi.mock for Resend** — The first attempt used `vi.fn().mockImplementation(() => ({...}))` and failed with "is not a constructor". Switched to a real class so `new Resend(key)` works. Recorded as a test-infra learning.
- **`afterEach(cleanup)` in both Task 1 test files** — Vitest + @testing-library does not auto-unmount. Without cleanup, subsequent `render()` calls in the same file had stale DOM and `getByRole("heading", ...)` matched multiple headings. This pattern should be adopted in future tests that render multiple pages.
- **`replyTo` set to customer email** — so the support team can reply directly from their Resend-connected inbox without copy-pasting the address.
- **HTML escape helper inline** — Keeps the support-contact module self-contained; the 5-char replacement set is trivial and doesn't justify a new dependency.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test DOM leakage between renders**
- **Found during:** Task 1 verification
- **Issue:** When all tests in `faq/__tests__/page.test.tsx` ran together, later `getByRole("heading", ...)` calls failed with "Found multiple elements" because Vitest @testing-library does not auto-cleanup between tests. Individual tests passed, file-level runs failed.
- **Fix:** Added `afterEach(cleanup)` to both new test files.
- **Files modified:** `src/app/(main)/faq/__tests__/page.test.tsx`, `src/components/layout/__tests__/site-footer.test.tsx`
- **Verification:** Full suite passes (26/26 for the 4 new files).
- **Committed in:** `f3acce7` (test files were re-committed as part of Task 1 GREEN commit since they were still not committed separately).

**2. [Rule 3 - Blocking] Radix Accordion class-based mock**
- **Found during:** Task 2 verification (email tests)
- **Issue:** `vi.fn().mockImplementation(() => ({emails:{send:mock}}))` produced a mock that was not a valid constructor; `new Resend(key)` threw "is not a constructor".
- **Fix:** Replaced with a real `class Resend` inside the vi.mock factory.
- **Files modified:** `src/lib/email/__tests__/support-contact.test.ts`
- **Verification:** 7/7 email tests pass.
- **Committed in:** `91b6a43` (part of Task 2 GREEN).

**3. [Rule 1 - Bug] HTML injection test assertion**
- **Found during:** Task 2 verification
- **Issue:** Initial test asserted `call.html` does NOT contain `onerror=`, but the escaping function converts `<img ... onerror=alert(1)>` to `&lt;img src=x onerror=alert(1)&gt;` — the text `onerror=` remains as plain characters (harmless but still present). The test was wrong; the code was correct.
- **Fix:** Rewrote the assertion to verify positive escaping (`&lt;script&gt;` present, raw `<script>` absent).
- **Files modified:** `src/lib/email/__tests__/support-contact.test.ts`
- **Verification:** Security property still enforced: no raw `<script>` or `<img ...>` tags in email HTML. Escaped entities confirm the escape ran.
- **Committed in:** `91b6a43` (part of Task 2 GREEN).

---

**Total deviations:** 3 auto-fixed (2 blocking test infra, 1 test assertion bug).
**Impact on plan:** Zero scope creep. All deviations were test-infrastructure and test-correctness issues, not changes to product behavior. No architectural decisions deferred.

## Issues Encountered

- **Pre-existing typecheck errors in `.next/types/validator.ts`** (Payload 3.82 vs Next.js 16 route type incompatibility) — unrelated to this plan, already documented in `deferred-items.md`. Does not block execution of this plan's files.
- **Pre-existing build failure** in `src/app/products/[slug]/page.tsx` (Phase 03 `dynamic(..., {ssr:false})` in a Server Component, rejected by Turbopack in Next.js 16.2) — unrelated to this plan, already documented in `deferred-items.md`. Cannot run the plan's `pnpm build` verify step end-to-end; `vitest` and `tsc` on the new files are the authoritative signal.
- **Pre-existing vitest failures** in `foot-profile-tab.test.tsx` and `order-history-tab.test.tsx` — unrelated to this plan, already documented in `deferred-items.md`.

## User Setup Required

None — no new external services. The `SUPPORT_EMAIL` and `RESEND_API_KEY` env vars are optional: when absent, the email sender logs to the dev console (the same fallback as every other FitSole email). When the Resend API key is eventually set in production, the form will begin delivering to `support@fitsole.kr` (or whatever `SUPPORT_EMAIL` is set to).

## Next Phase Readiness

- **Plan 06-03 unblocked:** offline store / gangnam page work can proceed. The SiteFooter already links to `/stores/gangnam`, so that page simply needs to exist.
- **FAQ / guarantee / remake-policy** provide the trust-layer pages the landing page and catalog can freely link to.
- **Reusable Accordion primitive** is now available for any future Q&A-style content (product spec tabs, kit guides, checkout info).
- **Public contact endpoint** sets the template for any future unauthenticated write endpoints: Zod + Korean errors + silent backend failure handling.

## Verification

### Automated

- `npx vitest run src/app/(main)/faq/__tests__ src/components/layout/__tests__ src/lib/email/__tests__/support-contact.test.ts src/app/api/support/contact/__tests__` → **26/26 passed**
- `npx tsc --noEmit` on new files → **0 errors** (only pre-existing Payload validator errors, documented in deferred-items.md)

### Not Run (pre-existing blockers)

- `npx next build` — blocked by pre-existing Phase 03 Turbopack issue (documented)

## Known Stubs

None. All pages render real content; no hardcoded empty arrays flow into UI components; no "coming soon" placeholders.

## Self-Check: PASSED

All 13 created files verified present on disk. All 4 task commits verified in git log:

- `d719239` — test(06-02): add failing tests for FAQ, guarantee, remake, footer
- `f3acce7` — feat(06-02): FAQ, guarantee, remake-policy, site footer
- `5edf016` — test(06-02): add failing tests for support contact email and API route
- `91b6a43` — feat(06-02): support contact form, API route, Resend-integrated email

Vitest run for all 4 new test files: 26/26 passing. No missing files, no orphaned commits.

---
*Phase: 06-segmentation-support-offline-store*
*Plan: 02*
*Completed: 2026-04-10*
