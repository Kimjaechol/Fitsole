# FitSole - 맞춤 인솔 신발 플랫폼

## What This Is

소비자가 스마트폰으로 자신의 발(높이, 볼넓이, 길이)을 측정하면, 과학적 분석을 통해 개인 맞춤 인솔을 설계하고 신발과 세트로 판매하는 커스텀 신발 이커머스 플랫폼. 발 건강 고민자, 일반 소비자, 운동선수 등 모든 고객층을 카테고리별로 대응하며, 외부 제조 공장과 연계하여 실제 제작·배송까지 완료한다.

## Core Value

정확한 발 측정 데이터를 기반으로 개인 맞춤 인솔을 설계하여, 착용자의 발 건강과 편안함을 과학적으로 보장하는 것.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 스마트폰 카메라 기반 발 3D 측정 (길이, 볼넓이, 아치 높이, 발등 높이)
- [ ] 측정 데이터 기반 맞춤 인솔 자동 설계/추천 알고리즘
- [ ] 카테고리별 신발 상품 관리 (운동화, 구두, 부츠, 샌들 등)
- [ ] 고객 유형별 맞춤 추천 (발 건강 고민, 일반, 운동선수)
- [ ] 신발 + 맞춤 인솔 세트 주문 및 결제
- [ ] 외부 제조 공장 연계 주문 전달 시스템
- [ ] 주문 상태 추적 (제작 중 → 배송 중 → 완료)
- [ ] 회원가입/로그인 및 발 측정 이력 관리
- [ ] 상품 상세 페이지 (신발 정보 + 인솔 커스터마이징 프리뷰)
- [ ] 반품/교환 정책 및 고객 지원

### Out of Scope

- 오프라인 매장 운영 — v1은 온라인 전용
- 자체 공장/제조 시설 — 외부 공장 연계 방식
- B2B 대량 납품 — 개인 소비자 직접 판매에 집중

## Context

- 맞춤 인솔 시장은 기존에 병원/전문점 방문이 필요했으나, 스마트폰 기반 측정 기술로 접근성을 대폭 낮출 수 있음
- 발 측정 시 핵심 데이터: 발 길이, 볼넓이, 아치 높이(내측/외측), 발등 높이, 족저압 분포 추정
- 과학적 근거: 개인별 아치 지지, 압력 분산, 정렬 교정이 근골격계 건강에 직접적 영향
- 외부 공장 연계로 3D 프린팅 또는 CNC 가공 기반 인솔 제작 가능
- 실제 서비스 런칭 수준의 완성도 목표

## Constraints

- **제조**: 외부 공장 연계 — 자체 제조 설비 없음, API/주문서 기반 연동 필요
- **측정 정확도**: 스마트폰 카메라 기반 — 의료급 정밀도는 아니지만 충분한 정확도 필요
- **플랫폼**: 웹 기반 — 모바일 최적화 필수 (측정이 스마트폰에서 이루어짐)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 스마트폰 카메라 기반 발 측정 | 접근성 극대화, 별도 장비 불필요 | — Pending |
| 신발+인솔 세트 판매 | 인솔만 단독보다 완성도 높은 경험 제공 | — Pending |
| 외부 공장 연계 제조 | 초기 투자 비용 절감, 스케일링 유연 | — Pending |
| 모든 고객 카테고리 대응 | 시장 범위 최대화 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-09 after initialization*
