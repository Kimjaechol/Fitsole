# Phase 3: Insole Design Engine (Two Lines) & Product Catalog - Research

**Researched:** 2026-04-09
**Domain:** Parametric CAD generation (OpenSCAD), BLE sensor integration, CMS-driven product catalog, 3D visualization
**Confidence:** MEDIUM (OpenSCAD/SALTED SDK require runtime verification; Payload CMS and R3F patterns are well-documented)

## Summary

This phase builds the core business logic of FitSole: transforming foot scan data into custom insole STL files via two parallel design lines, plus a product catalog for shoe+insole bundles. Line 1 (general consumers) uses AI-estimated pressure data from Phase 2 with rule-based optimization algorithms. Line 2 (professional/offline) integrates SALTED smart insole hardware via Web Bluetooth for real pressure measurement, enabling higher accuracy designs and before/after verification reports.

The parametric CAD pipeline centers on Python generating OpenSCAD `.scad` files with parameterized variables, then invoking `openscad` CLI to export STL. This runs in the existing FastAPI microservice. The product catalog uses Payload CMS 3.x (v3.82.1 current) embedded directly into the Next.js app, with Postgres adapter sharing the Neon database. The 3D insole preview extends the existing `foot-model-3d.tsx` R3F component with zone-colored hardness visualization.

**Primary recommendation:** Build the insole design engine as Python modules in `services/measurement/app/insole/`, use direct OpenSCAD CLI invocation (not Python wrapper libraries which are unmaintained), install Payload CMS into the Next.js app for the product catalog, and extend the existing R3F 3D viewer for insole preview with per-zone material coloring.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Arch height optimization — `calculate_optimal_arch_height()` using navicular height, midfoot pressure ratio, body weight, foot length. Base: 42mm normal, 35mm flat, 50mm high arch. Arch height determines 79.4% of plantar stress.
- **D-02:** Heel cup depth optimization — `calculate_optimal_heel_cup_depth()` using heel peak pressure, pronation degree, age, activity type. Base: 20mm + 10mm EVA cushion. Determines 40.2% of stress.
- **D-03:** Zone-specific hardness via Varioshore TPU temperature: arch core 190C/92A, heel cup wall 195C/85A, heel cup floor 200C/75A, forefoot 210C/65A, toe area 220C/55A
- **D-04:** AI-estimated pressure input (from Phase 2) drives Line 1 design at 70-80% accuracy
- **D-05:** SALTED SDK integration via BLE — real-time pressure data at 100Hz, 6-axis IMU
- **D-06:** 5-minute walking session (~300,000 data points) -> server storage -> analysis
- **D-07:** Biomechanical analysis from SALTED: landing pattern, pronation/supination, COP trajectory, arch flexibility, weight distribution
- **D-08:** Line 2 uses REAL pressure data instead of AI estimation — same algorithms, higher accuracy
- **D-09:** Before/after verification report — target >=30% peak pressure reduction, >=40% contact area increase
- **D-10:** Python -> OpenSCAD -> STL pipeline. Parametric variables: arch_height, heel_cup_depth, eva_cushion_thickness, foot_length/width/heel_width, forefoot_flex, medial/lateral_post_h
- **D-11:** PrusaSlicer profile generation with zone-specific Modifier objects for Varioshore TPU temperature
- **D-12:** Output: STL + slicer profile + design parameter JSON
- **D-13:** Shoe catalog with categories (운동화, 구두, 부츠, 샌들) — Payload CMS collections
- **D-14:** Product detail page: multiple images, descriptions, bundle pricing, insole preview
- **D-15:** Size recommendation engine: SfM dimensions -> shoe last dimensions per product
- **D-16:** Filter/search by category, size, price, style
- **D-17:** React Three Fiber insole model with color-coded zones (92A red -> 55A blue gradient)
- **D-18:** Interactive preview: rotate/zoom, toggle zones view and pressure overlay

### Claude's Discretion
- OpenSCAD parametric model geometry details (exact spline curves)
- Payload CMS product schema field names
- Product image storage strategy (local vs S3)
- Exact SALTED SDK API call sequences (follow SDK docs)

### Deferred Ideas (OUT OF SCOPE)
- FEA simulation (future when computational resources available)
- Deep learning insole generation (needs 1000+ data points first)
- AR shoe try-on overlay
- OrthoCAD/LutraCAD integration

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INSL-01 | Generate custom insole design from SfM scan data (arch 79.4% + heel cup 40.2%) | Python optimization algorithms in FastAPI, consuming Phase 2 FootMeasurement + PressureData |
| INSL-02 | Calculate optimal arch height and heel cup depth via rule-based algorithms | `calculate_optimal_arch_height()` and `calculate_optimal_heel_cup_depth()` functions per D-01, D-02 |
| INSL-03 | 3D insole preview with zone-by-zone hardness display | R3F component extending `foot-model-3d.tsx`, vertex color or multi-material approach |
| INSL-04 | Recommend optimal shoe size per product from scan data | Size mapping table: foot_length/width -> shoe last dimensions per product |
| SALT-01 | Connect SALTED insole via BLE, receive 100Hz pressure data | Web Bluetooth API (`navigator.bluetooth.requestDevice`), Chrome/Edge only, requires HTTPS + user gesture |
| SALT-02 | Collect 5-min walking session (~300K data points), store to server | Client-side BLE data buffering -> chunked upload to FastAPI endpoint |
| SALT-03 | Analyze SALTED data: landing pattern, pronation, COP, arch flexibility | Python analysis module consuming raw pressure array, same biomechanical algorithms as Phase 2 gait but with real sensor data |
| SALT-04 | Generate precision insole from SALTED + SfM combined data | Same design pipeline as INSL-01 but with SALTED pressure data replacing AI estimation |
| SALT-05 | Auto-generate parametric CAD (OpenSCAD) -> STL with Varioshore TPU temperature mapping | Python -> `.scad` file -> `openscad -o output.stl` CLI, plus slicer profile generation |
| SALT-06 | Before/after verification report comparing pressure with/without insole | Report generation comparing two SALTED sessions, PDF or HTML output |
| PROD-01 | Browse shoes by category | Payload CMS Products collection with category taxonomy |
| PROD-02 | Filter by category, size, price, style | Payload CMS query API with where clauses, or Drizzle queries on synced data |
| PROD-03 | Product detail page with multiple images | Payload CMS Media collection with upload relationship |
| PROD-04 | Shoe + custom insole bundle pricing | Computed field: product.price + insole base price, shown on product page |
| PROD-05 | Insole customization preview based on scan data | R3F insole preview component populated with user's actual scan measurements |

</phase_requirements>

## Standard Stack

### Core (Phase 3 specific)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| OpenSCAD CLI | 2024.12+ | Parametric CAD -> STL export | Industry standard for programmatic 3D modeling; command-line mode enables headless server execution [VERIFIED: openscad.org docs] |
| Payload CMS | 3.82.1 | Product catalog CMS + admin UI | Embeds directly into Next.js app folder, Postgres adapter, TypeScript-first [VERIFIED: npm registry] |
| @payloadcms/db-postgres | 3.82.1 | Payload Postgres adapter | Uses Drizzle ORM internally, compatible with existing Neon Postgres [VERIFIED: npm registry] |
| @payloadcms/richtext-lexical | 3.82.1 | Rich text editor for product descriptions | Default Payload rich text editor, replaces Slate [VERIFIED: npm registry] |
| @react-three/fiber | 9.5.0 | 3D insole preview | Already installed in project, React wrapper for Three.js [VERIFIED: package.json] |
| @react-three/drei | 10.7.7 | R3F helpers (OrbitControls, etc.) | Already installed in project [VERIFIED: package.json] |
| three | 0.183.2 | 3D engine | Already installed [VERIFIED: package.json] |

### Supporting (Python Backend)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| numpy | 2.0+ | Numerical computation | Pressure data arrays, optimization calculations [VERIFIED: requirements.txt] |
| scipy | 1.14+ | Scientific computing | Interpolation for pressure mapping, optimization [VERIFIED: requirements.txt] |
| trimesh | 4.5+ | Mesh manipulation | STL file validation, mesh inspection [VERIFIED: requirements.txt] |
| Jinja2 | 3.1+ | Template engine | Generate .scad files from Python templates [ASSUMED] |
| reportlab or weasyprint | latest | PDF generation | Before/after verification report [ASSUMED] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OpenSCAD CLI direct | SolidPython2 / OpenPySCAD | Python wrappers are unmaintained (last release 2021-2023), add dependency risk. Direct .scad template + CLI is simpler and more maintainable [VERIFIED: PyPI] |
| OpenSCAD | CadQuery | CadQuery is more Pythonic but heavier dependency (OCCT kernel). OpenSCAD is lighter for parametric insole shapes [ASSUMED] |
| Payload CMS | Custom admin with Drizzle | Payload gives free admin UI, media management, access control. Custom build wastes weeks on CRUD. |
| Web Bluetooth | Native mobile app | Web Bluetooth works in Chrome/Edge on Android. iOS requires native app. For MVP, Chrome Android is sufficient for offline store use case [VERIFIED: MDN] |

**Installation:**
```bash
# Payload CMS (into existing Next.js app)
npm install payload @payloadcms/db-postgres @payloadcms/richtext-lexical @payloadcms/next @payloadcms/plugin-cloud-storage

# Python additions (in services/measurement/)
pip install jinja2 reportlab
```

**OpenSCAD must be installed on the server:**
```bash
# Ubuntu/Debian (Docker or server)
apt-get install openscad

# macOS (development)
brew install openscad
```

## Architecture Patterns

### Recommended Project Structure

```
services/measurement/app/
├── insole/                    # NEW: Insole design engine
│   ├── __init__.py
│   ├── optimizer.py           # calculate_optimal_arch_height(), calculate_optimal_heel_cup_depth()
│   ├── hardness_mapper.py     # Varioshore TPU temperature-hardness mapping
│   ├── scad_generator.py      # Python -> .scad file generation (Jinja2 templates)
│   ├── stl_exporter.py        # OpenSCAD CLI invocation -> STL
│   ├── slicer_profile.py      # PrusaSlicer profile generation with zone modifiers
│   ├── report_generator.py    # Before/after comparison report
│   └── templates/
│       └── insole_base.scad   # Parametric OpenSCAD template
├── salted/                    # NEW: SALTED data processing
│   ├── __init__.py
│   ├── data_parser.py         # Parse raw BLE pressure data
│   ├── biomechanical.py       # Landing pattern, COP, pronation analysis
│   └── session_manager.py     # Walking session storage/retrieval
├── api/
│   ├── insole.py              # NEW: /api/insole/design, /api/insole/preview
│   ├── salted.py              # NEW: /api/salted/session, /api/salted/analyze
│   └── scan.py                # Existing scan endpoints
src/
├── payload/                   # NEW: Payload CMS integration
│   ├── payload.config.ts      # Main Payload config
│   └── collections/
│       ├── Products.ts
│       ├── Categories.ts
│       ├── Media.ts
│       └── InsoleDesigns.ts
├── app/
│   ├── (payload)/             # NEW: Payload admin routes
│   │   └── admin/[[...segments]]/page.tsx
│   ├── products/              # NEW: Product catalog pages
│   │   ├── page.tsx           # Product listing with filters
│   │   └── [slug]/page.tsx    # Product detail
│   └── insole/                # NEW: Insole design flow
│       ├── design/page.tsx    # Design results + 3D preview
│       └── salted/page.tsx    # SALTED measurement session
├── components/
│   ├── insole/                # NEW
│   │   ├── insole-preview-3d.tsx    # R3F insole with zone colors
│   │   ├── hardness-legend.tsx      # Color legend for zones
│   │   ├── design-summary.tsx       # Design parameters display
│   │   └── before-after-report.tsx  # Comparison visualization
│   └── products/              # NEW
│       ├── product-card.tsx
│       ├── product-grid.tsx
│       ├── product-filters.tsx
│       └── bundle-pricing.tsx
├── lib/
│   ├── insole/                # NEW
│   │   ├── types.ts           # InsoleDesign, HardnessZone, etc.
│   │   └── store.ts           # Zustand store for insole design state
│   ├── salted/                # NEW
│   │   ├── ble-client.ts      # Web Bluetooth API wrapper
│   │   ├── types.ts           # SALTED data types
│   │   └── store.ts           # SALTED session state
│   └── db/
│       └── schema.ts          # Add products, insoleDesigns, saltedSessions tables
```

### Pattern 1: Python -> OpenSCAD -> STL Pipeline

**What:** Generate parametric .scad files from Python using Jinja2 templates, then invoke OpenSCAD CLI to export STL.
**When to use:** Every insole design request (both Line 1 and Line 2).

```python
# Source: OpenSCAD CLI docs + project pattern [CITED: en.wikibooks.org/wiki/OpenSCAD_User_Manual/Using_OpenSCAD_in_a_command_line_environment]
import subprocess
import tempfile
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

def generate_insole_stl(params: dict) -> Path:
    """Generate STL from design parameters via OpenSCAD."""
    env = Environment(loader=FileSystemLoader("app/insole/templates"))
    template = env.get_template("insole_base.scad")

    scad_content = template.render(
        arch_height=params["arch_height"],
        heel_cup_depth=params["heel_cup_depth"],
        foot_length=params["foot_length"],
        foot_width=params["foot_width"],
        heel_width=params["heel_width"],
        forefoot_flex=params["forefoot_flex"],
        medial_post_h=params["medial_post_h"],
        lateral_post_h=params["lateral_post_h"],
        eva_cushion_thickness=params["eva_cushion_thickness"],
    )

    with tempfile.NamedTemporaryFile(suffix=".scad", delete=False, mode="w") as f:
        f.write(scad_content)
        scad_path = Path(f.name)

    stl_path = scad_path.with_suffix(".stl")

    result = subprocess.run(
        ["openscad", "-o", str(stl_path), str(scad_path)],
        capture_output=True, text=True, timeout=120,
    )

    if result.returncode != 0:
        raise RuntimeError(f"OpenSCAD failed: {result.stderr}")

    return stl_path
```

### Pattern 2: Web Bluetooth SALTED Connection

**What:** Connect to SALTED insole via Web Bluetooth API in browser, stream pressure data.
**When to use:** Line 2 (professional) measurement sessions.

```typescript
// Source: MDN Web Bluetooth API [CITED: developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API]
// IMPORTANT: Web Bluetooth requires HTTPS + user gesture (button click)
// Supported: Chrome 56+, Edge 79+, Opera 43+
// NOT supported: Safari (iOS/macOS), Firefox

async function connectSaltedInsole(): Promise<BluetoothRemoteGATTServer> {
  // Must be called from a user gesture (click handler)
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'SALTED' }],
    optionalServices: ['battery_service', /* SALTED custom service UUID */],
  });

  const server = await device.gatt!.connect();
  return server;
}

async function startPressureStream(
  server: BluetoothRemoteGATTServer,
  onData: (pressureArray: Float32Array) => void
) {
  const service = await server.getPrimaryService(/* SALTED_PRESSURE_SERVICE_UUID */);
  const characteristic = await service.getCharacteristic(/* SALTED_PRESSURE_CHAR_UUID */);

  await characteristic.startNotifications();
  characteristic.addEventListener('characteristicvaluechanged', (event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value!;
    const pressureData = new Float32Array(value.buffer);
    onData(pressureData);
  });
}
```

### Pattern 3: Payload CMS Product Collection

**What:** TypeScript-first product collection config for Payload CMS 3.x.
**When to use:** Product catalog data modeling.

```typescript
// Source: Payload CMS docs [CITED: payloadcms.com/docs/configuration/collections]
import type { CollectionConfig } from 'payload';

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'price', 'status'],
  },
  fields: [
    { name: 'name', type: 'text', required: true, localized: false },
    { name: 'slug', type: 'text', required: true, unique: true,
      admin: { position: 'sidebar' } },
    { name: 'description', type: 'richText' },
    { name: 'category', type: 'relationship', relationTo: 'categories', required: true },
    { name: 'price', type: 'number', required: true, min: 0 },
    { name: 'bundleInsolePrice', type: 'number', min: 0,
      admin: { description: 'Additional price for shoe+insole bundle' } },
    {
      name: 'images', type: 'array',
      fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
    },
    {
      name: 'sizes', type: 'array',
      fields: [
        { name: 'size', type: 'number', required: true },
        { name: 'lastLength', type: 'number' },
        { name: 'lastWidth', type: 'number' },
        { name: 'stock', type: 'number', defaultValue: 0 },
      ],
    },
    { name: 'style', type: 'select',
      options: ['casual', 'formal', 'athletic', 'outdoor'] },
    { name: 'status', type: 'select', defaultValue: 'draft',
      options: ['draft', 'published', 'archived'],
      admin: { position: 'sidebar' } },
  ],
};
```

### Pattern 4: R3F Zone-Colored Insole Preview

**What:** Three.js insole mesh with per-zone color coding showing hardness levels.
**When to use:** INSL-03, PROD-05 preview components.

```typescript
// Source: Three.js + R3F patterns [CITED: r3f.docs.pmnd.rs]
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Hardness zones with Varioshore TPU mapping
const ZONE_COLORS: Record<string, string> = {
  archCore:     '#ef4444', // 92A - red (hardest)
  heelCupWall:  '#f97316', // 85A - orange
  heelCupFloor: '#eab308', // 75A - yellow
  forefoot:     '#22c55e', // 65A - green
  toeArea:      '#3b82f6', // 55A - blue (softest)
};

function InsoleZoneMesh({ zone, geometry, color }: {
  zone: string;
  geometry: THREE.BufferGeometry;
  color: string;
}) {
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
}
```

### Anti-Patterns to Avoid

- **Hand-rolling OpenSCAD string concatenation:** Use Jinja2 templates instead of Python f-strings for .scad generation. Templates are easier to debug and maintain.
- **Storing BLE data in client state only:** SALTED 5-minute sessions produce ~300K data points. Buffer in chunks and upload to server progressively, not all at once at session end.
- **Mixing Payload CMS tables with Drizzle schema manually:** Let Payload manage its own tables via its Postgres adapter. Only reference Payload data via Payload's Local API in server components.
- **Running OpenSCAD in the Next.js serverless function:** OpenSCAD requires a real server process. Keep it in the Python FastAPI service which runs on a persistent server (Railway/Fly.io).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Product catalog CRUD + admin UI | Custom admin dashboard for products | Payload CMS 3.x | Built-in admin panel, media management, access control, API — saves weeks of development [VERIFIED: payloadcms.com] |
| Parametric 3D model generation | Custom mesh generation with trimesh | OpenSCAD CLI with .scad templates | OpenSCAD handles CSG operations, bevels, fillets — hand-rolling 3D geometry is error-prone [VERIFIED: openscad.org] |
| PDF report generation | Custom HTML-to-PDF pipeline | ReportLab or WeasyPrint | Reliable PDF generation with charts, tables, images [ASSUMED] |
| BLE device management | Raw WebSocket to BLE | Web Bluetooth API | Browser-native API handles pairing, GATT services, notifications [VERIFIED: MDN] |
| Image upload + resize + storage | Custom multer + sharp pipeline | Payload CMS Uploads + cloud storage adapter | Payload handles resize, format conversion, S3/R2 upload [VERIFIED: payloadcms.com] |

**Key insight:** This phase has three distinct complexity domains (parametric CAD, BLE hardware, CMS). Using established tools for each domain lets the team focus on the unique business logic (optimization algorithms, biomechanical analysis) rather than infrastructure.

## Common Pitfalls

### Pitfall 1: OpenSCAD Not Installed on Server
**What goes wrong:** `subprocess.run(["openscad", ...])` fails with FileNotFoundError in production.
**Why it happens:** OpenSCAD is a desktop application; it's not in standard Docker base images.
**How to avoid:** Add OpenSCAD to the Dockerfile: `RUN apt-get update && apt-get install -y openscad xvfb` (xvfb needed for headless rendering on Linux).
**Warning signs:** Works on macOS dev machine, fails in CI/Docker.

### Pitfall 2: Web Bluetooth iOS Incompatibility
**What goes wrong:** SALTED BLE connection fails on iPhone Safari.
**Why it happens:** Web Bluetooth API is NOT supported on Safari (iOS or macOS). Only Chrome, Edge, Opera on desktop/Android. [VERIFIED: caniuse.com/web-bluetooth]
**How to avoid:** SALTED Line 2 is for offline store use. Provide Android tablets at store. Show clear browser requirement message. Consider future native app for iOS.
**Warning signs:** Customer complaints about BLE not working on iPhone.

### Pitfall 3: Payload CMS Database Conflicts with Existing Drizzle Schema
**What goes wrong:** Payload creates its own tables via its internal Drizzle instance, potentially conflicting with existing schema migrations.
**Why it happens:** Payload CMS 3.x uses Drizzle internally but manages its own migration state.
**How to avoid:** Use separate migration directories. Let Payload manage `payload_*` prefixed tables. Reference Payload data only through Payload's Local API, not direct Drizzle queries. [CITED: payloadcms.com/docs/database/postgres]
**Warning signs:** Migration errors, duplicate table names.

### Pitfall 4: OpenSCAD Timeout on Complex Models
**What goes wrong:** OpenSCAD rendering takes >60 seconds for complex insole geometry.
**Why it happens:** High polygon count from smooth curves, boolean operations.
**How to avoid:** Set `$fn` (facet number) appropriately in .scad templates. Use $fn=50 for development, $fn=100 for production. Set subprocess timeout to 120s. Queue long-running generation as background jobs.
**Warning signs:** API timeout errors on insole generation endpoint.

### Pitfall 5: Varioshore TPU Temperature Precision
**What goes wrong:** Slicer profile generates wrong hardness because temperature mapping is off.
**Why it happens:** Varioshore foaming behavior is non-linear. Small temperature changes (5-10C) cause significant hardness changes. [VERIFIED: colorFabb technical datasheet]
**How to avoid:** Use the exact temperature-hardness mapping from D-03. Test with physical prints. Include temperature tolerance warnings in slicer profile comments.
**Warning signs:** Printed insoles have wrong stiffness in specific zones.

### Pitfall 6: BLE Data Loss During 5-Minute Session
**What goes wrong:** Browser tab backgrounding or screen lock interrupts BLE connection.
**Why it happens:** Browsers may throttle or disconnect BLE when tab is not visible. Mobile Chrome has aggressive background restrictions.
**How to avoid:** Request Wake Lock API (`navigator.wakeLock.request('screen')`) during session. Show "keep screen on" instruction. Buffer data locally and detect/recover from disconnection.
**Warning signs:** Incomplete session data, sudden data gaps.

## Code Examples

### Arch Height Optimization (D-01)

```python
# Source: User research report Section 10.3.2 [CITED: CONTEXT.md D-01]
def calculate_optimal_arch_height(
    navicular_height: float,  # mm, from SfM measurement
    midfoot_pressure_ratio: float,  # 0-1, from AI estimation or SALTED
    body_weight: float,  # kg
    foot_length: float,  # mm
) -> float:
    """Calculate optimal insole arch height in mm.

    Arch height determines 79.4% of plantar stress distribution.
    """
    # Base arch height by arch type classification
    if navicular_height < 15:  # flat arch
        base = 35.0
    elif navicular_height > 25:  # high arch
        base = 50.0
    else:  # normal arch
        base = 42.0

    # Pressure adjustment: higher midfoot pressure -> lower arch support needed
    pressure_adj = (0.5 - midfoot_pressure_ratio) * 10.0

    # Weight adjustment: heavier -> slightly higher arch for load distribution
    weight_adj = (body_weight - 70) * 0.05

    # Length scaling: longer foot needs proportionally adjusted arch
    length_scale = foot_length / 260.0  # normalize to average foot length

    optimal = (base + pressure_adj + weight_adj) * length_scale
    return round(max(25.0, min(60.0, optimal)), 1)  # clamp to safe range
```

### Heel Cup Depth Optimization (D-02)

```python
# Source: User research report Section 10.3.3 [CITED: CONTEXT.md D-02]
def calculate_optimal_heel_cup_depth(
    heel_peak_pressure: float,  # kPa, from AI estimation or SALTED
    pronation_degree: float,  # degrees, from gait analysis
    age: int,
    activity_type: str,  # 'daily', 'running', 'standing'
) -> float:
    """Calculate optimal heel cup depth in mm.

    Heel cup determines 40.2% of plantar stress distribution.
    Base: 20mm optimal + 10mm EVA cushion.
    """
    base = 20.0

    # Higher heel pressure -> deeper cup for better distribution
    if heel_peak_pressure > 300:
        pressure_adj = 5.0
    elif heel_peak_pressure > 200:
        pressure_adj = 2.5
    else:
        pressure_adj = 0.0

    # Pronation correction: more pronation -> deeper cup for stability
    pronation_adj = abs(pronation_degree) * 0.5

    # Age adjustment: older -> slightly deeper for stability
    age_adj = max(0, (age - 40) * 0.1)

    # Activity adjustment
    activity_adj = {'running': 3.0, 'standing': 2.0, 'daily': 0.0}.get(activity_type, 0.0)

    optimal = base + pressure_adj + pronation_adj + age_adj + activity_adj
    return round(max(15.0, min(35.0, optimal)), 1)
```

### Varioshore TPU Hardness Mapping (D-03)

```python
# Source: CONTEXT.md D-03 + colorFabb technical datasheet [CITED: colorfabb.com/media/datasheets]
VARIOSHORE_ZONES = {
    "arch_core":      {"temp_c": 190, "shore_a": 92, "flow_pct": 100, "color": "#ef4444"},
    "heel_cup_wall":  {"temp_c": 195, "shore_a": 85, "flow_pct": 95,  "color": "#f97316"},
    "heel_cup_floor": {"temp_c": 200, "shore_a": 75, "flow_pct": 85,  "color": "#eab308"},
    "forefoot":       {"temp_c": 210, "shore_a": 65, "flow_pct": 75,  "color": "#22c55e"},
    "toe_area":       {"temp_c": 220, "shore_a": 55, "flow_pct": 65,  "color": "#3b82f6"},
}

def get_slicer_zone_config(zone_name: str) -> dict:
    """Get PrusaSlicer modifier configuration for a zone."""
    zone = VARIOSHORE_ZONES[zone_name]
    return {
        "temperature": zone["temp_c"],
        "flow_rate_percent": zone["flow_pct"],
        "comment": f"Shore {zone['shore_a']}A - {zone_name.replace('_', ' ').title()}",
    }
```

### Drizzle Schema Extensions

```typescript
// Source: Existing schema.ts pattern [VERIFIED: src/lib/db/schema.ts]
// NEW tables for Phase 3

export const insoleDesigns = pgTable("insole_designs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scanId: uuid("scan_id").notNull().references(() => footScans.id),
  footSide: footSideEnum("foot_side").notNull(),
  lineType: text("line_type").notNull(), // 'general' | 'professional'
  designParams: jsonb("design_params").notNull(), // arch_height, heel_cup_depth, etc.
  hardnessMap: jsonb("hardness_map").notNull(), // zone -> {temp, shore_a}
  stlUrl: text("stl_url"),
  slicerProfileUrl: text("slicer_profile_url"),
  status: text("status").default("pending").notNull(), // pending | generating | completed | failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const saltedSessions = pgTable("salted_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scanId: uuid("scan_id").references(() => footScans.id),
  sessionType: text("session_type").notNull(), // 'initial' | 'verification'
  rawPressureData: jsonb("raw_pressure_data"), // stored as compressed array
  analysisResult: jsonb("analysis_result"), // landing pattern, COP, etc.
  durationSeconds: real("duration_seconds"),
  dataPointCount: real("data_point_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SolidPython (Python->OpenSCAD) | Direct .scad templates + CLI | SolidPython unmaintained since 2021 | Use Jinja2 templates for .scad, not Python wrapper libs [VERIFIED: PyPI] |
| Payload CMS 2.x (separate Express) | Payload CMS 3.x (embedded in Next.js) | 2024 | No separate server needed, Local API for zero-overhead queries [VERIFIED: payloadcms.com] |
| WebBluetooth experimental | WebBluetooth stable in Chrome | Chrome 56+ (2017), stable | Reliable for BLE on Chrome/Edge, still no Safari [VERIFIED: MDN] |
| PrusaSlicer manual profiles | PrusaSlicer CLI with config bundles | PrusaSlicer 2.5+ | Programmatic slicer profile generation possible [ASSUMED] |

**Deprecated/outdated:**
- SolidPython / OpenPySCAD: Both unmaintained Python wrappers for OpenSCAD. Use direct CLI invocation instead.
- Payload CMS 2.x: Requires separate Express server. v3.x embeds directly into Next.js.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Jinja2 is suitable for .scad template generation | Architecture Patterns | LOW - any template engine works; Jinja2 is already widely used in Python |
| A2 | ReportLab or WeasyPrint for PDF before/after reports | Standard Stack | LOW - can swap PDF library; core logic is data comparison, not PDF rendering |
| A3 | PrusaSlicer supports CLI-based profile generation with zone modifiers | Code Examples | MEDIUM - if PrusaSlicer CLI doesn't support modifier meshes programmatically, may need to generate .3mf project files instead |
| A4 | SALTED insole uses standard BLE GATT protocol accessible via Web Bluetooth | Architecture Patterns | HIGH - if SALTED uses proprietary SDK only (no open BLE protocol), Line 2 integration would need their native SDK or reverse engineering |
| A5 | 300K data points from 5-min SALTED session can be stored in jsonb column | Code Examples | MEDIUM - may need to use binary storage or separate time-series table for performance |
| A6 | OpenSCAD can generate production-quality insole STL within 120s timeout | Common Pitfalls | MEDIUM - complex geometry may require longer; consider async job queue |

## Open Questions

1. **SALTED SDK BLE Service UUIDs**
   - What we know: SALTED insole connects via Bluetooth, marketed as a consumer product with mobile app
   - What's unclear: Whether SALTED exposes standard BLE GATT services or requires proprietary SDK. No public developer documentation found in web search.
   - Recommendation: Contact SALTED (sports.salted.ltd) for SDK documentation. If unavailable, consider alternative smart insole hardware with open BLE protocol, or build a bridge via SALTED's mobile app data export.

2. **PrusaSlicer Zone Modifier Automation**
   - What we know: PrusaSlicer supports modifier meshes for per-region settings (temperature, flow rate)
   - What's unclear: Whether this can be fully automated via CLI/config files or requires manual .3mf project creation
   - Recommendation: Test PrusaSlicer CLI with `--load` config and modifier mesh objects. Fall back to generating complete .3mf project files if CLI is insufficient.

3. **Payload CMS + Existing Drizzle Migration Coexistence**
   - What we know: Both use Drizzle internally, both target same Neon Postgres database
   - What's unclear: Whether Payload's migration system conflicts with existing `drizzle-kit` migrations
   - Recommendation: Use separate schema prefixes. Run Payload migrations separately from app migrations. Test migration sequence in development first.

4. **OpenSCAD Insole Geometry Complexity**
   - What we know: Insole shape requires smooth curves (splines), heel cup, arch support structure
   - What's unclear: How complex the OpenSCAD parametric model needs to be for production-quality insoles
   - Recommendation: Start with simplified geometry (extruded cross-sections with hull()), iterate based on physical prototypes. $fn=50 for dev, $fn=100 for production.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3 | Insole engine (FastAPI) | Yes | 3.9.6 (system) | Docker container with Python 3.12+ |
| OpenSCAD | STL generation | No | -- | Install via Homebrew (dev) or apt-get (Docker) |
| PrusaSlicer CLI | Slicer profile validation | No | -- | Generate config files without validation; manual testing |
| Node.js/npm | Next.js + Payload CMS | Yes | (via existing project) | -- |
| Neon Postgres | Database | Yes | (via existing project) | -- |
| Web Bluetooth | SALTED BLE | Yes (browser API) | Chrome 56+ | -- (no fallback for Safari/Firefox) |

**Missing dependencies with no fallback:**
- OpenSCAD must be installed for STL generation. Add to Dockerfile and `brew install` for local dev.

**Missing dependencies with fallback:**
- PrusaSlicer CLI: Can generate profile config files without runtime validation. Physical print testing needed regardless.
- Python 3.9.6 (system) is older than target 3.12+. Docker container in `services/measurement/` already handles this via Dockerfile.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (Frontend) | Vitest 4.1.3 |
| Framework (Backend) | pytest (via FastAPI TestClient) |
| Config file (Frontend) | `vitest.config.ts` |
| Config file (Backend) | `services/measurement/tests/conftest.py` |
| Quick run command (Frontend) | `npx vitest run --reporter=verbose` |
| Quick run command (Backend) | `cd services/measurement && python -m pytest tests/ -x` |
| Full suite command | `npx vitest run && cd services/measurement && python -m pytest tests/` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INSL-01 | Insole design from scan data | unit | `python -m pytest tests/test_optimizer.py -x` | No - Wave 0 |
| INSL-02 | Arch height + heel cup calculation | unit | `python -m pytest tests/test_optimizer.py::test_arch_height -x` | No - Wave 0 |
| INSL-03 | 3D insole preview rendering | manual-only | Visual inspection in browser | N/A |
| INSL-04 | Size recommendation from scan | unit | `python -m pytest tests/test_size_recommend.py -x` | No - Wave 0 |
| SALT-01 | BLE connection to SALTED | manual-only | Requires physical hardware | N/A |
| SALT-02 | 5-min session data collection | integration | `python -m pytest tests/test_salted_session.py -x` | No - Wave 0 |
| SALT-03 | Biomechanical analysis | unit | `python -m pytest tests/test_biomechanical.py -x` | No - Wave 0 |
| SALT-04 | Precision insole from SALTED data | unit | `python -m pytest tests/test_optimizer.py::test_salted_input -x` | No - Wave 0 |
| SALT-05 | OpenSCAD -> STL generation | integration | `python -m pytest tests/test_stl_export.py -x` | No - Wave 0 |
| SALT-06 | Before/after report | unit | `python -m pytest tests/test_report.py -x` | No - Wave 0 |
| PROD-01 | Browse products by category | integration | `npx vitest run src/**/*product*.test.ts` | No - Wave 0 |
| PROD-02 | Filter products | integration | `npx vitest run src/**/*filter*.test.ts` | No - Wave 0 |
| PROD-03 | Product detail page | smoke | `npx vitest run src/**/*product-detail*.test.ts` | No - Wave 0 |
| PROD-04 | Bundle pricing display | unit | `npx vitest run src/**/*bundle*.test.ts` | No - Wave 0 |
| PROD-05 | Insole preview on product page | manual-only | Visual inspection | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose` + `cd services/measurement && python -m pytest tests/ -x`
- **Per wave merge:** Full suite
- **Phase gate:** All automated tests green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `services/measurement/tests/test_optimizer.py` -- covers INSL-01, INSL-02, SALT-04
- [ ] `services/measurement/tests/test_stl_export.py` -- covers SALT-05
- [ ] `services/measurement/tests/test_biomechanical.py` -- covers SALT-03
- [ ] `services/measurement/tests/test_salted_session.py` -- covers SALT-02
- [ ] `services/measurement/tests/test_report.py` -- covers SALT-06
- [ ] `services/measurement/tests/test_size_recommend.py` -- covers INSL-04
- [ ] `src/components/products/__tests__/product-card.test.tsx` -- covers PROD-01
- [ ] `src/lib/insole/__tests__/types.test.ts` -- covers type validation
- [ ] OpenSCAD install in test environment: `apt-get install openscad` or mock subprocess

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (existing) | Auth.js -- already implemented |
| V3 Session Management | Yes (existing) | Auth.js sessions -- already implemented |
| V4 Access Control | Yes | userId filtering on all insole/SALTED endpoints (IDOR prevention, same as Phase 2 pattern) |
| V5 Input Validation | Yes | Zod schemas for design parameters, Pydantic models for Python API inputs |
| V6 Cryptography | No | No new crypto requirements |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on insole designs | Tampering | Filter all queries by `userId` from auth session (existing pattern from Phase 2) |
| Malicious OpenSCAD input | Tampering | Validate all numeric parameters with min/max bounds before passing to OpenSCAD |
| BLE data spoofing | Spoofing | Server-side validation of pressure data ranges; flag anomalous readings |
| File path traversal in STL URLs | Information Disclosure | Generate UUID-based filenames, serve via signed URLs from S3/R2 |
| Payload CMS admin access | Elevation of Privilege | Payload access control config with role-based permissions |

## Sources

### Primary (HIGH confidence)
- [npm registry] - Payload CMS 3.82.1, @payloadcms/db-postgres 3.82.1, @react-three/fiber 9.5.0, drei 10.7.7, three 0.183.2, vitest 4.1.4
- [Payload CMS docs: Collections](https://payloadcms.com/docs/configuration/collections) - Collection config patterns
- [Payload CMS docs: Postgres](https://payloadcms.com/docs/database/postgres) - Postgres adapter setup
- [MDN Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) - BLE browser support, limitations
- [Can I Use: Web Bluetooth](https://caniuse.com/web-bluetooth) - Browser compatibility matrix
- [OpenSCAD CLI docs](https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Using_OpenSCAD_in_a_command_line_environment) - Command-line STL export
- [colorFabb Varioshore TPU Technical Datasheet](https://colorfabb.com/media/datasheets/tds/colorfabb/TDS_E_ColorFabb_varioShore_TPU.pdf) - Temperature-hardness mapping
- [Existing codebase] - schema.ts, foot-model-3d.tsx, requirements.txt, scan/types.ts, conftest.py

### Secondary (MEDIUM confidence)
- [Payload CMS 3.81.0 changelog](https://www.bradfarleigh.com/2026/04/payload-cms-3-81-0-whats-new-nextjs/) - Recent Payload updates
- [Neon + Payload guide](https://neon.com/guides/payload) - Payload with Neon Postgres setup
- [CNC Kitchen Varioshore testing](https://www.cnckitchen.com/blog/testing-colorfabb-varioshore-tpu-foaming-3d-printing-filament) - Real-world temperature-hardness measurements

### Tertiary (LOW confidence)
- [SALTED product page](https://sports.salted.ltd/en/product/smart-insole) - Product info only, no SDK docs found
- [PyPI: openpyscad 0.5.0](https://pypi.org/project/openpyscad/) - Last updated 2021, unmaintained
- [PyPI: solidpython2](https://pypi.org/project/solidpython2/) - Available but low maintenance activity

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all npm packages verified, Payload CMS well-documented
- Architecture: MEDIUM - OpenSCAD pipeline pattern is proven but insole-specific geometry untested
- Pitfalls: HIGH - well-known issues with Web Bluetooth, OpenSCAD headless, Payload+Drizzle coexistence
- SALTED SDK integration: LOW - no public developer documentation found; BLE service UUIDs unknown

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 days - stable technologies except SALTED SDK which needs immediate verification)
