# Phase 3: Insole Design Engine (Two Lines) & Product Catalog - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning
**Source:** User-provided research report (비대면 발 측정 기술 종합 보고서 v1.0, Section 10)

<domain>
## Phase Boundary

Two-line insole design system with parametric CAD auto-generation and product catalog. Line 1 serves general online consumers using camera/SfM scan data. Line 2 serves offline store and athlete customers using SALTED smart insole SDK with real pressure sensors. Both lines output STL files ready for 3D printing. Product catalog allows browsing shoes with bundle pricing.

</domain>

<decisions>
## Implementation Decisions

### Line 1: Camera-Based Insole Design (일반인용)
- **D-01:** Arch height optimization algorithm — `calculate_optimal_arch_height()` function using navicular height from SfM, midfoot pressure ratio from AI estimation, body weight, foot length. Base: 42mm for normal arch, 35mm for flat, 50mm for high arch. Arch height determines 79.4% of plantar stress.
- **D-02:** Heel cup depth optimization — `calculate_optimal_heel_cup_depth()` function using heel peak pressure, pronation degree, age, activity type. Base: 20mm optimal + 10mm EVA cushion. Heel cup determines 40.2% of stress.
- **D-03:** Zone-specific hardness mapping using Varioshore TPU temperature: arch core 190°C/92A, heel cup wall 195°C/85A, heel cup floor 200°C/75A, forefoot 210°C/65A, toe area 220°C/55A
- **D-04:** AI-estimated pressure input (from Phase 2) drives the design — 70-80% accuracy vs sensors

### Line 2: SALTED SDK Precision Design (전문가용)
- **D-05:** SALTED SDK integration via BLE — real-time pressure data at 100Hz, 6-axis IMU data
- **D-06:** 5-minute walking data collection session (~300,000 data points) → server storage → analysis
- **D-07:** Biomechanical analysis from SALTED data: landing pattern (heel/mid/forefoot strike), pronation/supination via COP trajectory, arch flexibility (static vs dynamic), weight distribution (forefoot/midfoot/hindfoot %)
- **D-08:** Precision insole design uses REAL pressure data instead of AI estimation — same algorithms but higher accuracy inputs
- **D-09:** Before/after verification report — customer wears custom insole with SALTED → compare pressure distribution. Target: ≥30% peak pressure reduction, ≥40% contact area increase

### Shared: Parametric CAD Pipeline
- **D-10:** Python → OpenSCAD → STL automatic pipeline. OpenSCAD parametric model with variables: arch_height, heel_cup_depth, eva_cushion_thickness, foot_length/width/heel_width, forefoot_flex, medial/lateral_post_h
- **D-11:** PrusaSlicer profile generation with zone-specific Modifier objects for Varioshore TPU temperature control
- **D-12:** Output: STL file + slicer profile + design parameter JSON (for admin dashboard download)

### Product Catalog
- **D-13:** Shoe catalog with categories (운동화, 구두, 부츠, 샌들) — Payload CMS collections for products
- **D-14:** Product detail page: multiple images, descriptions, shoe+insole bundle pricing, insole customization preview based on user's scan data
- **D-15:** Size recommendation engine: map SfM scan dimensions to shoe last dimensions per product
- **D-16:** Filter/search by category, size, price, style

### 3D Insole Preview
- **D-17:** React Three Fiber insole model with color-coded zones showing hardness levels (92A red → 55A blue gradient)
- **D-18:** Interactive preview: rotate/zoom, toggle between zones view and pressure overlay

### Claude's Discretion
- OpenSCAD parametric model geometry details (exact spline curves)
- Payload CMS product schema field names
- Product image storage strategy (local vs S3)
- Exact SALTED SDK API call sequences (follow SDK docs)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Two-line approach, SALTED SDK decisions
- `.planning/REQUIREMENTS.md` — INSL-01~04, SALT-01~06, PROD-01~05
- `.planning/research/STACK.md` — Python FastAPI backend, React Three Fiber, Payload CMS
- `.planning/research/ARCHITECTURE.md` — Client-server split

### User Research Report (embedded in decisions)
- Section 10.1: SALTED SDK integration architecture and data types
- Section 10.2: 6-step scientific design pipeline
- Section 10.3.2: Arch height calculation (Python code provided)
- Section 10.3.3: Heel cup depth calculation (Python code provided)
- Section 10.3.4: Varioshore TPU temperature-hardness mapping table
- Section 10.3.5: OpenSCAD parametric model variables and Python→OpenSCAD pipeline
- Section 10.3.7: Before/after verification protocol

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `services/measurement/` — Python FastAPI backend (Phase 2), add insole design modules here
- `src/lib/scan/types.ts` — Scan types, extend with insole design types
- `src/lib/scan/store.ts` — Zustand store, extend with insole design state
- `src/components/scan/foot-model-3d.tsx` — 3D viewer component, adapt for insole preview
- `src/components/scan/pressure-heatmap.tsx` — Pressure visualization, reuse for insole zones
- `src/lib/db/schema.ts` — Drizzle schema, add products/insoleDesigns tables

### Established Patterns
- shadcn/ui components, Pretendard font, blue-600/emerald-600 accents
- Server components with auth() check
- Korean-language UI
- API routes proxying to Python backend
- TanStack Query for data fetching

### Integration Points
- Phase 2 scan results (measurements + pressure) feed into insole design
- Phase 4 (checkout) needs product + insole design to create orders
- Phase 5 (admin) needs access to design specs and STL files

</code_context>

<specifics>
## Specific Ideas

- The Python calculation functions from the report (Section 10.3.2, 10.3.3) should be implemented as-is in the FastAPI backend
- Varioshore TPU temperature table is the core lookup for manufacturing instructions
- SALTED SDK integration needs a mobile-specific page (BLE only works on mobile apps or Web Bluetooth API)
- Product catalog should start small (10-20 SKUs) per Phase 1 research recommendation
- Before/after report is a key differentiator for offline store customers

</specifics>

<deferred>
## Deferred Ideas

- FEA simulation (Section 10.2 Step 3) — future enhancement when computational resources available
- Deep learning insole generation (Section 10.3.9) — needs 1000+ data points first
- AR shoe try-on overlay — future consideration
- OrthoCAD/LutraCAD integration — commercial software, evaluate later

</deferred>

---

*Phase: 03-insole-design-product-catalog*
*Context gathered: 2026-04-09*
