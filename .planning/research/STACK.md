# Technology Stack

**Project:** FitSole - Custom Insole Shoe E-Commerce Platform
**Researched:** 2026-04-09

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 16.2 (stable) | Full-stack framework | Ships with Turbopack stable for dev and build, React 19.2 support with View Transitions, dominant e-commerce framework with SSR/SSG for SEO. Payload CMS integrates directly into the app folder. | HIGH |
| TypeScript | 5.7+ | Type safety | Non-negotiable for a platform handling measurement data, payment flows, and factory integration. Catches errors at compile time across the entire stack. | HIGH |
| React | 19.2 (via Next.js 16) | UI library | Bundled with Next.js 16. Server Components for product pages, Client Components for 3D measurement UI. | HIGH |

### Database & ORM

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Neon Postgres | Serverless | Primary database | Serverless Postgres with scale-to-zero (cost-effective for early stage), built-in connection pooling via PgBouncer, database branching for preview deployments. Official Vercel integration. Post-Databricks acquisition pricing dropped storage to $0.35/GB-month. | HIGH |
| Drizzle ORM | 0.45.x (stable) | Database ORM | 7.4KB bundle (vs Prisma's ~1.6MB) means faster serverless cold starts. SQL-like query builder gives full control over complex queries (product filtering, measurement data joins). Code-first TypeScript schemas with zero dependencies. | HIGH |
| drizzle-kit | latest | Migrations | Companion CLI for Drizzle. Handles schema migrations, introspection, and seeding. | HIGH |

### Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Auth.js (NextAuth v5) | 5.x | Authentication | De facto standard for Next.js auth. Supports credentials, OAuth (Kakao, Naver, Google for Korean market), and magic links. App Router native. | MEDIUM |

### Payment Processing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Toss Payments SDK | latest | Korean payment gateway | 30M+ users in Korea. Supports cards, KakaoPay, NaverPay, TossPay, bank transfer, virtual accounts. Well-documented REST API and JavaScript SDK. Essential for Korean e-commerce. | HIGH |
| Toss Payments (Direct Integration) | - | Checkout customization | Use Direct Integration (not Hosted) to keep custom branding and reduce checkout steps. More work but critical for UX in a premium custom product. | MEDIUM |

### CMS & Admin

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Payload CMS | 3.x | Headless CMS + Admin | Installs directly into the Next.js app folder -- no external SaaS. Local API eliminates HTTP overhead for server-side queries. TypeScript-first config for products, orders, categories. Built-in file uploads, access control, and admin UI. PostgreSQL adapter stable. | HIGH |

### Foot Measurement & 3D Pipeline

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| MediaPipe Pose Landmarker | @mediapipe/tasks-vision | Foot landmark detection | Google's ML model detects 33 body landmarks including 4 foot points (heel, foot index for both feet). Runs in-browser via WASM, no server round-trip needed. Free. | MEDIUM |
| TensorFlow.js | @tensorflow/tfjs + @tensorflow-models/depth-estimation | Monocular depth estimation | MiDaS model runs in browser for depth map from single camera image. Combined with MediaPipe landmarks, enables 3D foot dimension estimation without LiDAR. | MEDIUM |
| OpenCV.js | 4.x (WASM) | Image processing | Contour detection, reference object calibration (e.g., A4 paper for scale), edge detection for foot outline extraction. Runs in browser via WebAssembly. | MEDIUM |
| React Three Fiber | @react-three/fiber + @react-three/drei | 3D visualization | React wrapper for Three.js. Renders insole 3D preview, foot model visualization, and product configurator. drei provides OrbitControls, useGLTF for model loading. | HIGH |
| Three.js | r170+ | 3D engine | Underlying engine for R3F. GLB/GLTF model loading for shoe and insole previews. | HIGH |

### File Storage & Media

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| AWS S3 / Cloudflare R2 | - | File storage | Product images, 3D model files (GLB), measurement scan photos. R2 is S3-compatible with zero egress fees -- better for serving 3D assets and product images at scale. | HIGH |
| Payload CMS Uploads | built-in | Upload management | Payload handles upload routing, image resizing, and media library. Configure with S3/R2 adapter for production storage. | HIGH |

### Styling & UI Components

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.x | Utility CSS | Standard for modern Next.js. JIT compilation, responsive design utilities. v4 uses CSS-first configuration. | HIGH |
| shadcn/ui | latest | Component library | Copy-paste components (not npm dependency). Accessible, customizable. Ideal for admin dashboards, product pages, checkout flows. Built on Radix UI primitives. | HIGH |
| Framer Motion | 12.x | Animation | Page transitions, measurement step animations, product reveal effects. Lightweight and React-native. | MEDIUM |

### State Management & Data Fetching

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | 5.x | Client state | Lightweight store for measurement session state, cart, UI state. 1KB, no boilerplate. Perfect for foot scan workflow state machine. | HIGH |
| TanStack Query | 5.x | Server state | Caching, revalidation, optimistic updates for product listings, order status polling, measurement history. | MEDIUM |
| Zod | 3.x | Schema validation | Validate measurement data, API inputs, form data. Integrates with Drizzle schema, React Hook Form, and tRPC. | HIGH |

### Email & Notifications

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React Email | 3.x | Email templates | React components for transactional emails (order confirmation, shipping updates, measurement results). | MEDIUM |
| Resend | API | Email delivery | Simple API, good deliverability, React Email integration. 3,000 free emails/month for MVP. | MEDIUM |

### Factory Integration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Custom REST API | - | Factory order system | Most Korean manufacturing partners use simple REST/webhook integrations or even manual order sheets. Build a webhook-based order dispatch system. | MEDIUM |
| Bull MQ + Redis | latest | Job queue | Async order processing: measurement analysis, insole design generation, factory order dispatch. Redis-backed for reliability. | MEDIUM |

### Infrastructure & Deployment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel | - | Hosting & CDN | Native Next.js deployment, edge functions, preview deployments with Neon branching. Optimal DX for Next.js apps. | HIGH |
| Vercel Blob or R2 | - | Static assets | CDN-backed storage for product images and 3D model assets. | MEDIUM |

### AI / Insole Design Algorithm

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Python microservice (FastAPI) | 3.12+ / 0.115+ | Insole design engine | Foot measurement data -> custom insole parametric design. Python has superior scientific computing libraries (NumPy, SciPy, trimesh) for 3D geometry processing. Runs as separate service, called from Next.js API routes. | MEDIUM |
| Vercel AI SDK | 6.x | AI-assisted recommendations | Streaming product/insole recommendations based on foot analysis. Provider-agnostic (OpenAI, Anthropic, etc.). Optional enhancement, not core. | LOW |

### Monitoring & Analytics

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel Analytics | built-in | Web vitals | Core Web Vitals, page performance. Built into Vercel deployment. | HIGH |
| Sentry | @sentry/nextjs | Error tracking | Catch measurement pipeline failures, payment errors, factory integration issues. Critical for debugging 3D/ML code in production. | HIGH |
| PostHog | latest | Product analytics | Open-source, self-hostable. Track measurement completion rates, conversion funnels, feature usage. Korean data residency compliance. | MEDIUM |

### Testing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vitest | 3.x | Unit & integration tests | Fast, Vite-native, compatible with Jest API. Test measurement algorithms, business logic, API routes. | HIGH |
| Playwright | latest | E2E tests | Cross-browser testing for measurement flow, checkout, order tracking. Mobile viewport testing critical for foot scanning UX. | HIGH |
| MSW (Mock Service Worker) | 2.x | API mocking | Mock Toss Payments, factory APIs during testing. Browser and Node.js support. | MEDIUM |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 16 | Remix / Nuxt | Next.js has the strongest e-commerce ecosystem, Payload CMS integration, and Vercel deployment story. Remix lacks equivalent CMS integration. |
| ORM | Drizzle | Prisma | Prisma's 1.6MB bundle causes slow serverless cold starts. Drizzle's SQL-like API gives more control for complex measurement data queries. |
| Database | Neon Postgres | Supabase / PlanetScale | Neon's scale-to-zero is ideal for early-stage cost control. PlanetScale dropped free tier. Supabase adds unnecessary real-time complexity. Neon has native Vercel integration. |
| CMS | Payload CMS | Strapi / Sanity | Payload embeds in Next.js (no external service). Strapi is separate Node process. Sanity is SaaS with usage-based pricing. Payload is open-source with full control. |
| Payment | Toss Payments | Stripe | Stripe is global-first. Toss Payments is Korea-first with KakaoPay/NaverPay/bank transfer support that Korean consumers expect. Stripe lacks Korean-specific payment methods. |
| 3D | React Three Fiber | Babylon.js / raw Three.js | R3F provides React integration (declarative 3D scenes). Babylon.js is heavier and not React-native. Raw Three.js lacks component abstraction. |
| State | Zustand | Redux / Jotai | Redux is overkill for this scope. Jotai is fine but Zustand's store pattern better fits measurement workflow state machines. |
| Auth | Auth.js v5 | Clerk / Supabase Auth | Auth.js is free and self-hosted. Clerk adds SaaS cost. Supabase Auth ties you to Supabase ecosystem. Auth.js supports Kakao/Naver OAuth for Korean market. |
| File Upload | S3/R2 + Payload | UploadThing | UploadThing is simpler but adds SaaS dependency and cost at scale. Payload has built-in upload handling. R2 has zero egress for serving 3D assets. |
| Styling | Tailwind + shadcn/ui | Material UI / Chakra | MUI is heavy and opinionated. shadcn/ui gives full control over component source code -- essential for custom measurement UI. |
| Insole Engine | Python FastAPI | Node.js | Python's scientific computing ecosystem (NumPy, SciPy, trimesh, Open3D) is vastly superior for 3D geometry processing and parametric design. Node.js lacks equivalent libraries. |

---

## Installation

```bash
# Core framework
npx create-next-app@latest fitsole --typescript --tailwind --app --src-dir

# Database & ORM
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# CMS
npx create-payload-app@latest  # or integrate into existing Next.js

# Authentication
npm install next-auth@beta

# Payment
npm install @tosspayments/payment-sdk

# 3D & Measurement
npm install @react-three/fiber @react-three/drei three
npm install @mediapipe/tasks-vision
npm install @tensorflow/tfjs @tensorflow-models/depth-estimation
npm install -D @types/three

# UI Components
npx shadcn@latest init
npm install framer-motion

# State & Validation
npm install zustand @tanstack/react-query zod

# Email
npm install react-email resend

# Job Queue (if needed)
npm install bullmq ioredis

# Monitoring
npm install @sentry/nextjs posthog-js

# Testing
npm install -D vitest @playwright/test msw
```

```bash
# Python microservice (insole design engine)
pip install fastapi uvicorn numpy scipy trimesh
```

---

## Architecture Decision Records

### ADR-1: Hybrid Stack (Next.js + Python Microservice)

**Decision:** Use Next.js for the web platform and a separate Python FastAPI service for insole design computation.

**Rationale:** The foot measurement UI and e-commerce platform are web-first problems (Next.js excels). The insole design algorithm is a scientific computing problem (Python excels). Forcing both into one runtime compromises both. The Python service is called via internal API from Next.js API routes.

**Tradeoff:** Additional deployment complexity (two services). Mitigated by containerizing the Python service and deploying to Railway/Fly.io/Cloud Run alongside Vercel.

### ADR-2: Browser-Side Measurement Pipeline

**Decision:** Run the foot measurement ML pipeline (MediaPipe + TensorFlow.js + OpenCV.js) entirely in the browser.

**Rationale:** Eliminates server costs for GPU inference. Reduces latency (no upload/download cycle for camera frames). Preserves privacy (foot images never leave the device unless user opts in). Works offline after initial model download.

**Tradeoff:** Limited to models that run efficiently on mobile GPUs via WASM/WebGL. Measurement accuracy may be lower than server-side processing. Mitigate by validating client results server-side and offering re-scan guidance.

### ADR-3: Toss Payments over Stripe

**Decision:** Use Toss Payments as the primary payment gateway.

**Rationale:** Target market is Korean consumers. Toss Payments supports KakaoPay, NaverPay, TossPay, Samsung Pay, bank transfer, and virtual accounts -- payment methods that 80%+ of Korean consumers prefer. Stripe's Korean payment method support is limited.

**Tradeoff:** Less documentation in English, smaller global developer community. Toss Payments docs are solid in Korean and have English API references.

---

## Sources

- [Next.js 16.2 Stable Release](https://nextjs.org/blog) - HIGH confidence
- [Payload CMS 3.0 - Installs into Next.js](https://payloadcms.com/posts/blog/payload-30-the-first-cms-that-installs-directly-into-any-nextjs-app) - HIGH confidence
- [Drizzle ORM npm](https://www.npmjs.com/package/drizzle-orm) - HIGH confidence
- [Drizzle vs Prisma 2026 Comparison](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) - HIGH confidence
- [Neon Serverless Postgres](https://neon.com/) - HIGH confidence
- [Neon Pricing Post-Databricks](https://dev.to/whoffagents/neon-vs-supabase-vs-planetscale-managed-postgres-for-nextjs-in-2026-2el4) - MEDIUM confidence
- [MediaPipe Pose Landmarker Web JS](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js) - HIGH confidence
- [TensorFlow.js Depth Estimation](https://github.com/tensorflow/tfjs-models/blob/master/depth-estimation/README.md) - HIGH confidence
- [Toss Payments API Guide](https://docs.tosspayments.com/en/api-guide) - HIGH confidence
- [Toss Payments Integration Guide](https://docs.tosspayments.com/en/integration) - HIGH confidence
- [React Three Fiber E-commerce Product Visualization](https://dev.to/kellythomas/how-to-create-high-performance-3d-product-viewers-using-threejs-react-for-modern-ecommerce-stores-5f7p) - MEDIUM confidence
- [Smartphone Foot 3D Measurement via SfM](https://www.sciencedirect.com/science/article/abs/pii/S0141938225003531) - HIGH confidence
- [OpenCV.js Tutorials](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html) - HIGH confidence
- [Vercel AI SDK](https://ai-sdk.dev/docs/introduction) - HIGH confidence
