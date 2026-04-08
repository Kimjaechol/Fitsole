# Phase 1: Foundation & Accounts - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

App shell, authentication, user profile, mobile-first responsive UI, Korean-language landing page. Users can create accounts, log in, manage profile with foot scan placeholders and order history empty states.

</domain>

<decisions>
## Implementation Decisions

### Landing Page & Brand
- **D-01:** Hero section is CTA-centered — "내 발에 맞는 신발 찾기" button prominently centered, immediately communicating custom insole value proposition
- **D-02:** Design tone is scientific/professional — clean white base, blue/green accent colors, conveying medical/health expertise and trust
- **D-03:** Landing page has 4 concise sections: Hero (CTA) → Core Value (3-column) → Measurement Process Preview → Bottom CTA
- **D-04:** Font: Pretendard — optimized for Korean, clean sans-serif, commercially free, fits scientific tone

### Authentication & Session
- **D-05:** Email/password authentication via NextAuth.js — social login (Kakao/Naver) deferred to v2
- **D-06:** Session management via JWT + httpOnly cookies — NextAuth default, secure against XSS
- **D-07:** Email verification not required for v1 — users can use the service immediately after signup
- **D-08:** Password reset via email link — standard pattern, built into NextAuth

### Navigation & Profile Layout
- **D-09:** Mobile navigation: bottom tab bar with 4 tabs (Home/Catalog/Scan/MyPage) — app-like feel, thumb accessibility
- **D-10:** Profile page: tab-based layout with 3 tabs (내 정보 / 발 프로필 / 주문 내역)
- **D-11:** Empty states: illustration + CTA button (e.g., "아직 발 측정을 하지 않았어요" + Start Measurement button)
- **D-12:** Desktop layout: max-width 1280px centered — same structure as mobile, center-aligned on wider screens

### Claude's Discretion
- Database schema design and ORM choice
- API route structure
- Component library selection (shadcn/ui, Radix, etc.)
- State management approach
- Email service provider for password reset

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, core value, constraints
- `.planning/REQUIREMENTS.md` — ACCT-01~05, UIUX-01~03 requirements for this phase
- `.planning/research/STACK.md` — Recommended stack: Next.js 16.2, Payload CMS 3.x, Drizzle ORM, Neon Postgres, Toss Payments
- `.planning/research/ARCHITECTURE.md` — Component boundaries and data flow
- `.planning/research/PITFALLS.md` — Biometric data privacy (PIPA), regulatory decisions needed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project

### Established Patterns
- None — this phase establishes the foundational patterns

### Integration Points
- This phase creates the app shell that all subsequent phases build upon
- Auth system must support foot scan profile storage (Phase 2)
- Navigation must accommodate scan flow entry point (Phase 2)
- Product catalog pages will plug into the navigation structure (Phase 3)

</code_context>

<specifics>
## Specific Ideas

- Bottom tab bar should include a "Scan" tab as a prominent entry point for the foot measurement flow (Phase 2)
- Landing page measurement process preview section should show a simplified 3-step flow visual (scan → design → deliver)
- Korean-language content throughout — no English fallbacks in user-facing UI

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-accounts*
*Context gathered: 2026-04-09*
