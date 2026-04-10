---
phase: 06-segmentation-support-offline-store
plan: 03
subsystem: ui+api
tags: [offline-store, reservations, kakao-maps, salted-kit, public-api, zod, next-app-router]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "(main) layout, shadcn UI (Button/Input/Label), sonner toast"
  - phase: 05-admin-dashboard-order-management
    provides: "reservations table + admin createReservationSchema (now extracted to @/lib/reservations/schema)"
  - phase: 06-segmentation-support-offline-store P01
    provides: "/segment/athlete page already links to /stores/gangnam#kit-rental"
provides:
  - "Offline store introduction page at /stores/gangnam (5 sections per D-11)"
  - "STORE_GANGNAM seed constant + getKakaoStaticMapUrl helper"
  - "Shared reservations Zod schema at @/lib/reservations/schema"
  - "Public POST /api/reservations endpoint (no auth, past-date rejection)"
  - "PublicReservationForm client component with ?service= URL prefill"
  - "Athlete kit rental anchor #kit-rental reachable from Plan 01 segment page"
affects: [admin-reservations-dashboard (reads rows created by the form), future-marketing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public Zod schema extending an admin base schema with additional runtime guards (past-date rejection)"
    - "Shared lib/reservations/schema.ts pattern to keep public routes free of admin-auth imports and testable in isolation"
    - "Native <img> with eslint-disable comment for external Kakao static map (avoids next.config remotePatterns churn)"
    - "URL searchParams prefill via useSearchParams + useMemo in client form components"

key-files:
  created:
    - src/lib/stores/constants.ts
    - src/lib/stores/__tests__/constants.test.ts
    - src/lib/reservations/schema.ts
    - src/app/(main)/stores/gangnam/page.tsx
    - src/app/(main)/stores/gangnam/__tests__/page.test.tsx
    - src/components/stores/store-hero.tsx
    - src/components/stores/store-info-section.tsx
    - src/components/stores/store-location-map.tsx
    - src/components/stores/kit-service-section.tsx
    - src/components/stores/kit-rental-section.tsx
    - src/components/stores/public-reservation-form.tsx
    - src/components/stores/__tests__/public-reservation-form.test.tsx
    - src/app/api/reservations/route.ts
    - src/app/api/reservations/__tests__/route.test.ts
  modified:
    - src/app/api/admin/reservations/route.ts

key-decisions:
  - "Extracted createReservationSchema + status/service type constants to @/lib/reservations/schema so the public route doesn't pull @/lib/admin-auth (which transitively imports next-auth) into tests"
  - "Admin route re-exports ReservationStatus and ServiceType as type aliases for backward compatibility with existing admin UI callers"
  - "Public endpoint lives at /api/reservations (NOT /api/admin/reservations) — CONTEXT.md D-14 wording diverged; documented in the route's module doc"
  - "Public schema extends admin schema with a past-date refine; admins can still backfill via the admin route"
  - "StoreLocationMap falls back to '지도 준비 중' placeholder when KAKAO_MAP_KEY env var is unset — avoids hard-failing dev/preview without a Kakao key"
  - "Abstract gradient hero instead of a store photo (CONTEXT.md Claude Discretion — store photos in deferred list)"
  - "Service type mapping 일반 측정/SALTED 정밀 측정/운동선수 키트 대여 → measurement/consultation/pickup reuses the Phase 5 enum without a migration"
  - "Task 1 PublicReservationForm stub replaced atomically in Task 2; no circular dependency between store page and form"
  - "Native <img> for Kakao static map with scoped eslint-disable instead of configuring remotePatterns for a single external host"

patterns-established:
  - "Shared reservation Zod schema under @/lib/reservations/schema imported by both admin and public routes"
  - "Public POST-only route with Zod 400 issues array mirroring the admin error shape for consistent client UX"
  - "useSearchParams + useMemo to read query params once in client components without re-render churn"

requirements-completed: [OFFL-01, OFFL-02, OFFL-03, OFFL-04]

# Metrics
duration: 8min
completed: 2026-04-09
---

# Phase 06 Plan 03: Offline Store Page Summary

**Offline store introduction at /stores/gangnam composing hero + 위치 안내 + SALTED 스마트 인솔 키트 설명 + public reservation form + 1-2주 운동선수 키트 대여 section, plus a new public POST /api/reservations endpoint reusing the Phase 5 reservations table via a shared Zod schema module.**

## What Was Built

### Store page (/stores/gangnam)

Server component composing 6 sections in the D-11 locked order:

1. **StoreHero** — gradient abstract hero ("FitSole 강남점" + short SALTED tagline). Store photo deferred per CONTEXT.md.
2. **StoreInfoSection** — address (서울특별시 강남구 강남역 지하상가), hours (평일 10:00-21:00, 주말 10:00-20:00), phone, and `<StoreLocationMap />`.
3. **KitServiceSection** — 3 bullet cards explaining the SALTED smart insole kit (어떻게/무엇을/누구에게), CTA buttons to /segment/health and /segment/athlete.
4. **PublicReservationForm** — the D-14 client form (see below).
5. **KitRentalSection** — `id="kit-rental"` anchor, "1-2주" rental program description, CTA deep-linking to `/stores/gangnam?service=pickup#reservation-form`.
6. Footer link to `/faq#offline`.

Page metadata set (title, description).

### Constants + Kakao map helper (`src/lib/stores/constants.ts`)

`StoreInfo` interface, `STORE_GANGNAM` constant (D-12), and `getKakaoStaticMapUrl(info, w, h)` which returns a `dapi.kakao.com/v2/maps/staticmap?...` URL when `KAKAO_MAP_KEY` is set and `null` otherwise. `StoreLocationMap` renders either the `<img>` (with scoped eslint-disable for `no-img-element`) or a bordered fallback with `지도 준비 중` + address text.

### Shared reservations schema (`src/lib/reservations/schema.ts`)

New shared module exporting `createReservationSchema`, `RESERVATION_STATUS_VALUES`, `SERVICE_TYPE_VALUES`, and the `ReservationStatus`/`ServiceType` type aliases. Both the admin and public route now import from this file. The admin route re-exports the two type aliases for backward compatibility with existing dashboard code.

### Public POST /api/reservations

Unauthenticated endpoint:

- Parses JSON body, runs `publicReservationSchema` which extends the base schema with `reservationDate >= today` refinement (Korean error: "예약일은 오늘 이후여야 합니다.")
- Inserts into `reservations` with default `status='pending'`; `customerEmail` coerced to null when empty
- Returns `201 { reservation: { id, createdAt } }` on success
- Returns `400` with `issues[]` array on validation errors (same shape as admin route)
- Returns `500` generic message on DB failure (no stack leakage)
- No GET handler — listing stays admin-gated (T-06-12)

### PublicReservationForm (`src/components/stores/public-reservation-form.tsx`)

`"use client"` component:

- Wrapped in `<section id="reservation-form">` for anchor deep-linking
- Fields: 이름, 연락처, 이메일 (선택), 방문 희망 날짜 (`min={today}`), 시간대 (6 slots), 관심 서비스 (3 options mapped to enum), 추가 메시지
- Service type options: `일반 측정 → measurement`, `SALTED 정밀 측정 → consultation`, `운동선수 키트 대여 → pickup`
- `useSearchParams` prefills `serviceType` from `?service=pickup` so the kit-rental CTA lands on the right option
- POST to `/api/reservations`; on 201 → `toast.success(...)` + reset; on error → `toast.error(first issue message || generic)`
- Submit button disabled while pending

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] Extract reservations schema to shared module**

- **Found during:** Task 2 GREEN verification
- **Issue:** The plan said "import `createReservationSchema` from `@/app/api/admin/reservations/route`". Doing so transitively imports `@/lib/admin-auth` → `next-auth/lib/env.js` → `next/server`, which blows up under vitest with `Cannot find module 'next/server' imported from next-auth/lib/env.js`.
- **Fix:** Created `src/lib/reservations/schema.ts` as the single source of truth for the base Zod schema, status values, service type values, and type aliases. Both admin and public routes now import from it. Admin route re-exports `ReservationStatus`/`ServiceType` types so pre-existing consumers (dashboard page, reservation table, `[id]/route.ts`) keep compiling without edits.
- **Files modified:** `src/lib/reservations/schema.ts` (new), `src/app/api/admin/reservations/route.ts`, `src/app/api/reservations/route.ts`
- **Verification:** `tsc --noEmit` clean (only 2 pre-existing Payload errors), vitest 99/101 (only 2 pre-existing tab failures)
- **Committed in:** `74df6dc`

**2. [Rule 1 — Bug] Test regex matched multiple DOM nodes**

- **Found during:** Task 1 GREEN verification
- **Issue:** `screen.getByText(/1-2주/)` threw "multiple elements" because the kit-rental section has both `<strong>1-2주</strong>` inline and a "1-2주 대여" card heading.
- **Fix:** Changed to `getAllByText(/1-2주/).length >= 1` — the semantic assertion is "at least one mention", not "exactly one".
- **Committed in:** `68971ec` (same GREEN commit as Task 1 files)

### Scope notes

- **Build verification skipped** per deferred-items.md (`src/app/products/[slug]/page.tsx` has a Phase 3 Turbopack/ssr:false build issue unrelated to Plan 06-03). Authoritative signals are `tsc --noEmit` + `vitest run` as used by Plans 06-01 and 06-02.
- **2 pre-existing test failures** (`foot-profile-tab`, `order-history-tab`) remain from Phase 1 and are explicitly documented in deferred-items.md — not introduced by this plan.

## Verification

- `./node_modules/.bin/vitest run src/lib/stores src/app/\(main\)/stores src/app/api/reservations src/components/stores` → **25 passed, 0 failed** (12 Task 1 + 13 Task 2)
- Full `./node_modules/.bin/vitest run` → **99 passed, 2 failed** (the 2 failures are pre-existing, documented in deferred-items.md)
- `./node_modules/.bin/tsc --noEmit` → only 2 pre-existing errors in `.next/types/validator.ts` referencing `src/app/(payload)/api/**/route.ts` (Payload 3.x × Next 16 type mismatch, untouched in this plan)

## Threat Model Coverage

| Threat ID | Disposition | Implementation |
|-----------|-------------|----------------|
| T-06-10 (Tampering) | mitigate | Zod `publicReservationSchema` validates all fields, enforces `serviceType` enum, rejects past dates |
| T-06-11 (DoS) | mitigate | Field length caps inherited from base schema (name ≤100, phone ≤40, notes ≤1000); v1 has no rate limit — documented as a v2 concern |
| T-06-12 (Info Disclosure) | mitigate | Deliberately no GET handler on the public route; admin listing stays behind `requireAdmin()` |
| T-06-13 (Kakao key in URL) | accept | Kakao static map keys are referer-restricted client keys; KAKAO_MAP_KEY env var (not _SECRET) |
| T-06-14 (Tampering — label→enum) | mitigate | Frontend only POSTs enum values (measurement/consultation/pickup); API re-validates |
| T-06-15 (Spoofing — contact info) | accept | v1 doesn't verify phone/email; admin contacts customer before confirming |

## Success Criteria

- [x] **OFFL-01**: Offline store intro page with 강남역 지하상가 info ✓
- [x] **OFFL-02**: Smart insole (SALTED) kit measurement service description ✓
- [x] **OFFL-03**: Location map + operating hours + reservation/contact info ✓
- [x] **OFFL-04**: Athlete kit rental program info + #kit-rental anchor reachable from /segment/athlete ✓
- [x] **D-11**: Page composition order (hero / 위치 / kit service / 예약 / kit rental / FAQ) ✓
- [x] **D-12**: Store info (address, hours, phone) rendered verbatim ✓
- [x] **D-13**: Kakao Maps static image + fallback ✓
- [x] **D-14**: 3-option reservation form posting to reservation API ✓
- [x] **D-15**: 1-2주 kit rental program section with anchor ✓

## Self-Check: PASSED

Files created:
- FOUND: src/lib/stores/constants.ts
- FOUND: src/lib/reservations/schema.ts
- FOUND: src/app/(main)/stores/gangnam/page.tsx
- FOUND: src/components/stores/store-hero.tsx
- FOUND: src/components/stores/store-info-section.tsx
- FOUND: src/components/stores/store-location-map.tsx
- FOUND: src/components/stores/kit-service-section.tsx
- FOUND: src/components/stores/kit-rental-section.tsx
- FOUND: src/components/stores/public-reservation-form.tsx
- FOUND: src/app/api/reservations/route.ts

Commits:
- FOUND: 27a285e test(06-03): RED store constants/page/kakao
- FOUND: 68971ec feat(06-03): constants + page + section components
- FOUND: e27f475 test(06-03): RED public reservations API + form
- FOUND: 74df6dc feat(06-03): public POST /api/reservations + PublicReservationForm
