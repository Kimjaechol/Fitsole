# 신발 사이즈 그레이딩 조사 보고서

**작성일:** 2026-04-11
**관련 구현:** `services/measurement/app/shoe_scan/grading.py`
**핵심 가치:** 신발 1모델당 **1개 사이즈만 스캔**하고 나머지 15개 사이즈를 **수학적으로 추론** → 스캔 시간 5~15배 단축

---

## 1. 신발 제조사의 그레이딩 방식

### 1.1 "라스트(Last)"가 핵심

- **라스트:** 신발 제작에 사용되는 발 모양 형틀
- 제조사는 중간 사이즈 라스트 1개를 디자인하고, **수학적 규칙**으로 나머지 사이즈를 자동 확장/축소
- 이 규칙이 "그레이딩(Grading)"

### 1.2 업계 표준 그레이딩 규칙

출처: [IJRASET Footwear Pattern Making](https://www.ijraset.com/research-paper/footwear-pattern-making-and-grading-calculations-based-on-international-standard-of-measurements), [NIST Shoe Size Grading](https://www.nist.gov/glossary-term/31921), [Shoemakers Academy](https://shoemakersacademy.com/grade-shoe-pattern/)

**길이(Length) 증분:**
- **영국/미국 시스템:** 하프 사이즈당 **4.23mm**
- **프랑스 시스템:** 풀 사이즈당 **6.67mm**
- **Mondopoint (ISO 9407):** 풀 사이즈당 **5mm** ← 한국 시장 표준
- **한국:** 5mm 증분 (270mm → 275mm → 280mm...)

**볼넓이(Ball Width) 증분:**
- 1 풀 사이즈당 약 **3.5mm**
- Mondopoint 환산: **0.70 × 길이 차이**
- 예: 270 → 275 (길이 +5mm), 볼넓이 +3.5mm

**힐 폭(Heel Width) 증분:**
- 1 풀 사이즈당 약 **2.0mm**
- Mondopoint 환산: **0.40 × 길이 차이**

**토박스 볼륨(Toe Box Volume):**
- **Isometric scaling** — 거의 길이의 3승에 비례
- 실제: 길이의 **2.5승**이 경험적으로 더 정확
- 예: 길이가 10% 커지면 볼륨은 약 27% 커짐

**아치 위치(Arch X):**
- 길이의 **약 55%** 위치 (고정 비율)
- 사이즈 증가 시 아치 위치도 비례하여 이동

**발등 여유(Instep Clearance):**
- 미미하게 증가 (1mm당 0.25mm)

**힐컵 깊이(Heel Cup Depth):**
- 거의 고정 (1mm당 0.10mm 증가)

### 1.3 브랜드별 편차

**표준 준수 브랜드:** 나이키, 아디다스, 뉴발란스, 컨버스 (대부분 표준 규칙 따름)
**편차 있는 브랜드:** 일부 유럽 명품 브랜드, 수제화 브랜드 (독자 그레이딩 사용)
**편차 검증:** 2~3개 앵커 사이즈를 실제 스캔하여 편차 측정

---

## 2. FitSole 그레이딩 엔진 구현

### 2.1 파일 위치

```
services/measurement/app/shoe_scan/grading.py
```

### 2.2 핵심 상수

```python
LENGTH_GRADE_PER_MM = 1.0       # 1mm 사이즈 차이 → 1mm 길이 증가
BALL_WIDTH_GRADE_RATIO = 0.70   # 볼넓이 = 길이 차이의 70%
HEEL_WIDTH_GRADE_RATIO = 0.40   # 힐 폭 = 길이 차이의 40%
INSTEP_GRADE_RATIO = 0.25       # 발등 여유
HEEL_CUP_GRADE_RATIO = 0.10     # 힐컵 깊이
TOE_BOX_VOLUME_EXPONENT = 2.5   # 토박스 볼륨은 length^2.5
```

### 2.3 두 가지 그레이딩 모드

**Mode 1: 선형 그레이딩 (1개 앵커)**
```python
grade_linear(
    base_size=270,
    base_dimensions=dims_at_270,
    target_size=265,
) → 265mm 예측 치수
```

**Mode 2: 구간별 그레이딩 (2+ 앵커)**
```python
grade_piecewise(
    anchors=[
        GradingAnchor(245, dims_at_245),
        GradingAnchor(265, dims_at_265),
        GradingAnchor(285, dims_at_285),
    ],
    target_size=275,  # 265~285 사이 보간
) → 275mm 예측 치수
```

### 2.4 검증 기능

```python
validate_anchor_consistency(anchors, max_deviation_mm=1.5)
```

여러 앵커가 있으면 브랜드가 **표준 그레이딩을 사용하는지** 자동 검증.
편차가 1.5mm 이상이면 경고 → 해당 브랜드는 비표준 그레이딩 가능성.

---

## 3. 운영 효율 분석

### 3.1 전통 방식: 모든 사이즈 개별 스캔

신발 1모델 (220mm ~ 290mm, 5mm 간격 15 사이즈):
- Revopoint 직접 스캔: 5분 × 15 = **75분**
- 하이브리드 (캐스트 포함): 12분 × 15 = **180분**

### 3.2 그레이딩 방식: 1~3 사이즈만 스캔

- **1개 앵커 (중간 사이즈만):** 12분 + API 호출 1초 = **약 12분**
- **3개 앵커 (소/중/대):** 36분 + API 호출 1초 = **약 36분**

### 3.3 시간 절약

| 방식 | 시간 | 효율 |
|------|------|------|
| 전체 스캔 | 180분 | 기준 |
| 1 앵커 | 12분 | **15배 단축** |
| 3 앵커 | 36분 | **5배 단축** |

**일일 생산성:**
- 전체 스캔: 8시간 / 180분 = **2~3 모델/일**
- 1 앵커 그레이딩: 8시간 / 12분 = **40 모델/일**

---

## 4. 권장 운영 방식

### 4.1 초기 단계 (DB 부트스트랩)

- **앵커 수:** 1개 (중간 사이즈, 보통 270mm)
- **검증:** 스캔한 첫 100개 모델에 대해 그레이딩 예측 → 실측 비교
- **목표:** 하루 30~40 모델 DB 등록

### 4.2 중기 단계 (정확도 향상)

- **앵커 수:** 3개 (245, 265, 285mm)
- **이유:** 브랜드별 편차 자동 감지 및 보정
- **편차 감지 시:** 해당 브랜드는 5개 앵커로 확대

### 4.3 성숙 단계 (품질 보증)

- **주요 브랜드:** 모든 모델 3개 앵커
- **소수 브랜드:** 1개 앵커로 대량 등록
- **크라우드소싱:** 사용자가 자신의 신발 기여 가능

---

## 5. API 엔드포인트

### 5.1 `POST /shoe-scan/grade`

**Request:**
```json
{
  "anchors": [
    {
      "size_base": 270,
      "dimensions": {
        "internal_length": 278.2,
        "internal_width": 102.1,
        "heel_cup_depth": 15.3,
        "arch_support_x": 153.0,
        "toe_box_volume": 48.5,
        "instep_clearance": 35.2
      }
    }
  ],
  "target_sizes": [240, 245, 250, 255, 260, 265, 275, 280, 285, 290]
}
```

**Response:**
```json
{
  "anchors_used": 1,
  "predictions": {
    "240": { "internal_length": 248.2, "internal_width": 81.1, ... },
    "245": { "internal_length": 253.2, "internal_width": 84.6, ... },
    ...
  },
  "validation_warnings": [],
  "used_piecewise": false
}
```

---

## 6. 참고 문헌

- Footwear Pattern Making and Grading Calculations (IJRASET) — https://www.ijraset.com/research-paper/footwear-pattern-making-and-grading-calculations-based-on-international-standard-of-measurements
- NIST Shoe Size Grading — https://www.nist.gov/glossary-term/31921
- Shoemakers Academy: Pattern Grading — https://shoemakersacademy.com/grade-shoe-pattern/
- Shoe Sizing Systems (Fibre2Fashion) — http://images.fibre2fashion.com/ArticleResources/PdfFiles/47/4697.pdf
- Analysis of 1.2 million foot scans (PMC) — https://pmc.ncbi.nlm.nih.gov/articles/PMC6914786/
- Mondopoint ISO 9407 — https://en.wikipedia.org/wiki/Shoe_size
