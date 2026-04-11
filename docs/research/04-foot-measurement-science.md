# 발 측정 과학 — 아치 79.4% + 힐컵 40.2% 원리

**작성일:** 2026-04-11
**핵심 출처:** Frontiers in Bioengineering and Biotechnology (2022), "Different Design Feature Combinations of Flatfoot Orthosis"

---

## 1. 핵심 발견

발의 생체역학 연구(FEA 다구찌 감도 분석)에서 밝혀진 사실:

- **아치 높이**가 족저 응력의 **79.4%**를 결정
- **힐컵 깊이**가 족저 응력의 **40.2%**를 결정
- 소재 강성, 내측 포스팅 각도 등 다른 변수는 **10~20%** 영향

→ **이 2가지만 정확히 맞추면 인솔 설계의 80% 이상이 해결됨**

---

## 2. 아치 높이가 79.4%인 이유 — 현수교 비유

발의 구조를 **현수교**에 비유하면 직관적이다:

```
         ← 족저근막 (케이블) →
    ━━━━━━━━━━━━━━━━━━━━━━━━━━
   /          아치 (다리)        \
  ■                              ■
[뒤꿈치 기둥]              [앞발 기둥]
```

**케이블이 느슨할 때 (아치 서포트 없음):**
```
    ← 느슨한 케이블 →
    ━━━━━━━━━━━━━━━━
         ↓↓↓↓        ← 다리가 처짐
   /     ↓↓↓↓        \
  ■      ████          ■
     [응력 집중]
```
→ 체중이 한 곳에 집중 → 편평족 통증

**케이블이 팽팽할 때 (적절한 아치 서포트):**
```
    ← 팽팽한 케이블 →
    ━━━━━━━━━━━━━━━━
   /  ↓  ↓  ↓  ↓  ↓  \
  ■                    ■
     [고른 분산]
```
→ 체중이 아치 전체에 분산 → **피크 압력 45.7% 감소**

### 2.1 측정 값

| 아치 유형 | 주상골 높이 (Navicular Drop) | 최적 인솔 아치 높이 |
|---------|---------------------------|-------------------|
| 편평족 (Flat) | <18mm | **32~38mm** (강한 지지) |
| 정상궁 (Normal) | 18~25mm | **38~45mm** (최적 42mm) |
| 요족 (High Arch) | >25mm | **45~55mm** (부드러운 지지) |

---

## 3. 힐컵 깊이가 40.2%인 이유 — 물풍선 비유

뒤꿈치 아래에는 **두꺼운 지방 패드(heel fat pad)**가 있다. 이것은 천연 쿠션.

**얕은 힐컵 (지방 패드 퍼짐):**
```
  체중 ↓↓↓
     ■■■
   ← 지방패드 →   ← 옆으로 퍼짐
  ████████████████
  = 뼈 아래 쿠션이 얇아짐
  = 충격이 직접 뼈에 전달
```
마치 물풍선을 바닥에 놓으면 납작하게 퍼지는 것과 같다.

**깊은 힐컵 (지방 패드 가둠):**
```
  체중 ↓↓↓
     ■■■
   | 지방패드 |  ← 옆으로 못 퍼짐
   |████████|
   [  컵  ]
   = 쿠션 두께 유지
   = 충격 균일 분산
```
물풍선을 컵 안에 넣으면 두껍게 유지되는 것과 같다.

### 3.1 측정 값

| 힐컵 깊이 | 용도 | 효과 |
|---------|------|------|
| 6mm | 패션 슈즈 | 최소 지지 |
| 12mm | 일반 운동화 | 기본 안정화 |
| 18mm | 맞춤 인솔 기본 | 지방 패드 고정 |
| **20mm** | **최적** | **피크 전단 응력 -20~42%, 피부 응력 -72~78%** |
| 25~30mm | 당뇨족/노인 | 최대 안정화 |

**20mm + EVA 내부 쿠션 10mm 조합이 연구 검증된 최적값**

---

## 4. 왜 다른 변수들은 영향이 작은가?

**79.4% vs 40.2%의 차이:**
- **아치 높이**는 **발 전체의 하중 경로**를 결정 → 영향 범위 최대
- **힐컵 깊이**는 **뒤꿈치 한 영역**만 제어 → 영향 범위 제한적

**다른 변수들 (소재 강성, 내측 포스팅 등):**
- 이미 결정된 하중 경로 위에서 **미세 조정**만 수행
- 각각 10~20% 영향

---

## 5. FitSole 구현

### 5.1 아치 높이 자동 계산

파일: `services/measurement/app/insole/optimizer.py`

```python
def calculate_optimal_arch_height(
    navicular_height: float,       # SfM 스캔에서 추출
    midfoot_pressure_ratio: float, # AI 추정
    body_weight: float,            # 사용자 입력
    foot_length: float,            # SfM 측정
) -> float:
    # 아치 유형 분류
    if navicular_height < 15.0:
        base = 35.0  # 편평족
    elif navicular_height > 25.0:
        base = 50.0  # 요족
    else:
        base = 42.0  # 정상궁 (최적)

    # 압력 기반 조정
    pressure_adj = (0.5 - midfoot_pressure_ratio) * 10.0

    # 체중 보정
    weight_adj = (body_weight - 70.0) * 0.05

    # 발 길이 비례
    length_scale = foot_length / 260.0

    result = (base + pressure_adj + weight_adj) * length_scale
    return max(25.0, min(60.0, result))  # 안전 범위
```

### 5.2 힐컵 깊이 자동 계산

```python
def calculate_optimal_heel_cup_depth(
    heel_peak_pressure: float,  # AI 추정
    pronation_degree: float,    # 보행 분석
    age: int,
    activity_type: str,
) -> float:
    result = 20.0  # 연구 최적값

    # 피크 압력 조정
    if heel_peak_pressure > 300.0:
        result += 5.0
    elif heel_peak_pressure > 200.0:
        result += 2.5

    # 회내/회외 보정
    result += abs(pronation_degree) * 0.5

    # 나이 보정 (40세 이후)
    result += max(0.0, (age - 40) * 0.1)

    # 활동 보정
    if activity_type == "running":
        result += 3.0
    elif activity_type == "standing":
        result += 2.0

    return max(15.0, min(35.0, result))
```

---

## 6. 참고 문헌

- Frontiers in Bioengineering and Biotechnology (2022). "Different Design Feature Combinations of Flatfoot Orthosis." — 다구찌 감도 분석 원본 논문
- MDPI 2024. "Biomechanical Evaluation via FEA for Custom Orthotics."
- Advanced Materials Technologies 2025. "AI-Assisted Custom Insoles via Digital Twin Framework."
- SAGE 2025. "3D-Printed Meshed-Silicone Orthotics with Dynamic Gait Integration."
- Taylor & Francis 2024. "Plantar Pressure Redistribution via Variable Stiffness 3D Printing."
