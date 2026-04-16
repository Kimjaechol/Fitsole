---
phase: quick/260411-deo-shoe-merge-client
reviewed: 2026-04-17
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/components/admin/shoe-merge-client.tsx
  - src/app/(admin)/admin/dashboard/shoe-merge/page.tsx
  - src/app/api/admin/shoe-scan/grade/route.ts
  - src/app/api/admin/shoe-scan/merge/route.ts
  - src/lib/shoe-models/types.ts
  - services/measurement/app/api/shoe_merge.py
  - services/measurement/app/api/shoe_scan.py
  - services/measurement/app/shoe_scan/cavity_extractor.py
  - services/measurement/app/shoe_scan/grading.py
  - services/measurement/app/shoe_scan/mesh_merger.py
  - services/measurement/app/shoe_scan/models.py
  - src/lib/db/schema.ts
findings:
  high: 6
  medium: 9
  low: 5
  total: 20
status: issues_found
---

# Code Review — shoe-merge-client (quick/260411-deo)

## Summary

Counts: **6 high**, **9 medium**, **5 low** (20 findings total).

**Overall verdict:** The feature is functional on the happy path but has several
correctness bugs that will surface on real uploads. Most severe:

1. Uploaded mesh files are all saved to disk with an `.obj` extension regardless
   of the real format, so `.stl` / `.ply` / `.gltf` / `.glb` uploads will fail to
   load in Open3D and be reported as "too few vertices".
2. Sub-components (`UploadForm`, `MergeResultCard`, `GradingSection`,
   `PredictionsTable`) are defined **inside** the parent component body. Every
   keystroke remounts them, which drops focus on the `scanId` input mid-typing
   and clears file-input values on state changes.
3. Pydantic `ShoeInternalDimensions` has `ge=5.0` / `ge=50.0` / `ge=20.0` /
   `ge=10.0` lower bounds, but `resolve_discrepancy` returns `0.0` for the
   `no_data` branch and several `_measure_*` helpers return `0.0` on sparse
   slices — any of these produce a 500 on `MergeResponse` construction.
4. Two FastAPI routers share prefix `/shoe-scan` and are both included, and the
   100MB client-side file cap is not mirrored on the Next.js route.

Security on admin auth is fine (both `requireAdmin` and the page-level `isAdmin`
check are wired up). The open holes are upload-size DoS on the Next.js proxy
and type/bound mismatches between the Python service and the TS clients.

## Findings

### F-01 — Uploaded meshes always saved with `.obj` extension [severity: high]
**File:** services/measurement/app/api/shoe_merge.py:137-140
**Category:** bug
**Description:** Both uploads are persisted to disk as `revopoint_raw.obj` /
`cast_raw.obj` regardless of the actual file format. `open3d.io.read_triangle_mesh`
selects the loader by file extension, so an uploaded `.stl`, `.ply`, `.gltf`, or
`.glb` file will be dispatched to the OBJ loader and come back with 0 (or wrong)
vertices. The front-end and the Next.js route both advertise support for all
five extensions; only OBJ actually works.
**Evidence:**
```python
revopoint_path = await _save_upload(
    revopoint_mesh, work_dir / "revopoint_raw.obj"
)
cast_path = await _save_upload(cast_mesh, work_dir / "cast_raw.obj")
```
**Suggested fix:** Derive the destination filename from the validated upload
extension (the same one `_validate_mesh_file` already computes) instead of
hard-coding `.obj`.
**Auto-fixable:** yes

### F-02 — Sub-components defined inside parent cause remounts on every render [severity: high]
**File:** src/components/admin/shoe-merge-client.tsx:410, 520, 682, 761
**Category:** bug
**Description:** `UploadForm`, `MergeResultCard`, `GradingSection`, and
`PredictionsTable` are declared as nested `function` expressions inside
`ShoeMergeClient`. They are therefore new function references on every render,
which React treats as new component types and unmounts/remounts on every state
update. Typing a single character into the `scanId` input triggers a re-render,
remounts `UploadForm`, and drops input focus. The `type="file"` inputs also lose
their selected file on any re-render of the parent tree that re-instantiates
`UploadForm`.
**Evidence:**
```tsx
function UploadForm() { ... }
function MergeResultCard({ result }: ...) { ... }
function GradingSection({ result }: ...) { ... }
function PredictionsTable({ ... }) { ... }
```
**Suggested fix:** Hoist these four components to module scope (or render their
JSX inline in the parent's `return`); pass state/handlers as props.
**Auto-fixable:** no

### F-03 — `resolve_discrepancy` returns 0.0 on no_data, violates Pydantic bounds [severity: high]
**File:** services/measurement/app/shoe_scan/mesh_merger.py:235-236
**Category:** bug
**Description:** When both sources are missing a measurement, the resolver
returns `(0.0, 0.0, "no_data")`. That 0.0 is later passed to
`ShoeInternalDimensions(**resolved)` in `shoe_merge.py:210`, which has
`heel_cup_depth: ge=5.0`, `arch_support_x: ge=20.0`, `toe_box_volume: ge=10.0`,
`internal_length: ge=100.0`, `internal_width: ge=50.0`, `instep_clearance:
ge=5.0`. The Pydantic validation error is caught by the generic `except
Exception` and turned into a 500 `Merge failed: ...` response, even when
merge+ICP succeeded.
**Evidence:**
```python
if revopoint_value is None and cast_value is None:
    return (0.0, 0.0, "no_data")
```
**Suggested fix:** Make `ShoeInternalDimensions` fields optional (or return
`None` and propagate to `resolved_dimensions: Optional[ShoeInternalDimensions]`)
instead of constructing with invalid sentinels.
**Auto-fixable:** no

### F-04 — `_measure_*` helpers return 0.0 on sparse slices, same Pydantic trap [severity: high]
**File:** services/measurement/app/shoe_scan/cavity_extractor.py:154, 169, 215, 240
**Category:** bug
**Description:** `_measure_width_at_section`, `_measure_heel_cup_depth`,
`_measure_toe_box_volume`, and `_measure_instep_clearance` all return `0.0`
when fewer than 5 or 10 vertices fall in the slice window. Those 0.0 values
flow straight into `extract_shoe_dimensions`'s dict, through
`resolve_all_dimensions`, and into `ShoeInternalDimensions(**resolved)`, which
rejects them because every field has a positive `ge` bound. The endpoint
returns 500 rather than a useful "mesh too sparse here" warning.
**Evidence:**
```python
if len(slice_verts) < 5:
    return 0.0
```
**Suggested fix:** Return `None` from the individual measurement helpers and
type the result dict values as `Optional[float]` all the way through to the
Pydantic model; emit a warning for any `None`.
**Auto-fixable:** no

### F-05 — `compute_quality_score` divides by `width` without zero check [severity: high]
**File:** services/measurement/app/shoe_scan/cavity_extractor.py:274
**Category:** bug
**Description:** `expected_ratio = length / width` is computed directly from
the measurements dict. If `internal_width` is 0 (which `_measure_width_at_section`
returns whenever the ball-girth slice has < 5 vertices) this raises
`ZeroDivisionError`, which propagates up and turns the endpoint into a 500.
**Evidence:**
```python
length = measurements["internal_length"]
width = measurements["internal_width"]

ratio_score = 100.0
expected_ratio = length / width
```
**Suggested fix:** Guard with `if width > 0:` before computing the ratio; fall
back to a neutral ratio_score when width is missing.
**Auto-fixable:** yes

### F-06 — Next.js `/merge` route has no upload-size cap [severity: high]
**File:** src/app/api/admin/shoe-scan/merge/route.ts:32
**Category:** security
**Description:** The handler calls `request.formData()` with no body-size
limit. The client enforces 100MB and the Python service enforces 200MB, but the
Next.js route will happily buffer a multi-GB multipart upload in memory before
either check runs. An authenticated admin (or anyone who compromises an admin
cookie) can OOM the edge/Node runtime with a single POST.
**Evidence:**
```ts
const formData = await request.formData();
const revopointMesh = formData.get("revopoint_mesh");
const castMesh = formData.get("cast_mesh");
```
**Suggested fix:** Enforce a `Content-Length` ceiling (e.g., 220MB) at the top
of the handler, reject with 413 before calling `formData()`; optionally stream
the request body straight to the Python service instead of parsing it in Node.
**Auto-fixable:** no

### F-07 — Two FastAPI routers register the same `/shoe-scan` prefix [severity: medium]
**File:** services/measurement/app/api/shoe_scan.py:32 and services/measurement/app/api/shoe_merge.py:42
**Category:** duplication
**Description:** Both `shoe_scan_router` and `shoe_merge_router` are declared
with `prefix="/shoe-scan"` and both are included in `main.py`. The routes
happen not to collide today (`/process` vs `/merge` + `/grade`), but any future
route added to one file risks silently shadowing the other, and OpenAPI
consolidates them under one tag which makes the docs confusing.
**Evidence:**
```python
# shoe_scan.py
router = APIRouter(prefix="/shoe-scan", tags=["shoe-scan"])
# shoe_merge.py
router = APIRouter(prefix="/shoe-scan", tags=["shoe-scan"])
```
**Suggested fix:** Give the merge/grade router a distinct prefix (e.g.,
`/shoe-scan/merge`) or merge the two files into one router.
**Auto-fixable:** no

### F-08 — `MergeResponse.alignment_rmse=float("inf")` serializes as non-standard JSON [severity: medium]
**File:** services/measurement/app/shoe_scan/mesh_merger.py:408
**Category:** bug
**Description:** `_failed_result` returns `alignment_rmse=float("inf")`. FastAPI
emits that as `Infinity` in the response body (default `json.dumps(allow_nan=True)`).
Node's `JSON.parse` in the Next.js proxy route rejects it as invalid JSON, so
the proxy's `await response.json()` throws and the caller sees a generic 500
instead of the intended failure payload.
**Evidence:**
```python
return MergeResult(
    merged_mesh=None,
    alignment_rmse=float("inf"),
    ...
)
```
**Suggested fix:** Use a large finite sentinel (e.g., 9999.0) or `None` with a
typing adjustment on `MergeResponse.alignment_rmse`.
**Auto-fixable:** yes

### F-09 — Prediction dict keyed by `str(float)` renders "230.0" in UI [severity: medium]
**File:** services/measurement/app/api/shoe_merge.py:287
**Category:** bug
**Description:** `GradeRequest.target_sizes` is `list[float]`, so Pydantic
coerces the incoming integers to floats. `predictions[str(target)]` therefore
produces keys like `"230.0"`, `"235.0"`. The React `PredictionsTable`
iterates `Object.keys(predictions)` and renders the key directly as the size
label, so the UI shows `230.0 mm` instead of `230 mm`.
**Evidence:**
```python
predictions[str(target)] = { ... }
```
**Suggested fix:** Key predictions by `str(int(target))` when the target is
integral (or key by the original int), or normalize on the client with
`Number(size).toString()`.
**Auto-fixable:** yes

### F-10 — `resolution_report.note` is consumed by UI but never produced by server [severity: medium]
**File:** src/components/admin/shoe-merge-client.tsx:99-103 and services/measurement/app/shoe_scan/mesh_merger.py:322-331
**Category:** missing
**Description:** The client's `ResolutionReportEntry` interface reads an
optional `note` field and renders it in the "비고" column. The Python
`resolve_all_dimensions` builds the report with keys
`value / confidence / method / revopoint / cast / diff` — there is no `note`.
The column always renders `—`, which is misleading in code review and in the
admin UI.
**Evidence:**
```ts
interface ResolutionReportEntry {
  confidence: number;
  method: string;
  note?: string;
}
```
```python
report[name] = {
    "value": value,
    "confidence": round(confidence, 2),
    "method": method,
    ...
}
```
**Suggested fix:** Either add `"note"` to the Python report dict (derived from
the `method` string) or drop the `note` column / field on the client.
**Auto-fixable:** no

### F-11 — `TS ShoeScanResult` uses camelCase while Python emits snake_case [severity: medium]
**File:** src/lib/shoe-models/types.ts:98-113 and services/measurement/app/shoe_scan/models.py:70-83
**Category:** bug
**Description:** Python `ShoeScanResult` returns snake_case fields
(`scan_id`, `quality_score`, `model_url`, `error_message`), but the TypeScript
`ShoeScanResult` interface declares `scanId`, `qualityScore`, `modelUrl`,
`errorMessage`. Any TS consumer of the `/shoe-scan/process` response will read
`undefined` for every field. Not blocking for the merge flow but the interface
in scope is wrong.
**Evidence:**
```ts
export interface ShoeScanResult {
  scanId: string;
  qualityScore: number;
  modelUrl: string | null;
  errorMessage: string | null;
}
```
```python
class ShoeScanResult(BaseModel):
    scan_id: str
    quality_score: float = Field(...)
    model_url: Optional[str] = None
    error_message: Optional[str] = None
```
**Suggested fix:** Match field names (e.g., rename TS props to snake_case, or
configure Pydantic with `alias_generator=to_camel` + `populate_by_name=True`
and update the `/process` route to serialize by alias).
**Auto-fixable:** no

### F-12 — Measurement-field nullability disagrees between `ShoeModel` and `ShoeScanResult` [severity: medium]
**File:** src/lib/shoe-models/types.ts:51-54, 102-108
**Category:** bug
**Description:** `ShoeModel` declares `heelCupDepth`, `archSupportX`,
`toeBoxVolume`, `instepClearance` as `number | null`, but the nested
`measurements` object on `ShoeScanResult` declares the same fields as plain
`number`. The DB schema (`shoe_models`) stores them nullable. Either the scan
always returns them or the schema and the `ShoeModel` type are wrong — the
code is contradictory.
**Evidence:**
```ts
heelCupDepth: number | null;   // ShoeModel
...
heelCupDepth: number;          // ShoeScanResult.measurements
```
**Suggested fix:** Decide a single contract (e.g., always nullable) and align
the DB column, the `ShoeModel` interface, the `ShoeScanResult.measurements`
interface, and the Pydantic `ShoeInternalDimensions` bounds.
**Auto-fixable:** no

### F-13 — `grade` endpoint accepts out-of-range anchors silently [severity: medium]
**File:** services/measurement/app/api/shoe_merge.py:253-265
**Category:** missing
**Description:** `dims_data.get("internal_length", 0)` defaults to 0 when the
client omits a dimension. The `ShoeDimensions` dataclass has no bounds, so a
length of 0 is accepted. `grade_linear` then extrapolates from length=0, and
`_find_arch_peak_position`-style values become nonsense. The client strips
`undefined` but passes through `null`, which `float(None)` would crash on —
also uncaught.
**Evidence:**
```python
dims = ShoeDimensions(
    internal_length=float(dims_data.get("internal_length", 0)),
    ...
)
```
**Suggested fix:** Validate each required dimension is a finite positive float
before building `GradingAnchor`; return 400 with a clear error when missing or
null.
**Auto-fixable:** no

### F-14 — `cast_mesh.transform(...)` mutates the input mesh in place [severity: medium]
**File:** services/measurement/app/shoe_scan/mesh_merger.py:165
**Category:** bug
**Description:** `TriangleMesh.transform` in Open3D mutates the mesh in place
and also returns `self`. The downstream `extract_shoe_dimensions(cast, ...)`
call in `shoe_merge.py:185` runs on the now-transformed mesh, which skews the
per-mesh dimension comparison used by `resolve_all_dimensions`. The Revopoint
dimensions are extracted pre-merge but the cast dimensions are extracted from
the already-aligned copy — not the independent scan the resolver assumes.
**Evidence:**
```python
cast_mesh_aligned = cast_mesh.transform(icp_result.transformation)
```
```python
rev_dims = extract_shoe_dimensions(revopoint, REVOPOINT_PIXELS_PER_MM)
cast_dims = extract_shoe_dimensions(cast, REVOPOINT_PIXELS_PER_MM)
```
**Suggested fix:** Either deep-copy the cast mesh before `.transform`
(`copy.deepcopy(cast_mesh).transform(...)`) or call `extract_shoe_dimensions`
on the cast *before* `merge_partial_scans`.
**Auto-fixable:** yes

### F-15 — File-extension parsing breaks on filenames without `.` [severity: medium]
**File:** services/measurement/app/api/shoe_merge.py:329
**Category:** bug
**Description:** `ext = "." + file.filename.split(".")[-1].lower()` returns
`.<filename>` when the filename has no dot at all (e.g., `"scan"`). That lands
in the rejection branch which is technically correct, but the error message
claims the extension is `.scan`, which is confusing. It also trims any
multi-dot filename (`foo.tar.gz`) to `.gz` — not relevant here but worth
hardening.
**Evidence:**
```python
ext = "." + file.filename.split(".")[-1].lower()
```
**Suggested fix:** Use `Path(file.filename).suffix.lower()` and explicitly
reject the empty-suffix case with a clear message.
**Auto-fixable:** yes

### F-16 — `UUID_PATTERN` and upload helpers duplicated across two Python files [severity: low]
**File:** services/measurement/app/api/shoe_scan.py:44-47 and services/measurement/app/api/shoe_merge.py:47-50
**Category:** duplication
**Description:** `UUID_PATTERN` regex, `MAX_UPLOAD_SIZE` semantics, and the
chunked-upload loop are duplicated between `shoe_scan.py` and `shoe_merge.py`.
Any change (e.g., accepting UUIDv7) has to land in two places.
**Evidence:**
```python
# shoe_scan.py
UUID_PATTERN = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-...$", re.IGNORECASE)
# shoe_merge.py
UUID_PATTERN = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-...$", re.IGNORECASE)
```
**Suggested fix:** Extract to `app/shoe_scan/_upload.py` (or similar) and
import from both endpoints.
**Auto-fixable:** no

### F-17 — `formatNumber` and `renderValue` duplicate the same null-guard logic [severity: low]
**File:** src/components/admin/shoe-merge-client.tsx:171-180
**Category:** duplication
**Description:** `formatNumber` and `renderValue` both handle null/undefined/NaN
and format to fixed decimals; only the decimal count differs. Both are used in
the same file.
**Evidence:**
```tsx
function formatNumber(value: DimensionValue, decimals = 2): string { ... }
function renderValue(value: DimensionValue): string { ... }
```
**Suggested fix:** Delete `renderValue` and call `formatNumber(value, 2)` at
its callsites (or add a default-arg wrapper).
**Auto-fixable:** yes

### F-18 — `useEffect` seeding `scanId` on mount leaves input empty on first paint [severity: low]
**File:** src/components/admin/shoe-merge-client.tsx:266-268
**Category:** bug
**Description:** `scanId` starts as `""` and is populated by `useEffect`. On
the first render the input is empty; if the user submits before the effect
flushes (rare but possible with React 19's concurrent rendering), the guard
`if (!trimmedScanId)` trips and toasts an error instead of auto-generating.
**Evidence:**
```tsx
const [scanId, setScanId] = useState<string>("");
useEffect(() => {
  setScanId(generateScanId());
}, []);
```
**Suggested fix:** Initialize with a lazy initializer —
`useState<string>(() => generateScanId())` — and drop the effect.
**Auto-fixable:** yes

### F-19 — `anchorSize` input's `step={5}` is not enforced on the numeric value [severity: low]
**File:** src/components/admin/shoe-merge-client.tsx:703-706
**Category:** bug
**Description:** The input declares `step={5}` but the onChange handler is
`setAnchorSize(Number(e.target.value))`, which allows arbitrary decimal values
via programmatic entry or paste. The downstream target-size filter
`DEFAULT_TARGET_SIZES.filter((s) => s !== anchorBase)` then never matches when
the user types e.g. `273`, and the server is asked to predict the anchor
position itself.
**Evidence:**
```tsx
<Input id="anchorSize" type="number" min={200} max={320} step={5}
  value={anchorSize}
  onChange={(e) => setAnchorSize(Number(e.target.value))} />
```
**Suggested fix:** Snap to nearest 5mm on change
(`Math.round(Number(e.target.value) / 5) * 5`), or present a `<Select>` of the
known sizes.
**Auto-fixable:** no

### F-20 — `_orient_to_shoe_axes` rotation matrix can have `det = -1` (reflection) [severity: low]
**File:** services/measurement/app/shoe_scan/cavity_extractor.py:116-119
**Category:** bug
**Description:** `R = np.column_stack([eigvecs[:, 1], eigvecs[:, 2], eigvecs[:, 0]])`
is orthogonal but not guaranteed to be a proper rotation —
`np.linalg.det(R)` can be `-1` (a reflection), flipping chirality of the
reconstructed mesh. Width measurements are symmetric so this doesn't change
the extracted numbers, but any downstream normal-aware processing (e.g.,
Poisson merge, mesh export) will see inverted normals.
**Evidence:**
```python
R = np.column_stack([eigvecs[:, 1], eigvecs[:, 2], eigvecs[:, 0]])
rotated = centered @ R
```
**Suggested fix:** After building R, check `np.linalg.det(R) < 0` and flip one
column to restore a right-handed frame.
**Auto-fixable:** yes

---

_Reviewed: 2026-04-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
