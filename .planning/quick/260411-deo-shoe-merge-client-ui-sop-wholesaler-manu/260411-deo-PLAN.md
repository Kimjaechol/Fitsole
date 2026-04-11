---
phase: quick/260411-deo
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/admin/shoe-merge-client.tsx
  - docs/implementation/SOP-shoe-interior-scan-merge.md
  - docs/implementation/MANUAL-wholesaler-shoe-registration.md
autonomous: true
requirements:
  - QUICK-260411-DEO-A  # shoe-merge-client UI component
  - QUICK-260411-DEO-B  # SOP for scan + merge workflow
  - QUICK-260411-DEO-C  # Wholesaler registration manual

must_haves:
  truths:
    - "Visiting /admin/dashboard/shoe-merge renders the ShoeMergeClient without a missing-import error"
    - "Admin can upload a Revopoint mesh + alginate cast mesh, provide a scanId, and submit to /api/admin/shoe-scan/merge"
    - "After a successful merge, admin sees alignment_rmse, overlap_percentage, discrepancy_count, resolved_dimensions table, per-dimension resolution_report, and warnings list"
    - "RMSE and overlap values are color-coded (green/yellow/red) so operators can judge scan quality at a glance"
    - "Admin can click '사이즈 그레이딩 실행' to take the resolved dimensions as an anchor and get predictions for Korean sizes 230–290mm rendered in a table"
    - "Internal operators have a Korean SOP covering Revopoint scan → alginate cast → merge workflow with equipment, step-by-step procedure, quality gates, and troubleshooting"
    - "Wholesale partners have a Korean manual covering the business model, shoe registration form, anchor size selection, scan handoff, grading-result interpretation, and support channels"
  artifacts:
    - path: "src/components/admin/shoe-merge-client.tsx"
      provides: "Admin merge upload/result view — default exported React client component"
      exports: ["default (ShoeMergeClient)"]
      min_lines: 250
    - path: "docs/implementation/SOP-shoe-interior-scan-merge.md"
      provides: "Internal SOP for Revopoint + alginate capture and admin merge"
      contains: "## 장비"
      min_lines: 150
    - path: "docs/implementation/MANUAL-wholesaler-shoe-registration.md"
      provides: "External wholesale-partner manual for shoe registration + size grading interpretation"
      contains: "## 도매 파트너 워크플로우"
      min_lines: 150
  key_links:
    - from: "src/app/(admin)/admin/dashboard/shoe-merge/page.tsx"
      to: "src/components/admin/shoe-merge-client.tsx"
      via: "default import ShoeMergeClient from @/components/admin/shoe-merge-client"
      pattern: "ShoeMergeClient"
    - from: "src/components/admin/shoe-merge-client.tsx"
      to: "/api/admin/shoe-scan/merge"
      via: "fetch multipart/form-data POST"
      pattern: "/api/admin/shoe-scan/merge"
    - from: "src/components/admin/shoe-merge-client.tsx"
      to: "/api/admin/shoe-scan/grade"
      via: "fetch JSON POST with anchors[] + target_sizes[]"
      pattern: "/api/admin/shoe-scan/grade"
---

<objective>
Deliver the missing admin-facing UI for the shoe-scan merge + grading pipeline and
the two supporting documents (internal SOP, external wholesaler manual) that make
the workflow operable end-to-end.

Purpose:
- Right now `/admin/dashboard/shoe-merge` crashes because `@/components/admin/shoe-merge-client`
  does not exist. This plan implements that component against the already-completed
  merge + grade APIs so operators can actually run the Revopoint + alginate hybrid
  workflow from the dashboard.
- Operators need a written SOP to execute the physical capture steps consistently.
- Wholesale partners need a business-facing manual that explains how their shoes
  get registered, graded across sizes, and flow into the order pipeline.

Output:
- `src/components/admin/shoe-merge-client.tsx` (new client component)
- `docs/implementation/SOP-shoe-interior-scan-merge.md` (new Korean SOP)
- `docs/implementation/MANUAL-wholesaler-shoe-registration.md` (new Korean manual)

Out of scope: modifying either API route, adding new dependencies, any DB work.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@./CLAUDE.md

@src/app/api/admin/shoe-scan/merge/route.ts
@src/app/api/admin/shoe-scan/grade/route.ts
@src/app/(admin)/admin/dashboard/shoe-merge/page.tsx
@src/lib/shoe-models/types.ts
@src/components/admin/scan-data-viewer.tsx
@src/components/admin/design-spec-viewer.tsx
@docs/research/01-shoe-interior-scanning.md
@docs/research/02-shoe-size-grading.md

<interfaces>
<!-- Key contracts the executor needs. Extracted from the codebase. -->
<!-- Do not re-explore the codebase for these — use them directly. -->

From src/app/api/admin/shoe-scan/merge/route.ts (request + response contract):
```
POST /api/admin/shoe-scan/merge
Content-Type: multipart/form-data
  revopoint_mesh: File (.stl | .obj | .ply | .gltf | .glb)
  cast_mesh:      File (.stl | .obj | .ply | .gltf | .glb)
  scanId:         string (non-empty; UUID recommended)

Response 200 (JSON):
{
  success: boolean;
  alignment_rmse: number;          // mm
  overlap_percentage: number;      // 0–100
  discrepancy_count: number;
  resolved_dimensions: ShoeInternalDimensions; // see types.ts
  resolution_report: Record<string, { confidence: number; method: string; note?: string }>;
  warnings: string[];
}

Response 4xx/5xx (JSON): { error: string; detail?: string }
```

From src/app/api/admin/shoe-scan/grade/route.ts (request + response contract):
```
POST /api/admin/shoe-scan/grade
Content-Type: application/json
{
  anchors: Array<{ size_base: number; dimensions: ShoeInternalDimensions }>;
  target_sizes: number[];  // e.g. [230, 235, 240, ..., 290]
}

Response 200 (JSON):
{
  anchors_used: number;
  predictions: Record<string /* size */, ShoeInternalDimensions>;
  validation_warnings: string[];
  used_piecewise: boolean;
}

Response 4xx/5xx (JSON): { error: string; detail?: string }
```

From src/lib/shoe-models/types.ts — what the server returns for resolved_dimensions
and predictions[size] should be treated as:
```ts
// A flexible ShoeInternalDimensions shape. The existing ShoeScanResult.measurements
// uses the following fields. Treat them all as number | null and render defensively:
//   internalLength   (mm)
//   internalWidth    (mm)
//   heelCupDepth     (mm)
//   archSupportX     (mm)
//   toeBoxVolume     (mm³ or cm³ — display as-is from server)
//   instepClearance  (mm)
// The server may return additional keys — render any extra numeric fields generically.
```

Available shadcn/ui primitives in src/components/ui/:
  accordion, alert, avatar, badge, button, card, dialog, input, label,
  progress, separator, skeleton, sonner, table, tabs, toggle

Existing toast library: `sonner` (already configured; use `import { toast } from "sonner"`).
Existing icon library: `lucide-react` (use e.g. `Upload`, `CheckCircle2`, `AlertTriangle`,
  `Loader2`, `RefreshCcw`).
</interfaces>

<file_creation_rules>
Do not modify:
  - src/app/api/admin/shoe-scan/merge/route.ts
  - src/app/api/admin/shoe-scan/grade/route.ts
  - src/app/(admin)/admin/dashboard/shoe-merge/page.tsx (already imports the component)

Create only:
  - src/components/admin/shoe-merge-client.tsx
  - docs/implementation/SOP-shoe-interior-scan-merge.md
  - docs/implementation/MANUAL-wholesaler-shoe-registration.md
</file_creation_rules>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Implement ShoeMergeClient component (upload + merge result + optional grading)</name>
  <files>src/components/admin/shoe-merge-client.tsx</files>
  <behavior>
    User-visible behaviors the component must exhibit:
    - Rendering: mounts without throwing when placed inside /admin/dashboard/shoe-merge page.
    - Form: two file inputs (Revopoint mesh, alginate cast mesh) + scanId text input.
    - Auto-fill: scanId defaults to a generated UUID (crypto.randomUUID()) on mount;
      user can overwrite.
    - Client-side validation before POST:
        * both files required
        * extension whitelist: .stl, .obj, .ply, .gltf, .glb (case-insensitive)
        * per-file size ≤ 100MB — reject with toast.error describing the rejected file
        * scanId non-empty (trimmed)
    - Submit disables the button, shows a Loader2 spinner and "병합 중..." label,
      and posts multipart/form-data to /api/admin/shoe-scan/merge.
    - On success: render a result card containing
        * alignment_rmse (mm, 3 decimals) with color badge
        * overlap_percentage (1 decimal) with color badge
        * discrepancy_count (integer) with a warning badge if > 0
        * resolved_dimensions table (key/value, Korean labels where known,
          numbers to 2 decimals, null → "—")
        * resolution_report table: dimension | method | confidence (0.00–1.00) | note
        * warnings list (yellow alert) — hidden if empty
    - On failure (non-2xx or network error): toast.error with the server-provided
      error message (falls back to a generic Korean message) and keeps the form values
      so the user can retry.
    - "다시 업로드" button clears both files, regenerates scanId, and clears result.
    - Optional grading block (only visible after a successful merge):
        * input for anchor sizeBase (number, default 270, min 200, max 320, step 5)
        * read-only summary of which resolved_dimensions will be used as the anchor
        * button "사이즈 그레이딩 실행"
        * on click, POSTs JSON to /api/admin/shoe-scan/grade with
          anchors: [{ size_base: <input>, dimensions: resolvedDimensions }] and
          target_sizes: [230, 235, 240, 245, 250, 255, 260, 265, 270, 275, 280, 285, 290]
          (filter out the anchor size so the anchor is not a target)
        * renders prediction table: rows = sizes ascending, columns = same dimension
          keys as the resolved_dimensions
        * shows anchors_used, used_piecewise (Korean label "구간별 보간 사용 여부"),
          and validation_warnings (yellow alert) beneath the table
    - Color-coding thresholds (document them inline as constants with comments —
      they are sensible defaults, not a hard research requirement):
        * RMSE: < 1.0 mm = green ("우수"), < 2.0 mm = yellow ("보통"),
          ≥ 2.0 mm = red ("재스캔 권장")
        * overlap: > 70% = green ("우수"), > 50% = yellow ("보통"),
          ≤ 50% = red ("재스캔 권장")
        * discrepancy_count: 0 = green, 1–2 = yellow, ≥ 3 = red
  </behavior>
  <action>
    Create `src/components/admin/shoe-merge-client.tsx` as a 'use client' default-export
    React component. Use the shadcn/ui primitives already in the repo (Card, CardContent,
    Button, Badge, Input, Label, Table, Alert, Separator) and lucide-react icons. Use
    `toast` from `sonner` for error notifications. Do NOT add any new npm dependencies.

    Match the visual style of src/components/admin/scan-data-viewer.tsx and
    src/components/admin/design-spec-viewer.tsx (Card-wrapped sections, slate-900
    headings, tabular-nums for numeric tables, Korean labels).

    Structure the component into clearly named internal pieces (single file):
      - Constants: ACCEPTED_EXTENSIONS, MAX_FILE_BYTES (100 * 1024 * 1024),
        DEFAULT_TARGET_SIZES, DIMENSION_LABELS (Korean), RMSE_THRESHOLDS,
        OVERLAP_THRESHOLDS, DISCREPANCY_THRESHOLDS.
      - Types: MergeResponse, GradeResponse, QualityBand ("good" | "warn" | "bad")
        and matching helper `qualityClass(band)` returning a Tailwind class set
        (green/yellow/red).
      - Local state via React useState: revopointFile, castFile, scanId, isSubmitting,
        mergeResult, anchorSize, isGrading, gradeResult.
      - useEffect on mount to seed scanId with crypto.randomUUID() (guard for
        typeof crypto !== 'undefined'; fall back to Date.now()+Math.random() otherwise).
      - Helpers: validateFile(file, label), formatNumber(v, decimals), renderValue(v)
        (handles null → '—'), buildDimensionRows(dims).
      - Sub-render functions (inside the same file, not exported): UploadForm,
        MergeResultCard, GradingSection, PredictionsTable.
      - handleSubmit: validates → FormData → fetch('/api/admin/shoe-scan/merge',
        { method: 'POST', body: form }) → parses JSON → sets mergeResult → on
        non-ok show toast.error(json.error ?? '병합에 실패했습니다').
      - handleGrade: builds anchors[] from resolvedDimensions (strip undefined keys)
        → POSTs JSON → sets gradeResult → error toast on failure.
      - handleReset: clears file inputs (use refs or controlled keys), regenerates
        scanId, clears mergeResult + gradeResult.

    Do NOT use ShoeInternalDimensions as a strict type constraint on the merge
    response — the Python backend may evolve its keys, so type the dimensions as
    `Record<string, number | null | undefined>` and render generically. Provide
    DIMENSION_LABELS mapping for the known keys (internalLength → "내부 길이",
    internalWidth → "내부 너비", heelCupDepth → "힐컵 깊이", archSupportX → "아치 지지점 X",
    toeBoxVolume → "토박스 부피", instepClearance → "발등 여유"); fall back to the raw
    key for anything unknown.

    Accessibility: every file input has a visible <Label>, submit button uses
    type="submit" inside a <form onSubmit>, loading states set aria-busy on the form.

    Must remain a single self-contained file — no new shared helpers, no new exports
    beyond the default component.
  </action>
  <verify>
    <automated>cd /Users/kimjaechol/Documents/test &amp;&amp; npx tsc --noEmit -p tsconfig.json 2>&amp;1 | tee /tmp/shoe-merge-tsc.log &amp;&amp; test -f src/components/admin/shoe-merge-client.tsx &amp;&amp; grep -q "shoe-scan/merge" src/components/admin/shoe-merge-client.tsx &amp;&amp; grep -q "shoe-scan/grade" src/components/admin/shoe-merge-client.tsx &amp;&amp; grep -q "crypto.randomUUID" src/components/admin/shoe-merge-client.tsx</automated>
  </verify>
  <done>
    - `src/components/admin/shoe-merge-client.tsx` exists with a default-exported
      'use client' React component.
    - `npx tsc --noEmit` has no new errors introduced by this file.
    - The component posts to both `/api/admin/shoe-scan/merge` (multipart) and
      `/api/admin/shoe-scan/grade` (JSON) using `fetch`.
    - File extension + 100MB size validation + scanId auto-generation are present.
    - Merge result card renders RMSE / overlap / discrepancy / dimensions / resolution
      report / warnings with color-coded quality badges.
    - Grading section renders a predictions table for Korean sizes 230–290 and
      surfaces `validation_warnings` + `used_piecewise`.
    - No new npm dependencies added (`git diff package.json` shows no changes).
    - Manually visiting `/admin/dashboard/shoe-merge` as an admin no longer throws
      a missing-module error (verified via `npx tsc` resolution; no runtime test
      required in this plan).
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Write internal SOP — Revopoint + 알지네이트 신발 내부 스캔/병합</name>
  <files>docs/implementation/SOP-shoe-interior-scan-merge.md</files>
  <behavior>
    A Korean-language Standard Operating Procedure targeted at internal operators
    who will physically scan shoes and run the admin merge tool. Must be usable as a
    standalone printout on the workbench — an operator should be able to follow it
    start to finish without opening any other document.
  </behavior>
  <action>
    Create `docs/implementation/SOP-shoe-interior-scan-merge.md` in Korean.
    Source facts from `docs/research/01-shoe-interior-scanning.md` where possible
    (Revopoint MINI 2, 알지네이트 캐스트 하이브리드, 신발 타입별 전략 매트릭스 등).
    Do not invent numbers the research doc doesn't support — when unsure, mark a
    value as "참고값" and reference section 3 of the research doc.

    Required top-level sections (use exactly these H2 headings so downstream
    verification can grep):

    1. `# 신발 내부 스캔 + 병합 SOP`
       - Last-updated line and intended operator role (측정팀).
    2. `## 목적`
       - 한 문단: 왜 이 절차가 존재하고 어떤 결과물을 만들어내는가(= 병합된 내부 치수가
         맞춤 인솔 설계의 입력이 된다).
    3. `## 장비`
       - Markdown table: 품목 | 모델/규격 | 용도 | 비고
       - 최소 항목: Revopoint MINI 2 Advanced, 턴테이블, 치과용 알지네이트(Hydrogum 5 등),
         알지네이트 혼합 보울 + 스파츌라, 주사기(60cc+), 비닐 라이너, LED 링 조명,
         정밀 저울, 스톱워치, 일회용 장갑, 마스크.
    4. `## 사전 체크리스트`
       - Markdown checklist:
         * 신발 내부 이물질 제거(브러시), 젖어있지 않은 상태 확인
         * 작업대 조명 ≥ 500 lux, 간접광
         * Revopoint 소프트웨어 버전 확인 및 캘리브레이션(월 1회)
         * 알지네이트 온도(실온 20–25°C)와 물 온도(차가울수록 경화 지연)
         * 기준 마커(스티커 또는 패턴 타겟) 부착 위치 확인
         * 샘플 신발에 고유 scanId 발급(UUID) — 이후 모든 산출물 파일명 접두사로 사용
    5. `## Phase 1 — Revopoint 부분 내부 스캔 (3~5분)`
       - Step-by-step 번호 리스트. 포함해야 할 단계:
         1) 신발 입구를 위로 두고 턴테이블 중앙에 고정
         2) LED 링 조명 ON, 반사 최소화 각도 조정
         3) Revopoint "Body" 모드, resolution "High"(참고값)
         4) 입구 기준으로 ±30° 범위에서 천천히 궤적 촬영
         5) 토박스/힐컵 뒷벽 사각지대는 기록만 하고 강제로 찍지 않는다(후속 캐스트가 담당)
         6) `.stl`로 저장, 파일명 `{scanId}-revopoint.stl`
       - 대상 파일 포맷: .stl(기본), .obj/.ply/.gltf/.glb 허용.
       - Coverage 권고: 입구로부터 들어가는 영역의 표면 커버리지 ≥ 60% 권장(참고값).
    6. `## Phase 2 — 알지네이트 캐스트 생성 (3~5분 경화)`
       - 번호 리스트. 포함해야 할 단계:
         1) 신발 내부에 비닐 라이너 밀착 삽입(이형제 역할)
         2) 알지네이트 분말 + 물 혼합 비율(제품 권장치 따름, 일반 치과용 1:0.9 w/w 참고)
         3) 60초 내에 크림 질감까지 혼합
         4) 주사기로 뒤꿈치 → 아치 → 토박스 순으로 주입(공기 갇힘 방지)
         5) 경화 대기 3~5분(제품별 상이, 스톱워치 사용)
         6) 비닐 라이너와 함께 캐스트 추출, 신발 내부 이물 없는지 확인
       - 안전 주의: 알지네이트 분진 마스크 착용, 라이너 없는 경우 신발 손상 위험 경고.
    7. `## Phase 3 — 캐스트 외부 스캔 (2~3분)`
       - 번호 리스트: 턴테이블 위에 캐스트 세팅 → 360° 회전 스캔 → `.stl` 저장
         → 파일명 `{scanId}-cast.stl`.
    8. `## Phase 4 — 관리자 대시보드 병합`
       - URL 명시: `/admin/dashboard/shoe-merge`
       - 업로드 순서: Revopoint 파일 → 알지네이트 캐스트 파일 → scanId 입력
       - "병합 실행" 후 결과 화면에서 확인해야 할 지표:
         * alignment_rmse (녹색/노랑/빨강 기준 명시)
         * overlap_percentage
         * discrepancy_count
         * resolved_dimensions 값 spot-check
       - 필요 시 "사이즈 그레이딩 실행" 버튼을 눌러 Korean size 230–290 예측값 확보.
    9. `## 품질 기준 (Quality Gates)`
       - Markdown table: 지표 | 합격 | 주의 | 재스캔 필요
         * alignment_rmse | < 1.0 mm | 1.0–2.0 mm | ≥ 2.0 mm
         * overlap_percentage | > 70% | 50–70% | ≤ 50%
         * discrepancy_count | 0 | 1–2 | ≥ 3
       - 주의: 위 값은 UI와 동일한 기본 임계값이며, 실측 데이터 누적 후 조정 가능.
    10. `## 재스캔 기준`
       - 어떤 경우에 Phase 1 또는 Phase 2/3를 다시 수행해야 하는지 bullet 리스트.
    11. `## 트러블슈팅`
       - Markdown table: 증상 | 원인 추정 | 조치
       - 최소 6개 항목 (예: 캐스트 추출 시 찢어짐, 토박스 공기 갇힘, RMSE 과다,
         overlap 낮음, Revopoint 스캔 노이즈, 알지네이트 조기 경화).
    12. `## 안전 및 위생`
       - 분진, 라텍스 알레르기, 장비 청소(캐스트 잔여물) 관련 bullet 리스트.
    13. `## 산출물 및 파일명 규칙`
       - `{scanId}-revopoint.stl`, `{scanId}-cast.stl`, 병합 결과 JSON 저장 경로 제안.
    14. `## 참고 문서`
       - `docs/research/01-shoe-interior-scanning.md` 링크.

    Tone: neutral, operational. Use tables for anything with ≥ 3 parallel items.
    Target length ≥ 150 lines.
  </action>
  <verify>
    <automated>test -f docs/implementation/SOP-shoe-interior-scan-merge.md &amp;&amp; awk 'END{print NR}' docs/implementation/SOP-shoe-interior-scan-merge.md | awk '$1 >= 150 {exit 0} {exit 1}' &amp;&amp; grep -q "^## 장비" docs/implementation/SOP-shoe-interior-scan-merge.md &amp;&amp; grep -q "^## Phase 1" docs/implementation/SOP-shoe-interior-scan-merge.md &amp;&amp; grep -q "^## Phase 2" docs/implementation/SOP-shoe-interior-scan-merge.md &amp;&amp; grep -q "^## Phase 3" docs/implementation/SOP-shoe-interior-scan-merge.md &amp;&amp; grep -q "^## Phase 4" docs/implementation/SOP-shoe-interior-scan-merge.md &amp;&amp; grep -q "^## 품질 기준" docs/implementation/SOP-shoe-interior-scan-merge.md &amp;&amp; grep -q "^## 트러블슈팅" docs/implementation/SOP-shoe-interior-scan-merge.md &amp;&amp; grep -q "/admin/dashboard/shoe-merge" docs/implementation/SOP-shoe-interior-scan-merge.md</automated>
  </verify>
  <done>
    - `docs/implementation/SOP-shoe-interior-scan-merge.md` exists, ≥ 150 lines,
      entirely in Korean.
    - All required H2 sections are present and grep-verified.
    - Equipment, pre-scan checklist, Phase 1–4, quality gates, rescan criteria,
      troubleshooting, safety & hygiene, output file naming, and references are
      all covered.
    - Quality-gate thresholds match the ShoeMergeClient defaults from Task 1
      (RMSE 1.0/2.0 mm, overlap 70/50%, discrepancy 0/2).
    - The admin dashboard URL `/admin/dashboard/shoe-merge` is referenced so
      operators can find the tool.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Write wholesaler manual — 신발 등록 + 사이즈 그레이딩 가이드</name>
  <files>docs/implementation/MANUAL-wholesaler-shoe-registration.md</files>
  <behavior>
    A Korean-language, business-tone manual for external wholesale partners explaining
    how their shoe models get scanned, registered, and size-graded on FitSole, and
    what data FitSole will return to them. Must stand alone as an onboarding document
    the partner can read without internal context.
  </behavior>
  <action>
    Create `docs/implementation/MANUAL-wholesaler-shoe-registration.md` in Korean.
    Source business-model facts from `.planning/PROJECT.md` and `./CLAUDE.md`, and
    size-grading mechanics from `docs/research/02-shoe-size-grading.md` (do not
    invent numbers that contradict those sources). Do not reveal internal SOP
    details like alginate chemistry — link to the SOP for internal details.

    Required top-level sections (use these exact H2 headings):

    1. `# FitSole 도매 파트너 신발 등록 매뉴얼`
       - 개정일, 대상 독자(도매/브랜드 파트너), 문의 채널 링크.
    2. `## 개요`
       - FitSole의 "맞춤 인솔 + 신발 세트" 판매 모델 2~3 문단 설명.
       - 왜 신발 모델별 내부 치수가 중요한지(브랜드/모델별 최대 11mm 편차 — 연구 doc 01
         인용) 1 문단.
       - 파트너가 얻는 가치(반품률 감소, 타겟팅된 고객 세그먼트 노출) bullet 리스트.
    3. `## FitSole이 제공하는 데이터`
       - 각 신발 모델에 대해 파트너가 받게 되는 항목:
         * 스캔된 내부 치수(내부 길이/너비/힐컵 깊이/아치 지지점/토박스 부피/발등 여유)
         * 사이즈별 그레이딩 예측값 (Korean size 230–290mm)
         * 그레이딩 validation_warnings 의미 요약
         * 품질 지표(alignment_rmse, overlap_percentage)
    4. `## 도매 파트너 워크플로우`
       - 번호 리스트 또는 단계별 표:
         1) 신발 모델 등록 요청서 제출
         2) 앵커 사이즈 샘플 발송
         3) FitSole 측정팀 스캔 + 병합
         4) 치수/그레이딩 검수 및 승인
         5) 카탈로그 등록, 판매 개시
         6) 주문 발생 시 알림 → 신발 + 인솔 배송 흐름
    5. `## 신발 모델 등록 양식`
       - Markdown table (필드명 | 필수 | 예시 | 설명). 필드:
         * 브랜드 | 필수 | Nike |
         * 모델명 | 필수 | Air Force 1 |
         * variant(색상/스타일) | 선택 | White Low |
         * 카테고리 | 필수 | running/casual/dress/boots/sandals/sports |
         * fitType | 선택 | narrow/standard/wide (모르면 FitSole이 스캔 후 결정)
         * 기본 사이즈(앵커) | 필수 | 270mm |
         * 가격(원) | 필수 | 159,000 |
         * MOQ(최소 주문 수량) | 필수 | 10족 |
         * 이미지 URL 또는 첨부 | 필수 |
         * 특이사항(기능성/방수/메탈릭 등) | 선택 |
    6. `## 앵커 사이즈 선정 기준`
       - 권장: 중간 사이즈 1개 (270mm) + 가능하면 small(250) / large(290) 추가.
       - 이유: 사이즈 간 보간 정확도 — `docs/research/02-shoe-size-grading.md` 인용.
       - 2개 이상 앵커 제공 시 grade API의 `used_piecewise: true` 응답과 더 낮은
         `validation_warnings` 빈도를 기대할 수 있음을 설명.
    7. `## 스캔 의뢰 절차`
       - 옵션 A: FitSole 측정팀에 샘플 발송(주소, 회수 여부, 소요 기간).
       - 옵션 B: 파트너 자체 장비로 스캔하는 경우 — 요구 파일 포맷
         (.stl/.obj/.ply/.gltf/.glb), 파일명 규칙, 업로드 경로(SFTP/이메일 등 placeholder).
       - 내부 작업 절차는 `SOP-shoe-interior-scan-merge.md`에 명시되어 있음을 링크.
    8. `## 사이즈 그레이딩 결과 이해하기`
       - 예시 응답 블록(JSON) — 필드 `anchors_used`, `predictions`,
         `validation_warnings`, `used_piecewise`를 포함.
       - 각 필드의 의미를 bullet 리스트로 설명. 특히:
         * `used_piecewise: true` = 다중 앵커 사이 선형 구간별 보간 사용
         * `validation_warnings` 예시 3가지와 해석
       - 파트너가 승인 여부를 판단하는 체크리스트 (예: 주요 사이즈 범위 warning 0건,
         RMSE < 1.0 mm 등).
    9. `## 재고 및 주문 연동`
       - 주문 발생 → 도매 파트너 알림(이메일/대시보드) → 신발 배송 + FitSole에서
         인솔 제작 → 합포장/직배송 여부 정책 placeholder.
       - 재고 업데이트 주기, 품절 처리 방법.
    10. `## 품질 관리 및 반품 정책`
       - 정확도 기준, 반품 수용 조건, 클레임 처리 흐름.
    11. `## 지원 채널 및 연락처`
       - 이메일(placeholder: partners@fitsole.kr), 대응 시간, 기술 지원 범위.
    12. `## 용어집`
       - alignment_rmse, overlap_percentage, discrepancy_count, anchor, piecewise,
         fitType 등 용어를 1~2 문장으로 정리.

    Tone: 비즈니스 전문 어조, 2인칭 또는 3인칭 중립. 연구/내부 SOP 세부는 링크로 처리.
    Target length ≥ 150 lines.
  </action>
  <verify>
    <automated>test -f docs/implementation/MANUAL-wholesaler-shoe-registration.md &amp;&amp; awk 'END{print NR}' docs/implementation/MANUAL-wholesaler-shoe-registration.md | awk '$1 >= 150 {exit 0} {exit 1}' &amp;&amp; grep -q "^## 개요" docs/implementation/MANUAL-wholesaler-shoe-registration.md &amp;&amp; grep -q "^## 도매 파트너 워크플로우" docs/implementation/MANUAL-wholesaler-shoe-registration.md &amp;&amp; grep -q "^## 신발 모델 등록 양식" docs/implementation/MANUAL-wholesaler-shoe-registration.md &amp;&amp; grep -q "^## 앵커 사이즈 선정 기준" docs/implementation/MANUAL-wholesaler-shoe-registration.md &amp;&amp; grep -q "^## 사이즈 그레이딩 결과 이해하기" docs/implementation/MANUAL-wholesaler-shoe-registration.md &amp;&amp; grep -q "anchors_used" docs/implementation/MANUAL-wholesaler-shoe-registration.md &amp;&amp; grep -q "used_piecewise" docs/implementation/MANUAL-wholesaler-shoe-registration.md &amp;&amp; grep -q "SOP-shoe-interior-scan-merge" docs/implementation/MANUAL-wholesaler-shoe-registration.md</automated>
  </verify>
  <done>
    - `docs/implementation/MANUAL-wholesaler-shoe-registration.md` exists, ≥ 150
      lines, entirely in Korean.
    - All required H2 sections are present and grep-verified.
    - Explains the shoe-set business model, data provided to partners, step-by-step
      workflow, registration form (as a table), anchor size selection rules, scan
      handoff options, how to interpret `anchors_used` / `predictions` /
      `validation_warnings` / `used_piecewise`, inventory/order linking, QA/返품
      policy, support channels, and a glossary.
    - Links to `SOP-shoe-interior-scan-merge.md` for internal procedure and to
      `docs/research/01-shoe-interior-scanning.md` / `02-shoe-size-grading.md` for
      deeper technical references.
  </done>
</task>

</tasks>

<verification>
End-to-end phase checks after all three tasks are complete:

1. Type check:
   `cd /Users/kimjaechol/Documents/test && npx tsc --noEmit` exits 0 (no new errors).
2. Component wiring:
   `grep -q "from \"@/components/admin/shoe-merge-client\"" src/app/\(admin\)/admin/dashboard/shoe-merge/page.tsx`
   (import already exists — verifies the component file resolves).
3. API reference integrity:
   `grep -q "/api/admin/shoe-scan/merge" src/components/admin/shoe-merge-client.tsx`
   `grep -q "/api/admin/shoe-scan/grade" src/components/admin/shoe-merge-client.tsx`
4. No dependency drift:
   `git diff package.json` shows no changes.
5. Docs exist and meet length + structure requirements (per-task verify commands).
6. No modification to the two API route files:
   `git diff src/app/api/admin/shoe-scan/merge/route.ts src/app/api/admin/shoe-scan/grade/route.ts`
   shows no changes.
</verification>

<success_criteria>
Phase is done when all of these are true:

- [ ] `src/components/admin/shoe-merge-client.tsx` exists, compiles under `tsc --noEmit`,
      and the `/admin/dashboard/shoe-merge` page no longer references a missing module.
- [ ] The component uploads to `/api/admin/shoe-scan/merge` with the exact multipart
      field names (`revopoint_mesh`, `cast_mesh`, `scanId`) and renders every documented
      response field.
- [ ] The component can POST the resolved dimensions as an anchor to
      `/api/admin/shoe-scan/grade` and render the returned predictions for Korean
      sizes 230–290mm.
- [ ] RMSE / overlap / discrepancy values are color-coded using the documented
      thresholds, and the same thresholds appear in the SOP quality-gate table.
- [ ] `docs/implementation/SOP-shoe-interior-scan-merge.md` is a standalone Korean
      SOP covering equipment, pre-scan checklist, Phases 1–4, quality gates, rescan
      criteria, troubleshooting, safety, and file-naming conventions.
- [ ] `docs/implementation/MANUAL-wholesaler-shoe-registration.md` is a standalone
      Korean wholesaler manual covering business model, provided data, workflow,
      registration form, anchor rules, scan handoff, grading result interpretation,
      inventory linking, QA/반품 정책, and support channels.
- [ ] No new npm dependencies were added and the two API route files were not
      modified.
</success_criteria>

<output>
After all tasks complete, create:
`.planning/quick/260411-deo-shoe-merge-client-ui-sop-wholesaler-manu/260411-deo-SUMMARY.md`

The summary should record:
- Final file paths for the three deliverables
- Any threshold values chosen (RMSE/overlap/discrepancy) so future work can adjust
  them in both UI and SOP simultaneously
- Any TODOs left behind (e.g. factory/partner email placeholder, self-service
  scan upload path placeholder)
</output>
