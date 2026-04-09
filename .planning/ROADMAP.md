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
**Goal**: Users can measure their feet using smartphone video SfM scanning (±0.15mm accuracy) with AI gait analysis, view 3D foot model with pressure heatmap, and results are saved to their profile
**Depends on**: Phase 1
**Requirements**: SCAN-01, SCAN-02, SCAN-03, SCAN-04, SCAN-05, SCAN-06, SCAN-07, SCAN-08, SCAN-09, SCAN-10
**Success Criteria** (what must be TRUE):
  1. User can launch a guided video scanning flow that accesses the smartphone camera with real-time feedback on positioning, lighting, and circular motion guidance
  2. User places foot on A4 paper, records 15-20s video around the foot, and the system reconstructs a 3D model via SfM extracting foot length, ball width, arch height, instep height, heel width
  3. User can record a 5-10 step walking video and the system analyzes gait pattern, ankle alignment, and arch flexibility via AI
  4. System detects left/right asymmetry, scores scan quality, prompts re-scan if insufficient, and generates AI-estimated pressure distribution heatmap
  5. User can view interactive 3D foot model with measurement overlay and pressure heatmap, results saved to profile
**Plans**: TBD
**UI hint**: yes

### Phase 3: Insole Design & Product Catalog
**Goal**: Users can browse shoes, see their custom insole design generated from scan data, preview the insole in 3D, and view shoe+insole bundle pricing with size recommendations
**Depends on**: Phase 2
**Requirements**: INSL-01, INSL-02, INSL-03, INSL-04, PROD-01, PROD-02, PROD-03, PROD-04, PROD-05
**Success Criteria** (what must be TRUE):
  1. System generates a custom insole design from user's scan measurements incorporating arch type, foot dimensions, pressure distribution, and pronation correction
  2. User can preview their custom insole in a 3D visualization before ordering
  3. User can browse shoes by category and filter by category, size, price, and style
  4. Product detail page shows shoe images/descriptions, shoe+insole bundle pricing, insole customization preview based on user's scan data, and recommended shoe size
**Plans**: TBD
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
**Plans**: TBD
**UI hint**: yes

### Phase 5: Order Management & Factory Integration
**Goal**: Users can track their order through manufacturing stages, and admins can manage orders and dispatch to factory partners
**Depends on**: Phase 4
**Requirements**: ORDR-01, ORDR-02, ORDR-03, ORDR-04
**Success Criteria** (what must be TRUE):
  1. User can track order status through all stages: order confirmed, insole designed, in production, shipping, delivered
  2. User receives email notifications at each order stage transition
  3. Admin can view all orders in a dashboard, update order status, and dispatch orders to factory via email/spreadsheet export
**Plans**: TBD
**UI hint**: yes

### Phase 6: Segmentation, Support & Offline Store
**Goal**: Users receive personalized experiences based on their needs, can access support resources and the satisfaction guarantee, and can find offline store information with smart insole kit measurement service
**Depends on**: Phase 5
**Requirements**: SEGM-01, SEGM-02, SEGM-03, SUPP-01, SUPP-02, SUPP-03, OFFL-01, OFFL-02, OFFL-03, OFFL-04
**Success Criteria** (what must be TRUE):
  1. User can select their primary concern (foot health, comfort, athletic performance) and see segment-specific product recommendations and scanning flow
  2. Foot health segment users see condition-specific guidance (flat feet, high arches, bunions, etc.)
  3. User can access FAQ page covering measurement accuracy and fit concerns, and contact support via email or chat
  4. Site displays 90-day satisfaction guarantee with free remake policy
  5. Site has offline store page with 강남역 지하상가 location info, smart insole kit service description, map, hours, and contact
  6. Athlete segment links to smart insole kit rental program information
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Accounts | 0/4 | Planning complete | - |
| 2. Foot Scanning | 0/TBD | Not started | - |
| 3. Insole Design & Product Catalog | 0/TBD | Not started | - |
| 4. Shopping & Checkout | 0/TBD | Not started | - |
| 5. Order Management & Factory Integration | 0/TBD | Not started | - |
| 6. Segmentation & Support | 0/TBD | Not started | - |
