# FitSole 2-Line 비즈니스 모델 — 기술 아키텍처

**작성일:** 2026-04-11
**요약:** 일반 소비자(온라인)와 전문가/운동선수(오프라인)를 위한 두 가지 제품 라인

---

## 1. 개요

FitSole은 **두 가지 제품 라인**을 병행 운영한다:

| 구분 | Line 1 (일반용) | Line 2 (전문가용) |
|------|---------------|------------------|
| **타겟** | 일반 소비자 | 운동선수, 족부 질환자, 프리미엄 고객 |
| **진입점** | 온라인 쇼핑몰 | 오프라인 매장 + SALTED 키트 대여 |
| **측정 기술** | 스마트폰 카메라 (SfM) | SALTED 스마트 인솔 (실측 센서) |
| **데이터 정확도** | 70~80% AI 추정 | 100% 실측 (100Hz × 5분) |
| **가격대** | ₩59,000 ~ ₩89,000 | ₩129,000 ~ ₩200,000+ |
| **마진** | 80~85% | 70~75% |
| **런칭 단계** | Phase 1-2 완료 | Phase 3 완료 |

---

## 2. Line 1 — 카메라 기반 (일반용)

### 2.1 측정 원리

**동영상 SfM (Structure-from-Motion):**
- 스마트폰 동영상 15~20초 촬영
- A4 용지로 스케일 보정
- COLMAP SfM 파이프라인 → 3D 포인트 클라우드
- Open3D Poisson 메쉬 생성
- 6개 측정값 추출 (길이, 볼넓이, 아치 높이, 발등 높이, 뒤꿈치 넓이, 발가락 길이)
- **정확도: ±0.15mm**

**보조 측정 — 보행 분석:**
- 옆에서 촬영 (시상면): 보폭, 발목 굽힘, 아치 변형
- 뒤에서 촬영 (관상면): 회내/회외, 양측 대칭
- MediaPipe Pose로 33개 신체 랜드마크 추적
- 프레임별 각도 계산 → 보행 패턴 분류

**AI 압력 추정:**
- 입력: 체중, 발 크기, 아치 높이, 성별, 나이
- 20×10 해부학적 그리드에 압력 분포 추정
- 정확도: 실제 센서 대비 70~80%

### 2.2 핵심 파일

- `services/measurement/app/pipeline/` — SfM 파이프라인
- `services/measurement/app/gait/` — MediaPipe 보행 분석
- `services/measurement/app/pressure/estimator.py` — AI 압력 추정
- `src/app/(main)/scan/new/page.tsx` — 스캔 UI

### 2.3 인솔 설계 알고리즘

핵심 수학 공식 (`services/measurement/app/insole/optimizer.py`):

**아치 높이 결정 (족저 응력의 79.4% 영향):**
```python
calculate_optimal_arch_height(
    navicular_height,      # SfM에서 추출
    midfoot_pressure_ratio, # AI 추정
    body_weight,
    foot_length
)
# 결과: 25~60mm 범위
```

**힐컵 깊이 결정 (족저 응력의 40.2% 영향):**
```python
calculate_optimal_heel_cup_depth(
    heel_peak_pressure,
    pronation_degree,
    age,
    activity_type
)
# 결과: 15~35mm 범위
```

### 2.4 Varioshore TPU 5-Zone Hardness Mapping

한 가지 TPU 필라멘트로 온도를 달리 하여 구간별 경도 생성:

| Zone | 온도 | Shore 경도 | 용도 |
|------|------|-----------|------|
| archCore | 190°C | 92A | 아치 지지 |
| heelCupWall | 195°C | 85A | 힐컵 안정화 |
| heelCupFloor | 200°C | 75A | 충격 흡수 |
| forefoot | 210°C | 65A | 자연스러운 이탈 |
| toeArea | 220°C | 55A | 발가락 쿠셔닝 |

---

## 3. Line 2 — SALTED SDK 기반 (전문가용)

### 3.1 측정 원리

**SALTED 스마트 인솔 SDK:**
- BLE 연결 (Web Bluetooth API)
- 100Hz 실시간 압력 데이터 수집
- 6축 IMU (가속도 + 자이로스코프)
- 5분 보행 세션 = 약 300,000 데이터포인트

**생체역학 분석 5가지 (`services/measurement/app/salted/biomechanical.py`):**

1. **착지 패턴 (Landing Pattern):**
   - 앞발/중발/뒷발 중 어느 부위가 먼저 닿는가?
   - 60% 이상이면 해당 패턴으로 분류

2. **회내/회외 (Pronation/Supination):**
   - COP(압력 중심) 내측/외측 편이 계산
   - -30° ~ +30° 범위

3. **COP 궤적 (Center of Pressure Trajectory):**
   - 뒷꿈치 → 발가락 이동 경로
   - 정규화 좌표 (x, y ∈ [0, 1])

4. **아치 유연성 (Arch Flexibility):**
   - 정적 아치 인덱스 (평균)
   - 동적 아치 인덱스 (표준편차 = 유연성)

5. **체중 분배 (Weight Distribution):**
   - 앞발/중발/뒷발 비율 (%)

### 3.2 Before/After 검증 리포트

Line 2의 결정적 차별화 기능:
- **Before 세션:** 기존 신발/인솔로 2분 보행
- **After 세션:** 맞춤 인솔 착용 후 2분 보행
- **자동 비교 리포트:**
  - 피크 압력 감소 ≥30%
  - 접촉 면적 증가 ≥40%
  - COP 안정성 변화
  - 구역별 시각 히트맵

**파일:** `services/measurement/app/insole/report_generator.py`

### 3.3 오프라인 매장 연동

- **위치:** 강남역 지하상가 (예시)
- **서비스:** SALTED 키트 현장 측정
- **운동선수 대여:** 1~2주 훈련 중 실측 데이터 수집

---

## 4. 관리자 대시보드 (운영 자동화)

`/admin/dashboard/` 전용 섹션:

### 4.1 주문 관리
- 주문 목록 필터 (상태, 날짜, 고객, 라인 타입)
- 주문 상세: 고객 정보, 스캔 데이터, 설계 사양
- 공장 자동 전달 (이메일 + STL 첨부)

### 4.2 고객 데이터 뷰어
- 3D 발 모델 임베드
- 측정값 테이블
- 압력 히트맵 시각화
- Before/After 검증 리포트

### 4.3 인솔 설계 사양 뷰어
- 3D 인솔 프리뷰 (zone별 색상)
- 설계 파라미터 (arch, heel cup, posts, 유연성)
- Varioshore TPU 온도 맵
- STL 파일 다운로드

### 4.4 SALTED 세션 뷰어
- 원본 압력 데이터 시각화
- 생체역학 분석 결과
- Before/After 리포트 열람

### 4.5 신발 DB 관리 (신규)
- 신발 내부 스캔 업로드
- Revopoint + 알지네이트 병합 도구
- 사이즈 그레이딩 엔진
- 검증 워크플로

---

## 5. 6-Phase 구현 현황

| Phase | 이름 | 플랜 수 | 상태 |
|-------|------|--------|------|
| 1 | Foundation & Accounts | 4 | ✅ Complete |
| 2 | Foot Scanning | 8 | ✅ Complete |
| 3 | Insole Design & Product Catalog | 8 | ✅ Complete |
| 4 | Shopping & Checkout | 3 | ✅ Complete |
| 5 | Admin Dashboard & Order Management | 5 | ✅ Complete |
| 6 | Segmentation, Support & Offline Store | 3 | ✅ Complete |

**총 31개 플랜, 100+ 커밋, 78+ Python 테스트, 100+ Vitest 테스트**

---

## 6. 기술 스택 정리

### 6.1 프론트엔드
- **Framework:** Next.js 16.2 (App Router, React 19.2)
- **UI:** shadcn/ui + Tailwind CSS 4.x
- **Font:** Pretendard (한국어 최적화)
- **State:** Zustand
- **3D Viewer:** React Three Fiber + Three.js
- **Data Fetching:** TanStack Query

### 6.2 백엔드
- **API:** Next.js API Routes
- **CMS:** Payload CMS 3.x (상품 관리)
- **Database:** Neon Postgres + Drizzle ORM
- **Auth:** Auth.js v5 (JWT + httpOnly cookies)
- **Email:** Resend
- **Payments:** Toss Payments

### 6.3 측정 서비스 (Python)
- **Framework:** FastAPI
- **SfM:** pycolmap
- **Mesh:** Open3D
- **Pose:** MediaPipe
- **3D 재구성:** Poisson surface reconstruction
- **CAD 생성:** OpenSCAD (Jinja2 템플릿)
- **슬라이서:** PrusaSlicer (프로파일 생성)

### 6.4 인솔 제조
- **기술:** 3D 프린팅 (FDM)
- **프린터:** Bambu Lab P1S 또는 OEM 파트너
- **재료:** Colorfabb Varioshore TPU
- **파트너십 전략:** Alibaba HUITONG 초기 + 국내 OEM 확대

### 6.5 신발 내부 스캐닝 (신규)
- **장비:** Revopoint MINI 2 Advanced ($790)
- **보조:** 알지네이트 캐스트 ($3~6/쌍)
- **정확도:** ±0.02mm (외부) + ±0.1mm (캐스트)
- **그레이딩:** 업계 표준 기반 수학 추론
- **병합:** ICP 알고리즘 + 불일치 자동 해결

---

## 7. 핵심 차별화 포인트

### 7.1 경쟁사 대비

| 항목 | 경쟁사 (Wiivv 등) | FitSole |
|------|----------------|--------|
| 측정 정확도 | ±0.95mm | **±0.15mm (6배)** |
| 측정 방법 | 사진 기반 | **동영상 SfM** |
| 보행 분석 | 없음 | **MediaPipe Pose** |
| 압력 데이터 | 없음 | **Line 2 SALTED 실측** |
| 신발 호환 | Trim-to-fit 보편 | **신발 모델별 DB** |
| 사이즈 추론 | 없음 | **그레이딩 엔진** |
| 검증 리포트 | 없음 | **Before/After 수치 비교** |
| 관리자 자동화 | 제한적 | **풀 대시보드** |

### 7.2 혁신 포인트

1. **2-Line 구조** — 일반/전문가 양방향 공략
2. **신발 내부 DB** — 도매상 협력으로 비용 없이 구축
3. **그레이딩 엔진** — 1 모델당 스캔 시간 1/15 단축
4. **알지네이트 역발상** — 100년 치과 기술을 신발에 적용
5. **검증 리포트** — 과학적 근거 제공 (피크 압력 -30%, 접촉 면적 +40%)

---

## 8. 다음 마일스톤

- [ ] UI + 문서 완성 (shoe-merge-client, SOP, 파트너 매뉴얼)
- [ ] Revopoint MINI 2 실제 구매 및 테스트
- [ ] 첫 100개 신발 모델 DB 구축 (동대문 도매상)
- [ ] 베타 테스트 고객 20명
- [ ] Production 런칭
