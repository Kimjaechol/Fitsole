# Project Research Summary

**Project:** FitSole - Custom Insole Shoe E-Commerce Platform
**Domain:** Custom manufacturing e-commerce with smartphone-based biometric measurement
**Researched:** 2026-04-09
**Confidence:** MEDIUM

## Executive Summary

FitSole is a custom insole + shoe e-commerce platform where users measure their feet via smartphone camera, receive an algorithmically-designed custom insole, and purchase it bundled with curated shoes. This product sits at the intersection of three domains: e-commerce (well-understood), computer vision measurement (emerging, medium-risk), and custom manufacturing integration (high-complexity, external dependency). The shoe+insole bundle model is genuinely differentiated -- every competitor (Upstep, Wiivv, Bilt Labs) sells insoles only.

The recommended approach is a Next.js 16 + Payload CMS monolith for the web platform paired with a Python FastAPI microservice for the insole design engine. Browser-side ML (MediaPipe + TensorFlow.js) provides real-time scanning guidance, while server-side processing handles actual measurement extraction. Neon Postgres for data, Toss Payments for Korean market payments, and React Three Fiber for 3D insole previews round out the stack. The architecture follows a clear separation: web app handles storefront and scanning UX, Python service handles scientific computation, and a factory adapter layer isolates manufacturing partner integration.

The dominant risk is measurement accuracy in real-world conditions. Lab-tested smartphone scanning achieves 1-2mm precision, but real users scanning on carpet in dim bedrooms will produce worse results. If measurements are bad, insoles do not fit, returns destroy margins on non-recoverable custom products, and the business fails. Mitigation requires: reference-object calibration (A4 paper), multi-level validation (client-side quality checks, server-side anatomical plausibility, user confirmation), and a re-make guarantee instead of refund-based returns. The scanning step is the highest-friction point in the funnel and must receive disproportionate engineering and UX attention.

## Key Findings

### Recommended Stack

The stack is a hybrid: Next.js 16 with TypeScript for the web platform, Python FastAPI for scientific computation. This split is justified -- JavaScript lacks the scientific computing libraries (NumPy, SciPy, trimesh) needed for parametric insole design, while Python is unsuitable for building a modern e-commerce frontend. See STACK.md for full details.

**Core technologies:**
- **Next.js 16.2 + React 19.2:** Full-stack framework with SSR/SSG for SEO, App Router for the storefront, Turbopack for fast dev builds
- **Payload CMS 3.x:** Embeds directly into the Next.js app folder; handles product catalog, admin UI, file uploads without external SaaS
- **Neon Postgres + Drizzle ORM:** Serverless Postgres with scale-to-zero for cost control; Drizzle's 7.4KB bundle avoids Prisma's cold start penalty
- **Toss Payments:** Korean-first payment gateway supporting KakaoPay, NaverPay, bank transfer -- essential for the Korean market
- **MediaPipe + TensorFlow.js + OpenCV.js:** Browser-side ML for real-time scan guidance; runs on-device, no server GPU needed
- **React Three Fiber + Three.js:** 3D insole preview and product visualization
- **Python FastAPI:** Insole design engine using NumPy, SciPy, trimesh for parametric 3D geometry
- **Auth.js v5:** Self-hosted auth with Kakao/Naver OAuth for Korean market
- **Zustand + TanStack Query:** Lightweight client state (scan workflow) and server state (product data caching)

### Expected Features

**Must have (table stakes):**
- Guided smartphone foot scanning with real-time quality feedback
- Basic insole design algorithm (parametric templates by arch type + foot size)
- Shoe catalog (10-20 SKUs across 3 categories) with filtering
- Shoe + insole bundle ordering with clear value proposition
- Shopping cart, checkout, Toss Payments integration
- User accounts with foot profile storage (left/right asymmetry support)
- Order status tracking (manual updates acceptable for MVP)
- Mobile-native scanning UX (not just responsive -- built for phone camera interaction)
- 90-day satisfaction guarantee with free re-make option

**Should have (differentiators):**
- AI-enhanced insole design with more personalization parameters
- Customer segment-specific UX flows (foot health / comfort / athlete)
- 3D insole customization preview before purchase
- Size recommendation engine mapping scan data to shoe sizes
- Factory API integration for automated order dispatch
- Scan quality scoring with automated re-scan prompts
- Reorder flow for returning customers

**Defer (v2+):**
- Expanded shoe catalog (50+ SKUs)
- Foot health education content/blog
- Manufacturing partner dashboard
- Multi-language support
- Foot condition tracking over time
- AR shoe try-on (anti-feature: enormous complexity, poor ROI for insole business)
- Real-time gait analysis (anti-feature: unreliable via smartphone)
- Subscription/auto-reorder (anti-feature: insoles last 1-3 years)

### Architecture Approach

The system follows a layered architecture with three main tiers: a mobile-web client layer (scanning, storefront, order tracking), a backend services layer (measurement processing, insole design engine, product catalog, order management, factory adapter), and a data layer (Postgres, object storage for 3D files). The critical architectural pattern is the parametric insole generation pipeline: foot measurements feed into parameter mapping, which selects and adjusts base templates, optimizes pressure distribution, and exports factory-ready 3D models. The factory adapter uses the Adapter pattern to isolate manufacturing partner specifics from core business logic. See ARCHITECTURE.md for full component diagram and data flows.

**Major components:**
1. **Foot Scan Module (browser):** Camera capture, client-side ML guidance, image quality validation
2. **Measurement Service (Python):** Server-side CV pipeline for dimension extraction from uploaded images
3. **Insole Design Engine (Python):** Parametric 3D model generation from measurement data
4. **Storefront (Next.js + Payload):** Product catalog, cart, checkout, user accounts, admin
5. **Order Management Service:** Order state machine with manufacturing-specific states (design_generated, sent_to_factory, in_production, quality_check)
6. **Factory Adapter:** Isolated integration layer per manufacturing partner

### Critical Pitfalls

1. **False measurement accuracy confidence** -- Vendor claims of sub-millimeter accuracy are unrealistic in real conditions. Validate against 50+ ground-truth measurements before launch. Build multi-level validation (client quality checks, server plausibility checks, user confirmation). Budget for 10-15% re-make rate.

2. **Scan UX friction causing fatal drop-off** -- FitMyFoot competitor reviews cite crashes and confusion during scanning. The scan step has the highest friction in the funnel. Implement real-time guidance ("move phone lower", "lighting too dim"), allow partial re-capture, and provide manual measurement fallback. Target 75%+ scan completion rate.

3. **Custom product returns destroying margins** -- Footwear has 18% average return rate; custom insoles cannot be restocked. Design a "fit guarantee" (free re-make) instead of refund policy. Price the re-make rate into unit economics from day one.

4. **Manufacturing integration is not a simple API call** -- Software teams think REST/JSON; factories think STL files and production batches. Visit factory physically, define exact file format pipeline, build async order queue with manual override capability. Dedicate an entire phase to this.

5. **Shoe-insole incompatibility** -- Insole designed without considering target shoe's internal geometry will not fit. Require shoe selection BEFORE insole design. Build compatibility matrix with internal shoe dimensions for every listed model.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation + Scanning Core
**Rationale:** The scanning module is the highest-risk, highest-dependency component. Everything else (insole design, ordering, manufacturing) depends on it working. Architecture research explicitly identifies measurement as the critical path. Build this first to validate feasibility before investing in downstream systems.
**Delivers:** Working foot scanning flow with validated accuracy, user auth, basic database schema, Next.js app shell
**Addresses:** Guided foot scanning (P1), user account + foot profile (P1), mobile-first design (P1)
**Avoids:** Pitfall 1 (false accuracy confidence) by including ground-truth validation; Pitfall 5 (scan UX drop-off) by making this the primary focus; Pitfall 7 (medical claims) by establishing regulatory positioning early

### Phase 2: Product Catalog + Insole Design Engine
**Rationale:** With validated measurements in hand, build the insole design algorithm and product catalog. These must be built together because insole design must be constrained by shoe internal dimensions (Pitfall 6). The parametric pipeline is the second component on the critical path.
**Delivers:** Shoe catalog with Payload CMS, parametric insole design from measurement data, 3D insole preview, shoe-insole compatibility matrix
**Addresses:** Shoe catalog + product pages (P1), insole design algorithm (P1), bundle product page (P1)
**Avoids:** Pitfall 4 (static measurement without biomechanics) by including activity questionnaire; Pitfall 6 (shoe-insole incompatibility) by coupling design to shoe data

### Phase 3: E-Commerce + Order Flow
**Rationale:** Standard e-commerce patterns, but with custom manufacturing state machine. This phase can leverage well-documented patterns for cart/checkout. The order state machine must include manufacturing-specific states from the start.
**Delivers:** Shopping cart, checkout with Toss Payments, order management with manufacturing states, email notifications, return/re-make policy implementation
**Addresses:** Cart + checkout + payment (P1), order status tracking (P1), email notifications (P1), return/remake policy (P1)
**Avoids:** Pitfall 2 (return policy catastrophe) by designing re-make flow alongside ordering; Pitfall 3 (manufacturing integration oversimplified) by building proper async order pipeline

### Phase 4: Factory Integration + Fulfillment
**Rationale:** Highest external dependency -- requires factory partner coordination. Architecture research recommends building this last because it depends on insole engine output format and order management being stable. Use the Adapter pattern to isolate factory specifics.
**Delivers:** Factory order dispatch (automated or semi-automated), production status tracking, shipping integration, manufacturing error handling
**Addresses:** Factory integration (P2), order status granularity
**Avoids:** Pitfall 3 (manufacturing complexity) by dedicating a full phase; Anti-pattern 3 (tight factory coupling) by using Adapter pattern

### Phase 5: Optimization + Differentiators
**Rationale:** With the core product working end-to-end, optimize based on real user data. AI-enhanced design, segment flows, and advanced features are iterative improvements that depend on having real orders and feedback.
**Delivers:** AI-enhanced insole design, customer segment flows, size recommendation engine, scan quality scoring, reorder flow, 3D customization preview
**Addresses:** All P2 features from feature prioritization matrix

### Phase Ordering Rationale

- **Measurement before design, design before manufacturing:** This is the critical path identified in architecture research. Each component depends on the output format of the previous one being stable.
- **Product catalog built WITH insole engine (Phase 2):** Pitfall 6 requires shoe-insole coupling in the data model. Building these separately would create incompatibility.
- **E-commerce in Phase 3, not Phase 1:** Counter-intuitive for an e-commerce platform, but the scanning technology is the existential risk. Validate it first. Cart/checkout uses well-established patterns and can be built quickly once the novel components are proven.
- **Factory integration isolated in Phase 4:** External dependency with the longest lead time. Begin partner discussions in Phase 1, but actual integration work should wait until internal systems are stable.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Scanning):** MediaPipe foot landmark accuracy, A4 paper detection reliability, cross-device camera API differences. The ML pipeline is the least-documented part of the stack.
- **Phase 2 (Insole Design):** Parametric CAD approach (CadQuery vs OpenSCAD vs custom), material constraints for 3D printing minimum wall thickness, factory-accepted file formats.
- **Phase 4 (Factory Integration):** Entirely dependent on specific factory partner's capabilities. Cannot be fully researched until partner is identified.

Phases with standard patterns (skip research-phase):
- **Phase 3 (E-Commerce):** Cart, checkout, payment, order management are thoroughly documented patterns. Toss Payments has solid documentation.
- **Phase 5 (Optimization):** Feature iteration based on data; standard product development.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js, Postgres, Payload CMS are mature choices with strong documentation. Python for scientific computing is well-justified. Toss Payments is the clear choice for Korean market. |
| Features | MEDIUM | Competitor analysis is solid but based on public information. The shoe+insole bundle model is unproven -- no competitor does it, which is either a gap or a reason. |
| Architecture | MEDIUM | Hybrid web+Python architecture is sound. Parametric insole pipeline is well-documented in academic literature. Specific implementation details (model accuracy, processing times) need validation. |
| Pitfalls | MEDIUM-HIGH | Grounded in competitor failure modes (FitMyFoot reviews), academic accuracy studies, and regulatory references. Measurement accuracy and scan UX risks are well-documented and real. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Foot scanning accuracy in practice:** No ground-truth data exists for MediaPipe-based foot measurement. Academic papers validate Structure-from-Motion approaches but not the specific browser-based pipeline proposed. Must build and test a prototype early.
- **Factory partner specifics:** All manufacturing integration research is generic. Actual file formats, communication protocols, lead times, and capacity depend on the specific factory partner. Partner selection should happen in parallel with Phase 1.
- **Korean market regulatory landscape:** Medical device classification research focuses on US (FDA) and EU (MDR). Korean MFDS regulations for custom insoles need separate legal review.
- **Neon Postgres at scale with 3D data:** Neon's serverless model is cost-effective early but behavior under measurement data load (many large JSON foot profiles, high write volume during scans) is unvalidated.
- **Bundle pricing model:** No competitor sells shoe+insole bundles. Pricing strategy, margin structure, and consumer willingness to pay for the bundle are completely unvalidated.
- **Left/right foot asymmetry handling:** Research flags this as a common oversight. The measurement and design pipeline must handle two independent foot profiles per user, doubling measurement data and design computation.

## Sources

### Primary (HIGH confidence)
- [Next.js 16.2 Release](https://nextjs.org/blog) -- framework capabilities
- [Payload CMS 3.0 Next.js Integration](https://payloadcms.com/posts/blog/payload-30-the-first-cms-that-installs-directly-into-any-nextjs-app) -- CMS architecture
- [MediaPipe Pose Landmarker Web JS](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js) -- ML pipeline
- [Toss Payments API/Integration Guides](https://docs.tosspayments.com/en/api-guide) -- payment processing
- [OptiFit: CV-Based Smartphone Foot Measurement (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9739363/) -- reference-object calibration, 95-99% accuracy
- [Mobile Apps for Foot Measurement: Scoping Review (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7974751/) -- accuracy limitations, scanning approaches
- [Parametric Custom Insole Design Based on 3D Foot Shape](http://www.txxb.com.cn/EN/10.11996/JG.j.2095-302X.2024030558) -- parametric design algorithm
- [21 CFR 880.6280 (FDA)](https://www.law.cornell.edu/cfr/text/21/880.6280) -- US medical device classification

### Secondary (MEDIUM confidence)
- [Upstep](https://www.upstep.com/), [Wiivv/FitMyFoot](https://wiivv.com/), [Bilt Labs](https://biltlabs.com/), [ScanSoles](https://www.scansoles.com/) -- competitor feature analysis
- [Neon vs Supabase vs PlanetScale 2026](https://dev.to/whoffagents/neon-vs-supabase-vs-planetscale-managed-postgres-for-nextjs-in-2026-2el4) -- database comparison
- [FitMyFoot App Reviews](https://justuseapp.com/en/app/1045172889/fitmyfoot/reviews) -- competitor failure modes
- [Volumental: Retail 3D Foot Scanners](https://volumental.com/blog/six-things-to-consider-about-retail-3d-foot-scanners) -- accuracy claims analysis
- [Footwear E-Commerce Return Rates](https://volumental.com/blog/how-e-commerce-can-reduce-both-shoe-returns-and-environmental-effects) -- return rate benchmarks

### Tertiary (LOW confidence)
- [Vercel AI SDK](https://ai-sdk.dev/docs/introduction) -- AI-assisted recommendations (optional enhancement, not core)
- [Smartphone Photogrammetry for Prosthetics (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12908380/) -- accuracy data (adjacent domain)

---
*Research completed: 2026-04-09*
*Ready for roadmap: yes*
