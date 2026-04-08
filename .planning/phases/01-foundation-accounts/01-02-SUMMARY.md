---
phase: 01-foundation-accounts
plan: 02
subsystem: ui
tags: [nextjs, react, tailwindcss, framer-motion, lucide-react, shadcn-ui, landing-page, responsive-nav]

requires:
  - phase: 01-foundation-accounts/01
    provides: Next.js scaffold, root layout with Pretendard font, shadcn/ui components, cn() utility, CSS custom properties
provides:
  - Mobile-first bottom tab bar with 4 tabs (홈/상품/측정/마이) using Lucide icons
  - Desktop horizontal navigation bar with FitSole branding
  - Main layout shell with responsive padding and max-width 1280px
  - Korean-language landing page with Hero, Value Columns, Process Preview, Bottom CTA
  - Placeholder pages for catalog and scan routes
  - 5 landing page component tests
affects: [01-03, 01-04, 02-scanning, 03-products]

tech-stack:
  added: []
  patterns: [mobile-first-bottom-nav, route-group-layout, full-bleed-sections, framer-motion-page-transition]

key-files:
  created:
    - src/components/layout/bottom-tab-bar.tsx
    - src/components/layout/desktop-nav.tsx
    - src/app/(main)/layout.tsx
    - src/app/(main)/page.tsx
    - src/app/(main)/catalog/page.tsx
    - src/app/(main)/scan/page.tsx
    - src/components/landing/hero-section.tsx
    - src/components/landing/value-columns.tsx
    - src/components/landing/process-preview.tsx
    - src/components/landing/bottom-cta.tsx
    - src/components/__tests__/landing-page.test.tsx
  modified: []

key-decisions:
  - "Removed horizontal padding from (main) layout to support full-bleed landing sections; individual sections handle their own padding"
  - "Used getAllByText in tests due to Radix Slot rendering duplicate text nodes in jsdom"
  - "Removed root page.tsx in favor of (main) route group page to avoid route conflict"

patterns-established:
  - "Layout pattern: (main) route group with BottomTabBar + DesktopNav shell"
  - "Nav pattern: md:hidden for mobile-only, hidden md:flex for desktop-only"
  - "Landing section pattern: self-contained sections with own padding for full-bleed support"
  - "Test pattern: Mock next/navigation, next/link, and framer-motion for component tests"

requirements-completed: [UIUX-01, UIUX-02, UIUX-03]

duration: 8min
completed: 2026-04-09
---

# Phase 01 Plan 02: App Shell & Landing Page Summary

**Mobile-first responsive navigation shell with bottom tab bar and Korean-language landing page featuring Hero CTA, value columns, 3-step process preview, and bottom CTA section**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-09T03:14:00Z
- **Completed:** 2026-04-09T06:00:04Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Bottom tab bar with 4 tabs (홈/상품/측정/마이) using Lucide icons, scan tab visually differentiated with accent circle
- Desktop nav bar with FitSole logo, 4 navigation items, max-width 1280px centered
- Main layout shell with responsive breakpoints (mobile bottom padding, desktop no padding)
- Landing page with 4 sections: Hero (full viewport, primary CTA), Value Columns (3-column grid), Process Preview (3-step flow), Bottom CTA (accent background)
- All UI text in Korean with no English fallbacks
- 5 passing component tests for landing page sections

## Task Commits

1. **Task 1: Build bottom tab bar, desktop nav, and main layout shell** - `82b428e` (feat)
2. **Task 2: Build landing page with 4 sections using Korean copy from UI-SPEC** - `4304f7f` (feat)

## Files Created/Modified
- `src/components/layout/bottom-tab-bar.tsx` - Mobile bottom navigation with 4 tabs, scan tab accent circle
- `src/components/layout/desktop-nav.tsx` - Desktop horizontal nav with FitSole branding
- `src/app/(main)/layout.tsx` - Main layout with BottomTabBar + DesktopNav + max-w-1280px
- `src/app/(main)/page.tsx` - Landing page composing 4 sections with Framer Motion fadeIn
- `src/app/(main)/catalog/page.tsx` - Placeholder catalog page (준비 중)
- `src/app/(main)/scan/page.tsx` - Placeholder scan page (준비 중)
- `src/components/landing/hero-section.tsx` - Full viewport hero with headline and primary CTA
- `src/components/landing/value-columns.tsx` - 3-column value proposition cards
- `src/components/landing/process-preview.tsx` - 3-step process flow with connecting lines
- `src/components/landing/bottom-cta.tsx` - Accent background CTA section
- `src/components/__tests__/landing-page.test.tsx` - 5 tests for all landing page sections

## Decisions Made
- Removed horizontal padding from (main) layout to allow full-bleed landing sections (hero white bg, bottom CTA accent bg); individual sections manage their own padding
- Removed root src/app/page.tsx to avoid route conflict with (main)/page.tsx route group
- Used getAllByText in tests because Radix Slot (shadcn Button asChild) renders duplicate text nodes in jsdom environment

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed conflicting root page.tsx**
- **Found during:** Task 2 (landing page creation)
- **Issue:** Both src/app/page.tsx and src/app/(main)/page.tsx would serve the `/` route, causing a Next.js route conflict
- **Fix:** Removed src/app/page.tsx so (main)/page.tsx is the sole handler for `/`
- **Files modified:** src/app/page.tsx (deleted)
- **Verification:** `npx next build` compiles successfully, `/` route resolves correctly
- **Committed in:** 4304f7f (Task 2 commit)

**2. [Rule 3 - Blocking] Adjusted layout for full-bleed sections**
- **Found during:** Task 2 (landing page creation)
- **Issue:** Layout's px-4 padding prevented hero and bottom CTA sections from having full-width backgrounds
- **Fix:** Removed horizontal padding from layout container; landing sections handle their own padding
- **Files modified:** src/app/(main)/layout.tsx
- **Verification:** Build passes, landing sections render with correct full-bleed backgrounds
- **Committed in:** 4304f7f (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for correct routing and visual layout. No scope creep.

## Issues Encountered
- Radix Slot (used by shadcn Button with asChild) renders duplicate text nodes in jsdom, causing getByText to fail. Resolved by using getAllByText assertions in tests.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- App shell and landing page complete, ready for auth UI forms (Plan 01-03)
- Navigation structure supports all 4 routes (/, /catalog, /scan, /mypage)
- shadcn/ui Button and Card components proven working in landing page context
- Test infrastructure validated for React component testing with mocks

## Self-Check: PASSED

All 11 key files verified present. Both task commits (82b428e, 4304f7f) verified in git log.

---
*Phase: 01-foundation-accounts*
*Completed: 2026-04-09*
