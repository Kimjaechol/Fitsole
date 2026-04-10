# Roadmap: FitSole

## Overview

FitSole delivers a custom insole + shoe e-commerce platform in six phases. We start with the application foundation and user accounts, then build the highest-risk component (smartphone foot scanning), followed by insole design coupled with the product catalog. With the core product experience complete, we layer on shopping/checkout, order management with factory integration, and finally customer segmentation and support features. This ordering validates the novel technology (scanning) before investing in standard e-commerce patterns downstream.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Accounts** - App shell, database schema, authentication, mobile-first responsive base
- [ ] **Phase 2: Foot Scanning** - Smartphone camera-based foot measurement with guided flow and quality validation
- [ ] **Phase 3: Insole Design & Product Catalog** - Parametric insole generation from scan data, shoe catalog, bundle product pages
- [ ] **Phase 4: Shopping & Checkout** - Cart, Toss Payments integration, order confirmation
- [ ] **Phase 5: Order Management & Factory Integration** - Order tracking, admin dashboard, factory dispatch workflow
- [ ] **Phase 6: Segmentation & Support** - Customer type flows, FAQ, support channels, satisfaction guarantee

## Phase Details

### Phase 1: Foundation & Accounts
**Goal**: Users can create accounts, log in, and interact with a mobile-first Korean-language application shell that persists their session and profile data
**Depends on**: Nothing (first phase)
**Requirements**: ACCT-01, ACCT-02, ACCT-03, ACCT-04, ACCT-05, UIUX-01, UIUX-02, UIUX-03
**Success Criteria** (what must be TRUE):
  1. User can sign up with email/password and log in with session persisting across browser refreshes
  2. User can view and manage their profile including saved foot scan placeholders and order history (empty states)
  3. The site is mobile-first responsive and renders correctly on smartphone browsers
  4. The site displays all content in Korean with a landing page that clearly communicates the custom insole value proposition
**Plans:** 4 plans
Plans:
- [x] 01-01-PLAN.md — Scaffold Next.js project, database schema, Auth.js backend, test infrastructure
- [x] 01-02-PLAN.md — App shell with bottom tab bar, desktop nav, and Korean landing page
- [x] 01-03-PLAN.md — Auth forms (login, signup, password reset) with Zod validation
- [x] 01-04-PLAN.md — Profile page with 3 tabs, empty states, DB schema push, and verification
**UI hint**: yes

### Phase 2: Foot Scanning
**Goal**: Users can measure their feet using smartphone video SfM scanning (+-0.15mm accuracy) with AI gait analysis, view 3D foot model with pressure heatmap, and results are saved to their profile
**Depends on**: Phase 1
**Requirements**: SCAN-01, SCAN-02, SCAN-03, SCAN-04, SCAN-05, SCAN-06, SCAN-07, SCAN-08, SCAN-09, SCAN-10
**Success Criteria** (what must be TRUE):
  1. User can launch a guided video scanning flow that accesses the smartphone camera with real-time feedback on positioning, lighting, and circular motion guidance
  2. User places foot on A4 paper, records 15-20s video around the foot, and the system reconstructs a 3D model via SfM extracting foot length, ball width, arch height, instep height, heel width
  3. User can record a 5-10 step walking video and the system analyzes gait pattern, ankle alignment, and arch flexibility via AI
  4. System detects left/right asymmetry, scores scan quality, prompts re-scan if insufficient, and generates AI-estimated pressure distribution heatmap
  5. User can view interactive 3D foot model with measurement overlay and pressure heatmap, results saved to profile
**Plans:** 8 plans
Plans:
- [x] 02-01-PLAN.md — Type contracts, DB schema extension, Zustand store, scan API routes
- [x] 02-02-PLAN.md — Python FastAPI backend scaffold with COLMAP SfM pipeline
- [x] 02-03-PLAN.md — Scan UI components (camera, recording, guides, onboarding, quality)
- [x] 02-04-PLAN.md — Gait analysis (MediaPipe Pose) and pressure estimation backend
- [x] 02-05-PLAN.md — Scan flow pages, video upload (TUS), processing status polling
- [x] 02-06-PLAN.md — 3D foot model viewer (R3F), results page, pressure heatmap
- [x] 02-07-PLAN.md — Integration wiring, profile update, end-to-end verification
- [x] 02-08-PLAN.md — Gap closure: fix orchestration wiring, gait upload routing, biometric inputs
**UI hint**: yes

### Phase 3: Insole Design Engine (Two Lines) & Product Catalog
**Goal**: Two-line insole design system — Line 1 (camera-based for general consumers) uses arch height/heel cup optimization from SfM data; Line 2 (SALTED SDK for pro/offline) uses real pressure sensor data for precision design. Both lines generate parametric CAD → STL. Product catalog with shoe+insole bundle browsing.
**Depends on**: Phase 2
**Requirements**: INSL-01, INSL-02, INSL-03, INSL-04, SALT-01, SALT-02, SALT-03, SALT-04, SALT-05, SALT-06, PROD-01, PROD-02, PROD-03, PROD-04, PROD-05
**Success Criteria** (what must be TRUE):
  1. Line 1: System calculates optimal arch height (79.4% influence) and heel cup depth (40.2% influence) from SfM scan data and generates insole design with zone-specific hardness
  2. Line 2: System connects to SALTED insole via BLE, collects 5-min walking data, analyzes landing pattern/COP/pronation, and generates precision insole design
  3. Both lines produce parametric CAD (OpenSCAD) → STL file with Varioshore TPU temperature mapping per zone
  4. System generates before/after verification report for SALTED-measured customers
  5. User can preview custom insole in 3D with zone hardness visualization
  6. User can browse shoes by category, filter, view bundle pricing with insole customization preview and size recommendation
**Plans:** 8 plans
Plans:
- [x] 03-01-PLAN.md — Type contracts, DB schema extension, Python Pydantic models for insole/SALTED
- [x] 03-02-PLAN.md — Payload CMS setup with Products, Categories, Media collections
- [x] 03-03-PLAN.md — Insole optimization algorithms (arch height, heel cup, hardness), design API
- [x] 03-04-PLAN.md — OpenSCAD parametric CAD pipeline, STL export, PrusaSlicer profile
- [x] 03-05-PLAN.md — SALTED BLE adapter (mock+real), biomechanical analysis, session API
- [x] 03-06-PLAN.md — Product catalog UI (listing, filters, detail), 3D insole preview, design page
- [x] 03-07-PLAN.md — SALTED session UI, precision design, before/after report, API proxy wiring
- [x] 03-08-PLAN.md — Gap closure: embed InsolePreview3D on product detail page (PROD-05)
**UI hint**: yes

### Phase 4: Shopping & Checkout
**Goal**: Users can add shoe+insole bundles to cart and complete purchase through Toss Payments with order confirmation
**Depends on**: Phase 3
**Requirements**: SHOP-01, SHOP-02, SHOP-03, SHOP-04
**Success Criteria** (what must be TRUE):
  1. User can add a shoe+insole bundle to their shopping cart and modify cart contents
  2. User can proceed to checkout with shipping address and payment information
  3. User can pay via Toss Payments (card, KakaoPay, NaverPay, TossPay)
  4. User receives an order confirmation email after successful purchase
**Plans:** 3 plans
Plans:
- [x] 04-01-PLAN.md — Cart system: Zustand store, orders DB schema, cart page UI, add-to-cart button
- [x] 04-02-PLAN.md — Checkout flow: shipping form with Daum API, Toss Payments SDK widget
- [x] 04-03-PLAN.md — Payment verification, order confirmation page, confirmation email
**UI hint**: yes

### Phase 5: Admin Dashboard & Order Management
**Goal**: Full admin dashboard for managing orders, viewing customer scan/pressure data, downloading insole design specs, dispatching to factory, and managing SALTED sessions. Users can track their orders through manufacturing stages.
**Depends on**: Phase 4
**Requirements**: ORDR-01, ORDR-02, ORDR-03, ORDR-04, ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06
**Success Criteria** (what must be TRUE):
  1. User can track order status through all stages: order confirmed, insole designed, in production, shipping, delivered
  2. User receives email notifications at each order stage transition
  3. Admin dashboard: view all orders with filtering, view customer 3D scan + pressure data, download STL/design specs
  4. Admin can update order status and dispatch to factory with design specs attached
  5. Admin can view SALTED measurement sessions with raw pressure data visualization
  6. Admin can manage offline store reservations and smart insole kit inventory
**Plans:** 5 plans
Plans:
- [x] 05-01-PLAN.md — Order type contracts, API routes, user-facing order list and detail pages
- [x] 05-02-PLAN.md — Status notification emails, admin auth middleware, status update API
- [x] 05-03-PLAN.md — Admin dashboard shell, sidebar, stats overview, filterable order table
- [ ] 05-04-PLAN.md — Admin order detail with scan/design viewers, status controls, factory dispatch
- [ ] 05-05-PLAN.md — SALTED session viewer and offline store reservation management
**UI hint**: yes

### Phase 6: Segmentation, Support & Offline Store
**Goal**: Users receive personalized experiences based on their needs (foot health, comfort, athletic performance), can access support resources and satisfaction guarantee, and can find offline store with smart insole kit measurement service
**Depends on**: Phase 5
**Requirements**: SEGM-01, SEGM-02, SEGM-03, SUPP-01, SUPP-02, SUPP-03, OFFL-01, OFFL-02, OFFL-03, OFFL-04
**Success Criteria** (what must be TRUE):
  1. User can select their primary concern (foot health, comfort, athletic performance) and see segment-specific product recommendations
  2. Foot health segment users see condition-specific guidance (flat feet, high arches, bunions, etc.)
  3. User can access FAQ page covering measurement accuracy and fit concerns, and contact support via email or chat
  4. Site displays 90-day satisfaction guarantee with free remake policy
  5. Site has offline store page (강남역 지하상가) with location map, hours, smart insole kit service description, and reservation/contact
  6. Athlete segment links to smart insole kit rental program information
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Accounts | 0/4 | Planning complete | - |
| 2. Foot Scanning | 0/8 | Planning complete | - |
| 3. Insole Design & Product Catalog | 0/8 | Gap closure planned | - |
| 4. Shopping & Checkout | 0/3 | Planning complete | - |
| 5. Order Management & Factory Integration | 0/5 | Planning complete | - |
| 6. Segmentation & Support | 0/TBD | Not started | - |
