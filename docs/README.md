# FitSole 문서 (Docs)

FitSole 프로젝트의 연구 자료 및 기술 문서.

## 📂 구조

```
docs/
├── README.md                              # 이 파일
├── research/                              # 조사/연구 자료
│   ├── 01-shoe-interior-scanning.md       # 신발 내부 스캐닝 기술 종합
│   ├── 02-shoe-size-grading.md            # 사이즈 그레이딩 엔진 원리
│   ├── 03-two-line-business-model.md      # 2-라인 비즈니스 아키텍처
│   └── 04-foot-measurement-science.md     # 발 측정 과학 (아치 79.4% + 힐컵 40.2%)
└── implementation/                        # 구현 가이드 (다음 세션)
    ├── shoe-scan-sop.md                   # 신발 타입별 스캔 SOP (pending)
    └── wholesale-partner-manual.md        # 도매상 교육 매뉴얼 (pending)
```

## 🎯 핵심 개념 요약

### 1. 2-Line 제품 구조
- **Line 1:** 카메라 기반 (일반 소비자, 온라인)
- **Line 2:** SALTED SDK 기반 (운동선수/전문가, 오프라인)

### 2. 신발 내부 측정 기술
- **주력:** Revopoint MINI 2 블루라이트 스캐너 ($790, ±0.02mm)
- **보조:** 치과용 알지네이트 캐스트 ($3~6/쌍, 블라인드 스팟 해결)
- **병합:** ICP 알고리즘 + 불일치 자동 해결 엔진

### 3. 사이즈 그레이딩 엔진
- 1개 사이즈만 스캔 → 나머지 15개 사이즈 수학적 추론
- 업계 표준 (Mondopoint 5mm, 볼넓이 0.7, 힐폭 0.4)
- 스캔 시간 **5~15배 단축**

### 4. 인솔 설계 핵심 원리
- **아치 높이:** 족저 응력의 **79.4%** 결정 → 최적 42mm (정상궁)
- **힐컵 깊이:** 족저 응력의 **40.2%** 결정 → 최적 20mm
- **Varioshore TPU 5-Zone:** 한 재료로 온도를 달리해 구간별 경도 구현

## 🔗 관련 구현 파일

### Python 측정 서비스
- `services/measurement/app/insole/optimizer.py` — 아치/힐컵 계산
- `services/measurement/app/insole/hardness_mapper.py` — 5-zone TPU 맵
- `services/measurement/app/shoe_scan/cavity_extractor.py` — 신발 공동 치수 추출
- `services/measurement/app/shoe_scan/grading.py` — 사이즈 그레이딩 엔진
- `services/measurement/app/shoe_scan/mesh_merger.py` — Revopoint + 캐스트 병합
- `services/measurement/app/api/shoe_merge.py` — 병합/그레이딩 API

### Next.js 프론트엔드
- `src/app/(admin)/admin/dashboard/shoe-merge/` — 관리자 병합 UI
- `src/app/api/admin/shoe-scan/merge/route.ts` — 병합 프록시
- `src/app/api/admin/shoe-scan/grade/route.ts` — 그레이딩 프록시
- `src/lib/shoe-models/types.ts` — 신발 모델 타입

## 📚 참고 논문 (주요)

- Hernandez & Lemaire 2017, *Prosthetics and Orthotics International* (±2.6mm)
- Springer BioMed Eng OnLine 2026 (±0.89mm 임상급)
- IJRASET — Footwear Pattern Making and Grading Calculations
- Frontiers in Bioengineering 2022 — 79.4%/40.2% FEA 연구

---

*문서 갱신: 2026-04-11*
