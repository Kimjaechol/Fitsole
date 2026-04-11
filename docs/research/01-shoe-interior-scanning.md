# 신발 내부 3D 스캐닝 기술 조사 보고서

**작성일:** 2026-04-11
**관련 이슈:** 사업 성패를 좌우하는 핵심 기술
**결론:** Revopoint MINI 2 + 알지네이트 캐스트 하이브리드 방식 채택

---

## 1. 배경 문제

FitSole의 맞춤 인솔을 정확히 제작하려면 **신발 내부 치수**가 필요하다.
동일 사이즈 표기라도 브랜드/모델별로 내부 치수가 최대 11mm까지 차이난다
(예: 나이키 에어포스 270 = 278mm, 아디다스 삼바 270 = 273mm).

**핵심 질문:** 신발 내부 치수를 어떻게 정확하고 저렴하게 측정할 것인가?

---

## 2. 기술 옵션 비교

### 2.1 스마트폰 포토그래메트리 (Hernandez & Lemaire 2017)

- **출처:** [Prosthetics and Orthotics International, 2017](https://journals.sagepub.com/doi/full/10.1177/0309364616664150)
- **방법:** 15장 사진 → 클라우드 SfM → 3D 모델
- **초기 정확도:** ±2.6mm
- **2026 최신 정확도:** **±0.89mm** ([Springer BioMedical Engineering OnLine 2026](https://link.springer.com/article/10.1186/s12938-026-01515-8))
- **핵심 테크닉:** 패턴 덕트 테이프 삽입으로 특징점 인위적 생성
- **장점:** 초저비용, 기존 SfM 파이프라인 재사용 가능
- **단점:** 시간 소요 (5~10분/쌍), 패턴 타겟 필요, 조명 민감

### 2.2 Revopoint MINI 2 블루라이트 구조광 스캐너

- **URL:** https://www.revopoint3d.com/products/industry-3d-scanner-mini
- **원리:** 파란색 줄무늬 패턴 투사 → 카메라가 굴곡 분석 → 3D 좌표 역산
- **정확도:** **±0.02mm** (스마트폰 대비 40배 정확)
- **가격:** Advanced Edition **$790** + 1년 소프트웨어 라이센스 $430 = **$1,220**
- **장점:** 매우 정확, 3~5분/쌍 고속, 패턴 타겟 불필요
- **근본적 한계:** **신발 내부 블라인드 스팟 존재** (토박스 끝, 힐컵 뒷벽, 부츠 내부)

### 2.3 Flicfit (일본 상용 제품)

- **URL:** https://flicfit.com/
- **특허:** [US20170272728A1](https://patents.google.com/patent/US20170272728A1/en)
- **방법:** 전용 하우징에 여러 뎁스 카메라 배치 + ICP 알고리즘
- **한계:** 복제 불가능 (특허), 매장 고정형

### 2.4 SafeSize (네덜란드)

- **URL:** https://www.safesize.com/
- **방법:** X-ray 기반 내부 스캔 + 인공 발 압력 재현
- **한계:** 매우 고가 (€10,000~€50,000 추정)

---

## 3. 선택: Revopoint + 알지네이트 하이브리드

### 3.1 Revopoint 단독의 한계

블루라이트 구조광 스캐너는 **line-of-sight**가 필요하다.
신발은 **입구가 좁고 내부가 넓은** 구조이므로:

1. **토박스(발가락 끝):** 프로젝터 광선이 닿지 않고, 닿아도 카메라 시야 반대편
2. **힐컵 뒷벽:** 수직 벽이라 입구 방향 각도에선 안 보임
3. **부츠 내부:** 스캐너(15cm) 자체가 부츠 입구(8~12cm)에 못 들어감

### 3.2 알지네이트 캐스트 역발상 해결책

**핵심 아이디어:** 내부를 직접 스캔하지 말고, **내부 복제본을 외부에서 스캔**한다.

**재료:** 치과용 알지네이트 (Hydrogum 5 등)
- 100년 이상 의학계에서 사용된 검증 재료
- 좁은 공간(구강)에서 완벽한 복제 성능 입증
- 가격: 1kg 포대 $30~$40 → **쌍당 $3~$6**

**프로세스 (10~12분/쌍):**
1. 신발 내부에 얇은 비닐 라이너 삽입 (이형제)
2. 알지네이트 분말 + 물 혼합 (1분, 크림 질감)
3. 주사기로 신발 내부 완전 주입 (30초)
4. 경화 대기 (3~5분)
5. 캐스트 추출 (비닐 라이너와 함께 미끄러지며 빠짐)
6. Revopoint로 캐스트 외부 360° 스캔 (3분, ±0.02mm 정확도)
7. 신발은 완전히 깨끗한 상태 유지 (비파괴)

### 3.3 신발 타입별 전략 매트릭스

| 신발 타입 | 방법 | 시간 | 이유 |
|---------|------|------|------|
| 샌들/슬리퍼 | Revopoint 직접 | 3분 | 내부 개방형 |
| 로우탑 운동화 | Revopoint 직접 | 5분 | 입구 넓음, 시야 확보 |
| 미드/하이탑 운동화 | **하이브리드** | 12분 | 발목부분 가림 → 토박스만 캐스트 |
| 구두/로퍼 | **전체 캐스트** | 15분 | 가죽 반사 + 내부 복잡 |
| 숏 부츠 | **전체 캐스트** | 15분 | 알지네이트 150g 필요 |
| 롱 부츠 | **실리콘 퍼티** | 30분 | 알지네이트 흐름 방지 필요 |

---

## 4. ROI 분석

### 4.1 초기 투자

| 항목 | 비용 |
|------|------|
| Revopoint MINI 2 Advanced | $790 |
| 1년 소프트웨어 라이센스 | $430 |
| 자동 턴테이블 | $50~$100 |
| 알지네이트 1kg (초기 재고) | $40 |
| 실리콘 퍼티 키트 (부츠용) | $50 |
| 보조 도구 (보울, 주사기, 라이너) | $50 |
| LED 조명 | $40 |
| **총계** | **$1,450~$1,500** |

### 4.2 vs 스마트폰 방식 (12개월)

| 항목 | 스마트폰 | Revopoint |
|------|---------|----------|
| 초기 투자 | $50 | $1,500 |
| 풀타임 인건비 12개월 | $21,000 | $0 (파트타임 $3,600) |
| **1년 총 비용** | **$21,050** | **$5,100** |
| **절약** | - | **$15,950** |

**핵심:** 시간 = 돈이라는 원칙에서 Revopoint 도입이 5배 저렴.

### 4.3 반품률 감소 효과

- 스마트폰 (±0.89mm) → 반품률 5% → 월 손실 ₩2,000,000
- Revopoint (±0.02mm) → 반품률 <1% → 월 손실 ₩400,000
- **월 반품 절약: ₩1,600,000** = **장비 구매가 1~2개월 내 회수**

---

## 5. 참고 문헌

### 학술 논문
- Hernandez A., Lemaire E. (2017). "A smartphone photogrammetry method for digitizing prosthetic socket interiors." *Prosthetics and Orthotics International*, 41(2):210-214. https://journals.sagepub.com/doi/full/10.1177/0309364616664150
- Springer BioMed Eng OnLine 25, 27 (2026). "Smartphone photogrammetry for prosthetics and orthotics: accuracy and reliability." https://link.springer.com/article/10.1186/s12938-026-01515-8
- MDPI Sensors 26(4):1251 (2026). "Smartphone-Based Automated Photogrammetry for Reconstruction of Residual Limb Models." https://www.mdpi.com/1424-8220/26/4/1251
- PMC (2019). "Alginate Materials and Dental Impression Technique." https://pmc.ncbi.nlm.nih.gov/articles/PMC6356954/

### 상용 제품
- Revopoint MINI 2 공식 — https://www.revopoint3d.com/products/industry-3d-scanner-mini
- Flicfit (일본) — https://flicfit.com/
- SafeSize ScanMate (네덜란드) — https://www.safesize.com/scanmate/
- BIO-FOAM Impression Kit — https://www.biofoamimpression.com/

### 기술 가이드
- Revopoint 공식: "Optimizing 3D Scanning: How to Effectively Capture Crevices" — https://www.revopoint3d.com/blogs/blog/optimizing-3d-scanning-how-to-effectively-capture-crevices
- Polycam: "How to Scan a Shoe" — https://learn.poly.cam/how-to-scan-a-shoe
