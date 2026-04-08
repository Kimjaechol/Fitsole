---
phase: 01-foundation-accounts
plan: 01
subsystem: auth
tags: [nextjs, drizzle, next-auth, bcryptjs, zod, vitest, pretendard, shadcn-ui, neon-postgres]

requires: []
provides:
  - Next.js 16 project scaffold with TypeScript, Tailwind v4, App Router
  - Drizzle ORM schema for Auth.js tables (users, accounts, sessions, verificationTokens)
  - Auth.js v5 configuration with Credentials provider and JWT strategy
  - Signup API route with Zod validation and bcrypt password hashing
  - Zod validation schemas for login, signup, and password reset
  - Middleware route protection for /mypage and /api/profile
  - Vitest test infrastructure with 9 passing validation tests
  - shadcn/ui component library (button, input, card, tabs, label, separator, avatar, sonner)
  - Pretendard variable font for Korean language support
affects: [01-02, 01-03, 01-04, 02-scanning, 03-products]

tech-stack:
  added: [next@16.2.2, drizzle-orm, @neondatabase/serverless, next-auth@5.0.0-beta.30, @auth/drizzle-adapter, bcryptjs, zod, react-hook-form, @hookform/resolvers, zustand, framer-motion, resend, lucide-react, vitest, @vitejs/plugin-react, shadcn-ui, clsx, tailwind-merge, class-variance-authority]
  patterns: [auth-credentials-jwt, drizzle-neon-schema, zod-validation-korean, next-font-local]

key-files:
  created:
    - src/lib/db/schema.ts
    - src/lib/db/index.ts
    - src/lib/auth.ts
    - src/app/api/auth/[...nextauth]/route.ts
    - src/app/api/auth/signup/route.ts
    - src/lib/validators/auth.ts
    - src/middleware.ts
    - vitest.config.ts
    - src/lib/__tests__/auth-signup.test.ts
    - drizzle.config.ts
    - src/app/layout.tsx
    - src/app/globals.css
  modified: []

key-decisions:
  - "Used next/font/local for Pretendard instead of CDN for optimal CLS performance"
  - "Pinned next-auth to 5.0.0-beta.30 for stability over @latest tag"
  - "Used bcryptjs (pure JS) over argon2 (native) for serverless compatibility"

patterns-established:
  - "Auth pattern: NextAuth + Credentials + JWT strategy + DrizzleAdapter"
  - "Validation pattern: Zod schemas with Korean error messages exported from validators/"
  - "DB pattern: Drizzle ORM + Neon serverless via neon-http driver"
  - "Font pattern: Pretendard variable font via next/font/local with --font-pretendard CSS variable"
  - "Color system: CSS custom properties in globals.css (--accent, --secondary, --destructive, etc.)"

requirements-completed: [ACCT-01, ACCT-02, ACCT-05]

duration: 19min
completed: 2026-04-09
---

# Phase 01 Plan 01: Project Scaffold & Auth Backend Summary

**Next.js 16 scaffold with Drizzle schema, Auth.js v5 Credentials+JWT, signup API with bcrypt hashing, Zod Korean validators, and Vitest test infrastructure**

## Performance

- **Duration:** 19 min
- **Started:** 2026-04-08T17:21:11Z
- **Completed:** 2026-04-08T17:41:09Z
- **Tasks:** 2
- **Files modified:** 39

## Accomplishments
- Next.js 16.2 project compiles and builds successfully with Turbopack
- Drizzle schema defines users, accounts, sessions, verificationTokens with custom hashedPassword field
- Auth.js v5 configured with Credentials provider, JWT strategy, and DrizzleAdapter
- Signup API route validates input (Zod), checks duplicate emails, hashes passwords (bcrypt cost 10)
- 9 Vitest unit tests pass for all auth validation schemas (login, signup, resetPassword)
- Pretendard variable font loaded via next/font/local with lang="ko"
- shadcn/ui initialized with 8 components (button, input, card, tabs, label, separator, avatar, sonner)
- Design system color variables configured per UI-SPEC

## Task Commits

1. **Task 1: Scaffold Next.js project with Pretendard font, Tailwind, shadcn/ui, and database connection** - `264f677` (feat)
2. **Task 2: Configure Auth.js v5 with Credentials provider, signup route, validators, middleware, and test infrastructure** - `b4a4de4` (feat)

## Files Created/Modified
- `src/lib/db/schema.ts` - Drizzle table schemas for Auth.js + hashedPassword
- `src/lib/db/index.ts` - Drizzle + Neon serverless connection
- `src/lib/auth.ts` - Auth.js v5 config with Credentials, JWT, DrizzleAdapter
- `src/app/api/auth/[...nextauth]/route.ts` - Auth.js API route handler
- `src/app/api/auth/signup/route.ts` - User registration endpoint
- `src/lib/validators/auth.ts` - Zod schemas for login, signup, resetPassword
- `src/middleware.ts` - Route protection for /mypage, /api/profile
- `vitest.config.ts` - Vitest with jsdom, React plugin, @ alias
- `src/lib/__tests__/auth-signup.test.ts` - 9 unit tests for validation schemas
- `drizzle.config.ts` - Drizzle Kit migration config
- `src/app/layout.tsx` - Root layout with Pretendard font, lang="ko"
- `src/app/globals.css` - Tailwind v4 CSS-first config with design system colors
- `src/app/page.tsx` - Korean landing page placeholder
- `src/lib/utils.ts` - shadcn cn() utility
- `.env.example` - Environment variable documentation
- `components.json` - shadcn/ui configuration

## Decisions Made
- Used next/font/local for Pretendard instead of CDN for optimal CLS prevention and self-hosting control
- Pinned next-auth to 5.0.0-beta.30 exactly (per RESEARCH.md recommendation) rather than @latest
- Used bcryptjs (pure JS) over argon2 for serverless compatibility on Vercel
- Added try/catch with generic Korean error message in signup route for unhandled errors (Rule 2 - error handling)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing shadcn/ui dependencies**
- **Found during:** Task 1 (shadcn/ui setup)
- **Issue:** shadcn init via manual components.json didn't install peer dependencies (class-variance-authority, @radix-ui/react-slot, clsx, tailwind-merge, and Radix UI primitives)
- **Fix:** Installed missing packages: class-variance-authority, @radix-ui/react-slot, @radix-ui/react-label, @radix-ui/react-separator, @radix-ui/react-avatar, @radix-ui/react-tabs, clsx, tailwind-merge
- **Files modified:** package.json, package-lock.json
- **Verification:** `npx next build` compiles successfully
- **Committed in:** 264f677 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added error handling to signup route**
- **Found during:** Task 2 (signup route implementation)
- **Issue:** Plan's signup route pattern had no try/catch for unhandled errors (DB connection failures, etc.)
- **Fix:** Wrapped handler in try/catch returning 500 with Korean error message
- **Files modified:** src/app/api/auth/signup/route.ts
- **Verification:** Build passes, error path returns proper JSON response
- **Committed in:** b4a4de4 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
- `create-next-app` refused to run in non-empty directory (had .planning/ and CLAUDE.md). Resolved by scaffolding in /tmp and copying files back via rsync.
- Pretendard font download from first CDN URL returned redirect text (109 bytes). Used corrected path with `/packages/pretendard/dist/` prefix for successful 2MB download.
- `npx shadcn@latest init --yes` required interactive input for component library selection. Resolved by creating components.json manually.

## User Setup Required
None - no external service configuration required for development. Database (Neon Postgres) and email (Resend) require account setup before production use; placeholder values in .env.local are sufficient for build and test.

## Threat Surface Scan
No new threat surface beyond what is documented in the plan's threat model. All mitigations implemented:
- T-01-01: Zod validation + bcrypt hash cost 10 + unique email constraint
- T-01-02: bcrypt.compare in authorize(), generic error (returns null, no user enumeration)
- T-01-03: JWT via Auth.js httpOnly cookies, token contains only user id
- T-01-04: Auth.js built-in CSRF protection
- T-01-05: middleware.ts enforces auth on /mypage and /api/profile

## Next Phase Readiness
- Auth backend complete, ready for UI implementation (Plan 01-02: auth forms, landing page)
- Drizzle schema ready for database push once Neon account is configured
- shadcn/ui components available for all Phase 1 UI plans
- Vitest infrastructure ready for additional test files

## Self-Check: PASSED

All 13 key files verified present. Both task commits (264f677, b4a4de4) verified in git log.

---
*Phase: 01-foundation-accounts*
*Completed: 2026-04-09*
