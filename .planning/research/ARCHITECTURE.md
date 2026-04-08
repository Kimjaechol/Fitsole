# Architecture Research

**Domain:** Custom insole shoe e-commerce with smartphone-based foot measurement
**Researched:** 2026-04-09
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Client Layer (Mobile Web)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  Foot Scan   │  │  Storefront  │  │  Order       │                  │
│  │  Module       │  │  (Browse/    │  │  Tracking    │                  │
│  │  (Camera +   │  │   Cart/Pay)  │  │  Dashboard   │                  │
│  │   CV Engine) │  │              │  │              │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
├─────────┴────────────────┴────────────────┴────────────────────────────┤
│                          API Gateway / BFF                              │
├─────────────────────────────────────────────────────────────────────────┤
│                         Backend Services                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│  │ Measurement│ │  Insole    │ │  Product   │ │  Order     │          │
│  │ Service    │ │  Design    │ │  Catalog   │ │  Management│          │
│  │            │ │  Engine    │ │  Service   │ │  Service   │          │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘          │
│        │              │              │              │                  │
│  ┌─────┴──────┐ ┌─────┴──────┐      │        ┌─────┴──────┐          │
│  │ CV/ML      │ │ Parametric │      │        │ Factory    │          │
│  │ Processing │ │ CAD Engine │      │        │ Integration│          │
│  └────────────┘ └────────────┘      │        └────────────┘          │
├─────────────────────────────────────────────────────────────────────────┤
│                         Data Layer                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ User DB  │  │ Product  │  │ Order DB │  │ File/3D  │               │
│  │ + Foot   │  │ Catalog  │  │          │  │ Asset    │               │
│  │ Profiles │  │ DB       │  │          │  │ Storage  │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Foot Scan Module | Capture foot images via smartphone camera, run client-side CV for keypoint detection, send images for server-side processing | Browser-based camera API + TensorFlow.js or MediaPipe for client-side inference |
| Measurement Service | Process foot images, extract dimensions (length, width, arch height, instep), store measurement profiles | Python (FastAPI) with OpenCV, monocular depth estimation models |
| Insole Design Engine | Generate parametric insole 3D model from measurement data, apply arch support and pressure distribution rules | Python with parametric CAD (CadQuery/OpenSCAD), outputs STL/PLY files |
| Product Catalog Service | Manage shoe categories, inventory, pricing, product images | Standard CRUD service, PostgreSQL-backed |
| Order Management Service | Handle cart, checkout, payment processing, order lifecycle (placed, manufacturing, shipped, delivered) | Stateful workflow engine with payment gateway integration |
| Factory Integration | Translate insole designs to factory-compatible formats, transmit orders, receive status updates | REST/webhook-based adapter pattern per factory partner |
| Storefront | Browse products, view insole preview, manage cart, checkout flow | Next.js or similar SSR framework |
| Order Tracking Dashboard | Show order status, manufacturing progress, shipping tracking | Real-time updates via SSE or polling |

## Recommended Project Structure

```
fitsole/
├── apps/
│   ├── web/                    # Next.js storefront + foot scan UI
│   │   ├── app/                # App Router pages
│   │   │   ├── (storefront)/   # Product browsing, cart, checkout
│   │   │   ├── (measurement)/  # Foot scanning flow
│   │   │   ├── (account)/      # User profile, order history, foot data
│   │   │   └── api/            # BFF API routes
│   │   ├── components/
│   │   │   ├── scan/           # Camera capture, guide overlay, preview
│   │   │   ├── insole/         # 3D insole preview, customization UI
│   │   │   └── shop/           # Product cards, cart, checkout forms
│   │   └── lib/
│   │       ├── cv/             # Client-side CV helpers (TF.js/MediaPipe)
│   │       └── three/          # Three.js 3D rendering utilities
│   └── admin/                  # Admin dashboard (order management, product CRUD)
├── services/
│   ├── measurement/            # Python - CV pipeline, foot dimension extraction
│   │   ├── models/             # ML model weights and configs
│   │   ├── pipeline/           # Image processing pipeline steps
│   │   └── api/                # FastAPI endpoints
│   ├── insole-engine/          # Python - Parametric insole generation
│   │   ├── templates/          # Base insole parametric templates
│   │   ├── algorithms/         # Arch support, pressure distribution logic
│   │   └── export/             # STL/PLY/STEP export
│   └── factory-adapter/        # Factory order transmission + status sync
├── packages/
│   ├── db/                     # Shared Prisma schema + migrations
│   ├── types/                  # Shared TypeScript types
│   └── config/                 # Shared configuration
├── infrastructure/
│   ├── docker/                 # Dockerfiles per service
│   └── deploy/                 # Deployment configs
└── docs/                       # API docs, measurement protocol specs
```

### Structure Rationale

- **apps/web:** Single Next.js app handles both storefront and measurement flows. Measurement is inherently mobile-web (camera access), so keeping it in the same app avoids app-switching friction.
- **services/measurement:** Separate Python service because CV/ML processing requires Python ecosystem (OpenCV, PyTorch/TF). Heavy computation stays server-side; client only captures and sends images.
- **services/insole-engine:** Separate from measurement because insole design is a distinct domain. Takes measurement output, produces 3D geometry. Can be iterated independently.
- **services/factory-adapter:** Isolated because each factory partner may have different integration requirements. Adapter pattern allows adding new factories without touching core logic.
- **packages/:** Monorepo shared packages keep TypeScript types and database schema consistent across apps.

## Architectural Patterns

### Pattern 1: Reference-Object Calibration for Measurement

**What:** User places a known-size reference object (A4 paper or standard coin) beside their foot before capturing images. The system detects the reference object to establish pixel-to-millimeter ratio, enabling accurate measurement without LiDAR or depth sensors.
**When to use:** Always -- this is the core technique that enables measurement on any smartphone without special hardware.
**Trade-offs:** Adds a step to user experience (must have reference object), but dramatically increases accuracy (95-99% reported in research) and device compatibility. A4 paper is the best reference object because it is universally available and has standardized dimensions.

### Pattern 2: Client-Side Pre-processing, Server-Side Analysis

**What:** Run lightweight ML models (MediaPipe pose/hand landmarks adapted for feet, or custom keypoint detection) in the browser via TensorFlow.js to provide real-time guidance (foot position, lighting quality, blur detection). Send captured frames to server for heavy processing (dimension extraction, depth estimation).
**When to use:** When you need real-time user feedback during capture but accurate measurements require heavy computation.
**Trade-offs:** Increases client bundle size (~5-10MB for TF.js models), but provides instant feedback that reduces bad captures and rescans. Server-side processing adds latency (2-5 seconds) but produces reliable measurements.

### Pattern 3: Parametric Insole Generation Pipeline

**What:** Instead of designing each insole from scratch, use a parametric template system where base insole shapes are defined with adjustable parameters (arch height, heel cup depth, metatarsal pad position, overall dimensions). Measurement data maps directly to parameter values.
**When to use:** For automated insole design from measurement data.
**Trade-offs:** Less flexible than full custom CAD (cannot handle extreme deformities), but reduces design time from hours to seconds. Research shows parametric approaches cut design time from 3+ hours to under 2 minutes. Covers 90%+ of consumer use cases.

**Pipeline:**
```
Foot Measurements → Parameter Mapping → Template Selection → 
Parametric Adjustment → Pressure Distribution Optimization → 
3D Model Generation (STL) → Factory-Ready Export
```

### Pattern 4: Order State Machine with Manufacturing States

**What:** Model the order lifecycle as an explicit state machine that includes manufacturing-specific states beyond standard e-commerce (placed, paid, design-generated, sent-to-factory, in-production, quality-check, shipped, delivered). Each transition triggers side effects (notifications, factory API calls).
**When to use:** Always for this domain -- custom manufacturing adds states that standard e-commerce order models do not have.
**Trade-offs:** More complex than simple status strings, but prevents invalid state transitions and makes the system predictable. Essential for customer communication ("your insole is being 3D printed").

```
placed → paid → design_generated → sent_to_factory → 
in_production → quality_check → shipped → delivered
                                    ↘ rejected → redesign → sent_to_factory
```

## Data Flow

### Foot Measurement Flow (Core)

```
[User opens camera]
    ↓
[Client-side guide: position foot on A4 paper]
    ↓
[Client-side ML: real-time foot detection + quality check]
    ↓
[Capture 3-5 images: top view, side view, rear view]
    ↓
[Upload images to Measurement Service]
    ↓
[Server CV pipeline: reference detection → calibration → 
 keypoint extraction → dimension calculation]
    ↓
[Store: foot profile (length, width, arch height, instep) + raw images]
    ↓
[Return: measurement results + confidence scores to client]
```

### Order & Manufacturing Flow

```
[User selects shoe + confirms insole customization]
    ↓
[Order Service: create order with shoe + measurement reference]
    ↓
[Payment Service: process payment via PG (Toss/KG Inicis)]
    ↓
[Insole Engine: generate parametric 3D model from measurement data]
    ↓
[Store 3D file (S3/Cloud Storage)]
    ↓
[Factory Adapter: package order (3D file + shoe spec + shipping info)]
    ↓
[Factory API/webhook: transmit order]
    ↓
[Factory status polling/webhook: production updates]
    ↓
[Order Service: update state → notify customer]
    ↓
[Shipping integration: tracking number → delivery confirmation]
```

### Key Data Flows

1. **Measurement-to-Design:** Measurement Service produces a structured foot profile (JSON with dimensions + confidence). Insole Engine consumes this to generate 3D geometry. These are decoupled via the database -- measurement writes the profile, design engine reads it on demand. This allows re-running design with improved algorithms without re-measuring.

2. **Design-to-Factory:** Insole Engine produces STL/PLY files stored in cloud storage. Factory Adapter reads the file URL + order metadata and packages it into the factory's required format (could be email with attachment, API call with file upload, or FTP drop depending on factory).

3. **Factory-to-Customer:** Factory status updates flow back through Factory Adapter into Order Service, which updates order state and triggers customer notifications (email/SMS/push).

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Monolithic backend is fine. Run measurement + insole engine as background workers on the same server. SQLite or single PostgreSQL instance. Store 3D files locally or single S3 bucket. |
| 1k-100k users | Separate measurement/insole services into independent deployable units. Add Redis for job queuing (measurement processing is CPU-heavy). CDN for product images. PostgreSQL with read replicas. |
| 100k+ users | Measurement service needs GPU instances for ML inference at scale. Consider pre-computing common insole templates. Queue-based architecture for factory orders. Multi-region deployment for latency. |

### Scaling Priorities

1. **First bottleneck: Measurement processing.** CV/ML inference is CPU/GPU intensive. At ~100 concurrent scans, a single server will queue up. Solution: horizontal scaling with job queue (Bull/BullMQ or Celery) distributing to worker pool.
2. **Second bottleneck: 3D file storage and generation.** Each insole design produces 5-50MB of 3D assets. At scale, storage costs and generation time matter. Solution: cache common parametric variations, use cloud storage with CDN.

## Anti-Patterns

### Anti-Pattern 1: Running Heavy CV on Client Only

**What people do:** Try to do all foot measurement processing in the browser to avoid server costs.
**Why it's wrong:** Browser ML models are limited in accuracy. Monocular depth estimation and precise measurement extraction require larger models than browsers can efficiently run. Results in poor measurement accuracy and frustrated users on lower-end devices.
**Do this instead:** Use client-side ML only for guidance and quality checking. Send captured images to server for actual measurement extraction with full-size models.

### Anti-Pattern 2: Treating Insole Design as a CRUD Operation

**What people do:** Store insole specifications as simple database fields (arch_height: 25mm, length: 270mm) and generate the 3D model only at factory submission time.
**Why it's wrong:** Users need to preview their insole design before purchasing. The 3D model generation can fail or produce unexpected results. Discovering this at order submission is too late.
**Do this instead:** Generate the 3D model immediately after measurement, show the user a 3D preview (Three.js), and store the validated model. The customer sees what they are buying.

### Anti-Pattern 3: Tight Coupling to Single Factory

**What people do:** Build factory integration directly into the order service with factory-specific logic embedded throughout.
**Why it's wrong:** Factory relationships change. You may need to add backup factories, switch factories for specific product types, or handle factory downtime. Embedded factory logic makes this painful.
**Do this instead:** Use the Adapter pattern. Define a FactoryPort interface (submitOrder, getStatus, cancelOrder). Each factory gets its own adapter implementation. Order service talks only to the port interface.

### Anti-Pattern 4: Skipping Measurement Validation

**What people do:** Accept any measurement result and proceed to insole design without sanity checking.
**Why it's wrong:** Bad images (poor lighting, wrong angle, no reference object visible) produce garbage measurements. A 50mm foot length or 300mm arch height will produce an unusable insole, waste manufacturing resources, and guarantee a return.
**Do this instead:** Implement measurement validation at multiple levels: (1) client-side image quality checks before upload, (2) server-side reference object detection confidence threshold, (3) anatomical plausibility checks (foot length 150-350mm, width 60-130mm, etc.), (4) user confirmation of results before proceeding.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Payment Gateway (Toss Payments / KG Inicis) | Server-side SDK + client redirect/widget | Korean market requires Korean PG. Toss is modern API-first. Handle webhook for payment confirmation. |
| Factory Manufacturing API | REST + webhook or polling | Factory may not have modern APIs. Plan for email/FTP fallback with manual status updates as interim. |
| Shipping/Logistics (CJ Logistics / Hanjin) | Tracking API integration | Get tracking number from factory, provide to customer. Most Korean logistics have tracking APIs. |
| Cloud Storage (AWS S3 / GCP Cloud Storage) | SDK direct upload + signed URLs | For 3D scan data, insole models, product images. Use signed URLs for factory download access. |
| Email/SMS Notifications (AWS SES / NHN Cloud) | Event-driven via message queue | Order confirmations, manufacturing updates, shipping notifications. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Web App <-> Measurement Service | REST API (image upload + JSON response) | Large payloads (images). Use multipart upload. Consider presigned URL upload to S3 then trigger processing. |
| Measurement Service <-> Insole Engine | Async job queue or REST | Measurement produces foot profile, insole engine consumes it. Can be sync for preview, async for final production model. |
| Order Service <-> Factory Adapter | Async event/queue | Orders should queue for factory submission. Factory may have rate limits or batch processing windows. |
| Order Service <-> Payment Gateway | Sync REST for initiation, webhook for confirmation | Never mark order as paid based on client-side callback alone. Always verify via server-side webhook. |

## Build Order (Dependencies)

The following build order respects component dependencies:

1. **Foundation:** User auth, database schema, basic Next.js app shell, product catalog -- these are standard e-commerce with no special dependencies.
2. **Foot Measurement:** Camera capture UI + measurement service. This is the core differentiator and highest-risk component. Build early to validate feasibility.
3. **Insole Design Engine:** Depends on measurement output format being stable. Build after measurement service API is defined.
4. **Insole Preview:** 3D rendering in browser (Three.js). Depends on insole engine producing viewable models.
5. **Order + Payment:** Standard e-commerce flow but with insole design integration. Depends on insole engine being functional.
6. **Factory Integration:** Depends on insole engine output format and order management. Build last because it requires factory partner coordination (external dependency).
7. **Order Tracking:** Depends on factory integration for status updates. Final piece.

**Critical path:** Measurement -> Insole Design -> Factory Integration. This is the novel pipeline. E-commerce storefront can be built in parallel.

## Sources

- [OptiFit: Computer-Vision-Based Smartphone Application to Measure the Foot](https://pmc.ncbi.nlm.nih.gov/articles/PMC9739363/) - Reference object calibration, measurement accuracy 95-99%
- [Efficient and accurate 3D foot measurement from smartphone image sequences](https://www.sciencedirect.com/science/article/abs/pii/S0141938225003531) - SfM-based foot measurement architecture
- [Parametric custom design of insoles based on 3D foot shape and plantar pressure](http://www.txxb.com.cn/EN/10.11996/JG.j.2095-302X.2024030558) - Parametric insole design algorithm
- [Modernizing Orthotics with TrueDepth & ARKit](https://xorbix.com/case-study/modernizing-orthotics-with-truedepth-technology/) - 3D scanning architecture with cloud integration
- [VoxelCare end-to-end custom 3D printed orthotics](https://www.voxelmatters.com/voxelcare-steps-up-with-end-to-end-custom-3d-printed-orthotics-solution/) - Manufacturing pipeline
- [OrthoCAD 2025](https://vertexorthopedic.com/solutions/orthocad) - CAD software for orthotics design automation
- [Mobile Apps for Foot Measurement: Scoping Review](https://pmc.ncbi.nlm.nih.gov/articles/PMC7974751/) - Survey of foot measurement approaches and accuracy
- [Mosaic Manufacturing - Future of Orthotics Production](https://mosaicmfg.com/the-future-of-orthotics-production/) - End-to-end digital manufacturing workflow

---
*Architecture research for: FitSole custom insole shoe e-commerce platform*
*Researched: 2026-04-09*
