# Phase 06 — Deferred Items

Issues discovered during execution that are out of scope for the current plan.

## Pre-existing test failures (not introduced by 06-01)

- `src/components/__tests__/foot-profile-tab.test.tsx > renders empty state title`
  - Status: **pre-existing** (verified via `git stash` regression check on 2026-04-10)
  - Symptom: cannot find `"아직 주문 내역이 없어요"` (test appears to target the wrong tab fixture)
  - Scope: belongs to Phase 01 UI tab tests
  - Recommendation: file as a Phase 1 follow-up; not blocking Phase 06

- `src/components/__tests__/order-history-tab.test.tsx > renders empty state title`
  - Status: **pre-existing** (same verification)
  - Symptom: empty-state string mismatch with the current tab implementation
  - Scope: Phase 01 UI tab tests
  - Recommendation: same as above

## Pre-existing build failure (not introduced by 06-01)

- `src/app/products/[slug]/page.tsx:15` — Next.js 16 Turbopack build error
  - Error: `` `ssr: false` is not allowed with `next/dynamic` in Server Components ``
  - Introduced by commit `4172df2` (feat(03-08): embed InsolePreview3D on product detail page)
  - Scope: Phase 03 product detail page — unrelated to Phase 06 segmentation work
  - Verified pre-existing: the file has not been touched in Phase 06 and `git blame` / history confirm last modification was Phase 03-08
  - Impact on 06-01 verification: `next build` cannot complete end-to-end, so the plan's `pnpm build` verify step is deferred. Typecheck (`npx tsc --noEmit`) and `npx vitest run` both pass for all Phase 06 files — those are the authoritative signal for 06-01 correctness
  - Recommendation: wrap the `dynamic(...)` call inside a small client-component shim in Phase 03 follow-up
