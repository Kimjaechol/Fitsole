---
phase: 1
slug: foundation-accounts
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-09
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (Plan 01-01 Task 2 installs) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01 | 1 | ACCT-01, ACCT-02 | T-01-01 | Drizzle schema with hashed password field, no plaintext | build | `npx next build 2>&1 \| tail -20` | package.json, src/lib/db/schema.ts, src/app/layout.tsx | ⬜ pending |
| 01-01-T2 | 01 | 1 | ACCT-01, ACCT-02, ACCT-05 | T-01-02, T-01-03, T-01-05 | bcrypt hash cost 10, JWT httpOnly, middleware route protection | unit | `npx vitest run src/lib/__tests__/auth-signup.test.ts --reporter=verbose 2>&1 \| tail -20` | src/lib/auth.ts, src/lib/validators/auth.ts, src/middleware.ts, vitest.config.ts | ⬜ pending |
| 01-02-T1 | 02 | 2 | UIUX-01 | T-02-01 | No sensitive data in navigation | build | `npx next build 2>&1 \| tail -10` | src/components/layout/bottom-tab-bar.tsx, src/components/layout/desktop-nav.tsx, src/app/(main)/layout.tsx | ⬜ pending |
| 01-02-T2 | 02 | 2 | UIUX-02, UIUX-03 | T-02-01 | Public marketing copy only | unit | `npx vitest run src/components/__tests__/landing-page.test.tsx --reporter=verbose 2>&1 \| tail -20` | src/components/landing/hero-section.tsx, src/app/(main)/page.tsx | ⬜ pending |
| 01-03-T1 | 03 | 2 | ACCT-01, ACCT-02 | T-03-03 | Zod validation on all form inputs, no raw submission | build | `npx next build 2>&1 \| tail -10` | src/components/auth/login-form.tsx, src/app/(auth)/layout.tsx | ⬜ pending |
| 01-03-T2 | 03 | 2 | ACCT-01, ACCT-02 | T-03-01, T-03-02 | Reset endpoint always returns 200 (no user enumeration), crypto.randomUUID token | build | `npx next build 2>&1 \| tail -10` | src/components/auth/signup-form.tsx, src/app/api/auth/reset-password/route.ts | ⬜ pending |
| 01-04-T1 | 04 | 3 | ACCT-03, ACCT-04, ACCT-05 | T-04-01, T-04-02 | Server-side auth() check, session-only data display, reorder CTA disabled until scan data exists | unit | `npx vitest run --reporter=verbose 2>&1 \| tail -30` | src/app/(main)/mypage/page.tsx, src/components/profile/order-history-tab.tsx | ⬜ pending |
| 01-04-T2 | 04 | 3 | ACCT-01 | T-04-01 | Schema push over TLS connection | integration | `npx drizzle-kit push 2>&1 \| tail -10` | drizzle.config.ts | ⬜ pending |
| 01-04-T3 | 04 | 3 | ACCT-01~05, UIUX-01~03 | all | Full E2E human verification of all flows | manual | Human visual and functional verification | N/A | ⬜ pending |

---

## Wave 0 Requirements

- [x] `vitest` + `@testing-library/react` — installed in Plan 01-01 Task 1
- [x] `vitest.config.ts` — created in Plan 01-01 Task 2
- [x] Test stubs for auth flows (ACCT-01, ACCT-02) — auth-signup.test.ts in Plan 01-01 Task 2

*Wave 0 is satisfied by Plan 01-01 which scaffolds test infrastructure before any other plan runs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile-first responsive layout | UIUX-01 | Visual rendering requires browser | Open on smartphone viewport, verify bottom tab bar and layout |
| Korean language display | UIUX-02 | Requires visual verification | Check all UI text displays in Korean with Pretendard font |
| Landing page value proposition | UIUX-03 | Subjective content quality | Review CTA copy, 4 sections, and visual hierarchy |
| Reorder CTA disabled state | ACCT-05 | Visual state verification | Verify button appears disabled with helper text |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
