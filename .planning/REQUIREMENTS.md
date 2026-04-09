# Requirements: FitSole

**Defined:** 2026-04-09
**Core Value:** 정확한 발 측정 데이터를 기반으로 개인 맞춤 인솔을 설계하여, 착용자의 발 건강과 편안함을 과학적으로 보장하는 것.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foot Scanning (발 측정)

- [x] **SCAN-01**: User can launch guided foot scanning flow on smartphone camera
- [x] **SCAN-02**: User places foot on A4 paper for reference-object calibration
- [x] **SCAN-03**: System provides real-time guidance on lighting, angle, and positioning during video scan
- [x] **SCAN-04**: System captures video (15-20s) of foot and reconstructs 3D model via SfM (±0.15mm accuracy)
- [x] **SCAN-05**: System detects and stores left/right foot asymmetry separately
- [x] **SCAN-06**: System scores scan quality and prompts re-scan if insufficient
- [ ] **SCAN-07**: User can view 3D foot model with measurement overlay and pressure heatmap
- [x] **SCAN-08**: User can record walking video (5-10 steps) for AI gait analysis
- [x] **SCAN-09**: System analyzes gait pattern, ankle alignment, arch flexibility from walking video
- [x] **SCAN-10**: System generates AI-estimated pressure distribution heatmap

### Offline Store & Smart Insole Kit (오프라인 매장/스마트 인솔)

- [ ] **OFFL-01**: Site has offline store introduction page with store info (강남역 지하상가)
- [ ] **OFFL-02**: Store page shows smart insole kit measurement service description
- [ ] **OFFL-03**: Store page includes location map, operating hours, and reservation/contact info
- [ ] **OFFL-04**: Athlete section links to smart insole kit rental program info

### Insole Design (인솔 설계)

- [ ] **INSL-01**: System generates custom insole design based on scan measurements (arch type + foot dimensions)
- [ ] **INSL-02**: System recommends insole parameters using AI-enhanced algorithm (pressure distribution, pronation correction)
- [ ] **INSL-03**: User can preview custom insole design in 3D visualization before ordering
- [ ] **INSL-04**: System recommends optimal shoe size per product based on scan data

### Product Catalog (상품 카탈로그)

- [ ] **PROD-01**: User can browse shoes by category (운동화, 구두, 부츠, 샌들 등)
- [ ] **PROD-02**: User can filter shoes by category, size, price, and style
- [ ] **PROD-03**: User can view product detail page with multiple images and descriptions
- [ ] **PROD-04**: Product page shows shoe + custom insole bundle pricing
- [ ] **PROD-05**: Product page shows insole customization preview based on user's scan data

### Shopping & Checkout (쇼핑/결제)

- [ ] **SHOP-01**: User can add shoe + insole bundle to shopping cart
- [ ] **SHOP-02**: User can proceed to checkout with address and payment info
- [ ] **SHOP-03**: User can pay via Toss Payments (카드, 카카오페이, 네이버페이, 토스페이)
- [ ] **SHOP-04**: User receives order confirmation email after purchase

### Account & Profile (계정/프로필)

- [x] **ACCT-01**: User can sign up with email and password
- [x] **ACCT-02**: User can log in and session persists across browser refresh
- [x] **ACCT-03**: User can view and manage saved foot scan profiles
- [x] **ACCT-04**: User can view order history
- [x] **ACCT-05**: User can reorder using previously saved foot measurement data

### Customer Segmentation (고객 세그먼트)

- [ ] **SEGM-01**: User selects their primary concern on entry (발 건강 / 편안함 / 운동 성능)
- [ ] **SEGM-02**: System shows segment-specific product recommendations and scanning flow
- [ ] **SEGM-03**: Foot health segment sees condition-specific guidance (평발, 요족, 무지외반 등)

### Order Management (주문 관리)

- [ ] **ORDR-01**: User can track order status (주문확인 → 인솔설계 → 제작중 → 배송중 → 완료)
- [ ] **ORDR-02**: User receives email notifications at each order stage
- [ ] **ORDR-03**: Admin can manually update order status and dispatch to factory (이메일/스프레드시트)
- [ ] **ORDR-04**: Admin can view and manage all orders in admin dashboard

### Customer Support (고객 지원)

- [ ] **SUPP-01**: User can access FAQ page covering measurement accuracy and fit concerns
- [ ] **SUPP-02**: User can contact support via email or chat
- [ ] **SUPP-03**: Site displays 90-day satisfaction guarantee with free remake policy

### UI/UX

- [x] **UIUX-01**: Site is mobile-first responsive (scanning flow is mobile-native)
- [x] **UIUX-02**: Site supports Korean language
- [x] **UIUX-03**: Landing page clearly communicates the custom insole value proposition

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Features

- **ENH-01**: Factory API integration for automated order dispatch and real-time status sync
- **ENH-02**: Expanded shoe catalog (50+ SKUs)
- **ENH-03**: Foot health education blog/content hub for SEO
- **ENH-04**: Foot condition tracking over time (compare scans across visits)
- **ENH-05**: Manufacturing partner dashboard (factory-facing portal)
- **ENH-06**: Multi-language support (English, etc.)

## Out of Scope

| Feature | Reason |
|---------|--------|
| AR 신발 가상 착용 | 복잡도 대비 가치 낮음 — 인솔은 내부 핏이 핵심 |
| 실시간 보행(gait) 분석 | 스마트폰 정확도 부족, 학술 논문으로 검증됨 |
| 커뮤니티/포럼 | 관리 부담, 의료 오정보 위험 |
| 맞춤 신발 제조 | 인솔 커스터마이징에 집중, 공급망 10배 복잡 |
| 구독/정기배송 모델 | 인솔 수명 1~3년, 리마인더로 대체 |
| 원격 진료/의사 상담 | 의료 면허/규제 복잡, 외부 플랫폼 연계로 대체 |
| 상세 의료 설문 | 사용자 이탈 유발, 간단 질문 3~5개로 대체 |
| 오프라인 매장 | v1은 온라인 전용 |
| 자체 제조 시설 | 외부 공장 연계 방식 |
| B2B 대량 납품 | 개인 소비자 직접 판매에 집중 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ACCT-01 | Phase 1 | Complete |
| ACCT-02 | Phase 1 | Complete |
| ACCT-03 | Phase 1 | Complete |
| ACCT-04 | Phase 1 | Complete |
| ACCT-05 | Phase 1 | Complete |
| UIUX-01 | Phase 1 | Complete |
| UIUX-02 | Phase 1 | Complete |
| UIUX-03 | Phase 1 | Complete |
| SCAN-01 | Phase 2 | Complete |
| SCAN-02 | Phase 2 | Complete |
| SCAN-03 | Phase 2 | Complete |
| SCAN-04 | Phase 2 | Complete |
| SCAN-05 | Phase 2 | Complete |
| SCAN-06 | Phase 2 | Complete |
| SCAN-07 | Phase 2 | Pending |
| INSL-01 | Phase 3 | Pending |
| INSL-02 | Phase 3 | Pending |
| INSL-03 | Phase 3 | Pending |
| INSL-04 | Phase 3 | Pending |
| PROD-01 | Phase 3 | Pending |
| PROD-02 | Phase 3 | Pending |
| PROD-03 | Phase 3 | Pending |
| PROD-04 | Phase 3 | Pending |
| PROD-05 | Phase 3 | Pending |
| SHOP-01 | Phase 4 | Pending |
| SHOP-02 | Phase 4 | Pending |
| SHOP-03 | Phase 4 | Pending |
| SHOP-04 | Phase 4 | Pending |
| ORDR-01 | Phase 5 | Pending |
| ORDR-02 | Phase 5 | Pending |
| ORDR-03 | Phase 5 | Pending |
| ORDR-04 | Phase 5 | Pending |
| SEGM-01 | Phase 6 | Pending |
| SEGM-02 | Phase 6 | Pending |
| SEGM-03 | Phase 6 | Pending |
| SUPP-01 | Phase 6 | Pending |
| SUPP-02 | Phase 6 | Pending |
| SUPP-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 after roadmap creation*
