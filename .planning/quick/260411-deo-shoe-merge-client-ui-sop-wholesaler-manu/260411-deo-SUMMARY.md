---
quick_id: 260411-deo
description: shoe-merge-client UI + SOP + wholesaler manual
date: 2026-04-11
tasks: 3
status: completed
---

# Quick Task 260411-deo — Summary

## Deliverables

| # | Task | File | Lines | Commit |
|---|------|------|-------|--------|
| 1 | ShoeMergeClient admin UI | `src/components/admin/shoe-merge-client.tsx` | 861 | `4312d7b` |
| 2 | Internal SOP (Korean) | `docs/implementation/SOP-shoe-interior-scan-merge.md` | 183 | `57614a1` |
| 3 | Wholesaler manual (Korean) | `docs/implementation/MANUAL-wholesaler-shoe-registration.md` | 215 | `0b4cd9c` |

## Task 1 — ShoeMergeClient

Client component consumed by `src/app/(admin)/admin/dashboard/shoe-merge/page.tsx`. Built on existing shadcn primitives (Card, Button, Badge, Input, Label, Table, Alert) plus `sonner` toasts and `lucide-react` icons. No new dependencies.

Features:
- Two mesh file uploads (Revopoint partial interior + alginate cast) with extension whitelist (.stl/.obj/.ply/.gltf/.glb) and 100MB cap each.
- Auto-generated `scanId` via `crypto.randomUUID()`, user-editable.
- `POST multipart/form-data` to `/api/admin/shoe-scan/merge`.
- Color-coded quality indicators (green/yellow/red) for alignment RMSE, overlap, discrepancy count — thresholds match the SOP quality gate table (RMSE 1.0/2.0 mm, overlap 70/50 %, discrepancy 0/2).
- Resolved dimensions table, per-dimension resolution report (confidence + method), warnings list.
- Optional grading panel: takes the resolved dimensions as an anchor and POSTs to `/api/admin/shoe-scan/grade` with target sizes 230–290 mm (5 mm step), rendering the predictions table and `validation_warnings` / `used_piecewise` flags.
- Loading states, error toasts, form reset after success.

## Task 2 — Internal SOP

`docs/implementation/SOP-shoe-interior-scan-merge.md` — Korean, 183 lines. Covers:
- 장비 리스트 (Revopoint scanner, 알지네이트, 혼합 도구, 기준 마커)
- 사전 체크리스트 (신발 세척, 내부 준비, 조명, 캘리브레이션)
- Phase 1 Revopoint 부분 내부 스캔 (3–5분)
- Phase 2 알지네이트 캐스트 생성 (혼합비, 주입 기법, 경화 3–5분, 탈형)
- Phase 3 캐스트 외부 스캔 (2–3분)
- Phase 4 대시보드 병합 워크플로우 (`/admin/dashboard/shoe-merge`)
- 품질 기준 (RMSE/overlap/discrepancy 임계값 — UI 컴포넌트와 동일)
- 재스캔 기준, 트러블슈팅, 안전·위생, 파일명 규칙

## Task 3 — Wholesaler Manual

`docs/implementation/MANUAL-wholesaler-shoe-registration.md` — Korean, 215 lines. Business tone. Covers:
- 개요 (FitSole 맞춤 인솔-신발 세트 판매 모델)
- 제공 데이터 (내부 치수 + 사이즈별 그레이딩 예측)
- 도매 파트너 워크플로우
- 신발 모델 등록 양식 (브랜드, 모델명, 카테고리, 앵커 사이즈, 색상, 가격, MOQ)
- 앵커 사이즈 선정 기준
- 스캔 의뢰 절차
- 그레이딩 결과 해석 (`anchors_used`, `predictions`, `validation_warnings`, `used_piecewise`)
- 재고·주문 연동 흐름
- 품질 관리 / 반품 정책
- 지원 채널
- 내부 SOP 링크

## Verification

- `npx tsc --noEmit` — no errors in new files (pre-existing Payload CMS type errors in `.next/types/validator.ts` are unrelated).
- `package.json` unchanged — no new dependencies.
- `src/app/api/admin/shoe-scan/{merge,grade}/route.ts` unchanged.
- `src/app/(admin)/admin/dashboard/shoe-merge/page.tsx` default import now resolves.
- UI component and SOP share identical quality thresholds.

## TODO placeholders to fill before production

- Wholesaler partner support email
- SFTP upload URL for scan file submissions
- FitSole 측정팀 주소
- 번들 배송 정책 세부
- API 로드맵 타임라인
- 에스컬레이션 연락처

## Commits

```
0b4cd9c docs(quick/260411-deo): add wholesaler shoe registration manual
57614a1 docs(quick/260411-deo): add internal SOP for shoe interior scan + merge
4312d7b feat(quick/260411-deo): implement ShoeMergeClient admin UI
```
