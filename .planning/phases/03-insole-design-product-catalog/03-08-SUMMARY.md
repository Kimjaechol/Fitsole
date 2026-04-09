---
phase: 03-insole-design-product-catalog
plan: 08
subsystem: ui
tags: [react-three-fiber, insole-preview, product-detail, dynamic-import]

requires:
  - phase: 03-insole-design-product-catalog
    provides: InsolePreview3D component, VARIOSHORE_ZONES types, buildDesignParams/buildDefaultHardnessMap patterns

provides:
  - ProductInsolePreview compact client component wrapping InsolePreview3D
  - Embedded 3D insole preview on product detail page for users with scan data

affects: [product-detail, insole-design]

tech-stack:
  added: []
  patterns: [dynamic import with ssr:false for R3F components, server-side designParams computation from DB measurements]

key-files:
  created:
    - src/components/insole/product-insole-preview.tsx
  modified:
    - src/app/products/[slug]/page.tsx

key-decisions:
  - "Reuse actual InsolePreview3D with full 3D interaction rather than static preview image"
  - "Dynamic import with ssr:false prevents R3F Canvas server-side rendering crashes"
  - "240px compact height for product page fit vs 360/480px on dedicated design page"

patterns-established:
  - "Compact 3D preview pattern: wrap full InsolePreview3D in height-constrained container with CSS override"

metrics:
  duration: 2min
  completed: "2026-04-09"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 03 Plan 08: Embed InsolePreview3D on Product Detail Page Summary

Server-side designParams/hardnessMap computation from DB scan measurements, dynamically imported into product detail page as compact 240px 3D insole preview with R3F ssr:false guard.

## What Was Done

### Task 1: Create compact ProductInsolePreview client component
- Created `src/components/insole/product-insole-preview.tsx`
- Wraps `InsolePreview3D` in a 240px height container with CSS override
- Korean labels: heading "맞춤 인솔 미리보기", description "발 측정 데이터 기반 맞춤 인솔 설계"
- Pressure overlay toggle via local useState
- Link to `/insole/design` for full design view
- **Commit:** `46b43e1`

### Task 2: Replace teaser card with embedded InsolePreview3D on product detail page
- Removed blue teaser card (`bg-blue-50` info box with link)
- Added `buildDesignParams` and `buildDefaultHardnessMap` helper functions (same logic as `/insole/design` page)
- Compute designParams and hardnessMap from DB measurements in server component
- Dynamic import of `ProductInsolePreview` with `ssr: false` and loading skeleton
- Triple guard: `hasScanData && designParams && hardnessMap` before rendering
- All existing functionality preserved (image gallery, bundle pricing, size selector, cart button)
- **Commit:** `4172df2`

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. `npx tsc --noEmit` passes with zero errors
2. Product detail page source no longer contains the teaser card (blue info box) - VERIFIED
3. ProductInsolePreview component exists and imports InsolePreview3D - VERIFIED
4. Dynamic import uses ssr:false for R3F Canvas compatibility - VERIFIED

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 46b43e1 | feat(03-08): create compact ProductInsolePreview client component |
| 2 | 4172df2 | feat(03-08): embed InsolePreview3D on product detail page |

## Self-Check: PASSED
