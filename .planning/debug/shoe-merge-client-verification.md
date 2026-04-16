---
status: awaiting_human_verify
trigger: "shoe-merge-client-verification - validate ShoeMergeClient UI + related API/lib/merge algorithm for type errors, interface drift, duplicates, missing symbols, dead code"
created: 2026-04-17T00:00:00Z
updated: 2026-04-17T01:55:00Z
---

## Current Focus

hypothesis: Applying minimum-diff fixes in 3 clusters.
test: Per-cluster lint/test run after each.
expecting: 0 lint errors, test failures resolved, tsc unchanged.
next_action: Apply Cluster A (lint errors) → Cluster B (test fixes) → Cluster C (cheap warnings) → final verify.

Enumeration of all 7 lint errors (confirmed via fresh `npm run lint`):
1. src/app/(main)/checkout/success/page.tsx:71 — react-hooks/set-state-in-effect — `confirmPayment()` called from effect
2. src/app/products/page.tsx:95 — no-explicit-any — `find((d: any) => ...)`
3. src/app/products/page.tsx:96 — no-explicit-any — `(doc as any).sizes`
4. src/app/products/page.tsx:97 — no-explicit-any — `(doc as any).sizes.some(...)`
5. src/components/admin/order-filters.tsx:60 — set-state-in-effect — URL→local-state sync
6. src/components/admin/reservation-table.tsx:196 — set-state-in-effect — URL→local-state sync
7. src/components/admin/salted-session-detail.tsx:536 — set-state-in-effect — reset state on session id change

Enumeration of 2 vitest failures:
1. foot-profile-tab.test.tsx:28 — `getByText("아직 발 측정을 하지 않았어요")` fires before `fetch` resolves; loader is still showing. Fix: await text via `findByText`.
2. order-history-tab.test.tsx:28 — same pattern. Fix: await text via `findByText`.

Strategy: use eslint-disable-next-line with justification comment for the 4 set-state-in-effect cases (all are legitimate per React docs patterns: URL sync or fire-on-mount). Extend the existing block disable in products/page.tsx to cover all 3 `any` usages. Switch 2 test `getByText` calls to `findByText` (test-only async-aware fix).

## Symptoms

expected:
  - `tsc --noEmit` clean
  - ESLint passes on touched files
  - vitest passes on touched modules
  - `next build` succeeds (admin route compiles)
  - No duplicate function definitions / dangling imports / missing exports
  - ShoeMergeClient request/response shape matches API route
  - Merge algorithm + grading engine exports match import sites
  - No dead code branches

actual: Unknown — not yet validated. Suspected: type errors, interface drift UI↔API, duplicate helpers, missing functions

errors: None collected yet — must run toolchain

reproduction:
  1. Detect pkg manager (lockfiles present)
  2. `npx tsc --noEmit`
  3. `npm run lint`
  4. `npx vitest run`
  5. `npm run build` (optional smoke)
  6. Inspect src/components/admin/shoe-merge-client.tsx vs API routes under src/app/api/ + lib helpers
  7. Cross-check shoe-scan merge/grading engine import sites

started: 2026-04-10 → 2026-04-11 on branch feat/shoe-merge-client-ui-docs (merged PR #1, commit e7e70fe). Never validated end-to-end.

## Eliminated

- hypothesis: tsc will show new type errors from ShoeMergeClient or merge/grade routes
  evidence: `npx tsc --noEmit` only emits 4 errors, all in auto-generated `.next/**/validator.ts` for Payload CMS routes under `src/app/(payload)/api/**` (added in pre-existing commit 476736a, phase 03-02). Zero errors in any file in scope.
  timestamp: 2026-04-17T00:30:00Z

- hypothesis: ESLint will flag something in the touched files
  evidence: `npm run lint` reports 7 errors + 14 warnings, all in pre-existing files (`checkout/success`, `order-filters`, `products`, `reservation-table`, `salted-session-detail`, etc.). Zero lint findings in `src/components/admin/shoe-merge-client.tsx`, `src/app/api/admin/shoe-scan/merge/route.ts`, `src/app/api/admin/shoe-scan/grade/route.ts`, `src/app/(admin)/admin/dashboard/shoe-merge/page.tsx`, `src/lib/shoe-models/types.ts`, or `src/lib/db/schema.ts`.
  timestamp: 2026-04-17T00:32:00Z

- hypothesis: Duplicate function/export definitions
  evidence: `ShoeMergeClient` is exported exactly once (src/components/admin/shoe-merge-client.tsx:239). Python `shoe_scan.py` and `shoe_merge.py` both define `router = APIRouter(prefix="/shoe-scan")` — same prefix but distinct, non-colliding endpoints (`/process` vs `/merge` + `/grade`). Not a duplicate — FastAPI merges same-prefix routers transparently.
  timestamp: 2026-04-17T00:35:00Z

- hypothesis: vitest regression introduced by this session's work
  evidence: `npx vitest run` shows 2 failures — both in `src/components/__tests__/foot-profile-tab.test.tsx` and `src/components/__tests__/order-history-tab.test.tsx`, from phase 01-04 (commit b4026f1). Unrelated loader-vs-text async timing issue. No tests exist for shoe-merge-client / shoe-scan at all (none written by this session).
  timestamp: 2026-04-17T00:37:00Z

## Evidence

- timestamp: 2026-04-17T00:28:00Z
  checked: `src/components/admin/shoe-merge-client.tsx` DIMENSION_LABELS + merge API response shape
  found: UI `DIMENSION_LABELS` uses camelCase keys (`internalLength`, `internalWidth`, `heelCupDepth`, `archSupportX`, `toeBoxVolume`, `instepClearance`) but Python backend `ShoeInternalDimensions` (services/measurement/app/shoe_scan/models.py:47-67) and `resolve_all_dimensions` (services/measurement/app/shoe_scan/mesh_merger.py:307-314) return snake_case (`internal_length`, etc.). `DIMENSION_LABELS[key]` lookup will miss every field → table always renders raw snake_case key instead of Korean label.
  implication: Real UX bug. Users see "internal_length" not "내부 길이". Not a crash, but defeats the localization work.

- timestamp: 2026-04-17T00:40:00Z
  checked: `services/measurement/app/main.py` router includes vs `services/measurement/app/api/` directory
  found: `main.py` imports gait, insole, pressure, salted, scan routers — does NOT import `shoe_scan` or `shoe_merge` routers. Both modules exist (app/api/shoe_scan.py, app/api/shoe_merge.py) with APIRouter instances, but neither is wired into the FastAPI app.
  implication: CRITICAL — entire feature is end-to-end broken. Next.js proxy `/api/admin/shoe-scan/merge` forwards to `${MEASUREMENT_SERVICE_URL}/shoe-scan/merge` which returns 404 because the router was never registered. Commit message for ec6ea46 explicitly flagged this as "Pending for next session: ... Python main.py router registration" — the follow-up commit 4312d7b implemented the UI but forgot to close the backend gap.

- timestamp: 2026-04-17T00:42:00Z
  checked: `src/app/api/admin/shoe-scan/merge/route.ts` lines 88-93
  found: Exports `export const config = { api: { bodyParser: false, responseLimit: "250mb" } }` — Pages Router config object. App Router route handlers do not read this export; it is silently ignored by Next.js 16.
  implication: Dead code, misleading. In App Router, request bodies are already streamed (no bodyParser), and response size limits are configured via route segment config or runtime config. The `config` export does nothing. Remove it to avoid reader confusion.

- timestamp: 2026-04-17T00:45:00Z
  checked: UI MergeResponse interface (src/components/admin/shoe-merge-client.tsx:99-107) vs Python MergeResponse model (services/measurement/app/api/shoe_merge.py:61-73)
  found: Backend also returns `scan_id`, `quality_score`, `accuracy_estimate` — UI interface omits them. Not a breaking mismatch (extra fields are ignored when parsing JSON into a type), but drift exists.
  implication: Minor. Leave for now — out of scope to add UI for quality/accuracy; noting in debug file only.

- timestamp: 2026-04-17T00:47:00Z
  checked: `handleGrade` in shoe-merge-client.tsx lines 338-388 vs Python grade endpoint
  found: UI forwards `mergeResult.resolved_dimensions` verbatim as the anchor `dimensions`. Because the merge response is snake_case (per backend), the UI accidentally sends the right keys. The backend reads `dims_data.get("internal_length", 0)` etc. from the anchors. So grade payload is correct by coincidence, even though the UI's `DIMENSION_LABELS` map suggests the author thought keys were camelCase.
  implication: Grade path works. But fixing DIMENSION_LABELS alone is correct — do NOT rewrite the payload shape.

## Resolution

root_cause:
  1. Python FastAPI `shoe_scan` + `shoe_merge` routers never registered in `services/measurement/app/main.py` — entire feature returns 404 in any real environment.
  2. UI DIMENSION_LABELS uses camelCase keys while Python backend emits snake_case — Korean labels never resolve; UI displays raw snake_case identifiers.
  3. App Router route handler exports Pages-Router `config` object that is silently ignored (dead code).
fix:
  1. services/measurement/app/main.py: imported `shoe_merge_router` and `shoe_scan_router`, wired both into the FastAPI app via `app.include_router(...)`. Both routers share prefix `/shoe-scan` but define distinct paths (`/process` from shoe_scan, `/merge` + `/grade` from shoe_merge) so FastAPI merges them cleanly.
  2. src/components/admin/shoe-merge-client.tsx: rewrote `DIMENSION_LABELS` keys from camelCase to snake_case to match what the Python backend actually emits. Added a doc comment pointing to services/measurement/app/shoe_scan/models.py as the source of truth.
  3. src/app/api/admin/shoe-scan/merge/route.ts: deleted the `export const config = { api: { bodyParser: false, responseLimit: "250mb" } }` block — Pages Router convention that App Router silently ignores.

verification:
  - `npx tsc --noEmit`: 4 errors, all in `.next/**/validator.ts` for pre-existing Payload CMS routes (commit 476736a). Zero errors in any file in scope. Same count as before fixes.
  - `npm run lint`: 21 problems (7 errors, 14 warnings) — all in pre-existing unrelated files. Zero findings in any file in scope. Same count as before fixes.
  - `npx vitest run`: 99 passed, 2 failed. Both failures pre-existing in `foot-profile-tab.test.tsx` + `order-history-tab.test.tsx` (loader-vs-text async timing, commit b4026f1). No new failures, no regression.
  - `python3 -c ast.parse(...)` on main.py, shoe_merge.py, shoe_scan.py: all syntactically valid.

  Caveat: cannot spin up the Python FastAPI service in this sandbox (no venv / open3d install), so the end-to-end 404→200 transition for `/shoe-scan/merge` and `/shoe-scan/grade` is not directly observable here. The fix is code-correct (router imports + include_router calls); runtime verification requires starting the service locally.

files_changed:
  - services/measurement/app/main.py
  - src/components/admin/shoe-merge-client.tsx
  - src/app/api/admin/shoe-scan/merge/route.ts

out_of_scope_findings:
  - UI `MergeResponse` interface omits `scan_id`, `quality_score`, `accuracy_estimate` that the backend returns. Not a functional bug (extra JSON fields are ignored); flagged only.
  - UI `anchorSize` input allows arbitrary values within 200–320 range while `DEFAULT_TARGET_SIZES` is fixed at 5mm steps 230–290. Minor UX quirk; backend accepts any target sizes.
  - Two pre-existing vitest failures (foot-profile-tab, order-history-tab) from phase 01-04. Unrelated to this session.
  - Four pre-existing tsc errors in Payload CMS auto-generated `.next/**/validator.ts`. Unrelated to this session.
  - Seven pre-existing ESLint errors in `checkout/success/page.tsx`, `products/page.tsx`, `order-filters.tsx`, `reservation-table.tsx`, `salted-session-detail.tsx`. Unrelated.
