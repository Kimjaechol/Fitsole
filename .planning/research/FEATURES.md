# Feature Research

**Domain:** Custom insole + shoe e-commerce platform (smartphone-based foot measurement)
**Researched:** 2026-04-09
**Confidence:** MEDIUM — based on competitor analysis (Upstep, Wiivv/FitMyFoot, Bilt Labs, ScanSoles, Sole Dynamix) and academic review of foot scanning technology

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| User account with foot measurement history | Every competitor stores measurement data for reorders; users expect "scan once, buy many" | LOW | Store multiple foot profiles (left/right asymmetry is common) |
| Guided foot scanning flow | Wiivv, ScanSoles, Sole Dynamix all provide step-by-step guided scanning; users won't tolerate ambiguous "take a photo" | HIGH | Must handle lighting guidance, A4 paper calibration reference, real-time feedback on scan quality. iPhone depth sensor (TrueDepth/LiDAR) or photo-based with CV processing |
| Shoe catalog with filtering/search | Standard e-commerce expectation — category, size, price, style filtering | MEDIUM | Categories: running, walking, dress, boots, sandals. Filter by foot condition compatibility |
| Product detail page with multiple images | Users expect high-quality shoe images from multiple angles, zoom capability | LOW | Standard e-commerce pattern |
| Shoe + insole bundle ordering | This IS the product — the set purchase is the core value proposition | MEDIUM | Must clearly show what's included: shoe + custom insole. Price breakdown visible |
| Shopping cart and checkout | Every e-commerce platform has this; users leave immediately without standard checkout | MEDIUM | Support guest checkout. Payment gateway (card, mobile pay). Address validation |
| Order status tracking | Upstep sends text/email updates; Wiivv ships in 7 days. Users expect visibility into custom manufacturing timeline | MEDIUM | Stages: Order confirmed -> Insole designing -> Manufacturing -> Shipping -> Delivered |
| Mobile-first responsive design | Foot scanning happens on smartphone; the entire flow must be mobile-native | MEDIUM | Not just responsive — scanning UI must be built for mobile camera interaction |
| Customer support / contact | All competitors offer direct support channels. Custom products generate more questions than off-the-shelf | LOW | Chat, email, or phone. FAQ covering measurement accuracy and fit concerns |
| Return/exchange policy with satisfaction guarantee | Industry standard is 30-90 days (Upstep: 180 days, Fulton: 90 days, Wiivv: 30 days). Custom products need strong guarantees to overcome purchase hesitation | LOW (policy) | Remake/adjustment option is more practical than returns for custom goods. Consider 90-day guarantee with free remake |
| Secure payment processing | Non-negotiable for any e-commerce | MEDIUM | PCI compliance via payment gateway (Stripe, Toss Payments for Korean market) |
| Email notifications (order confirmation, shipping, delivery) | Standard e-commerce communication | LOW | Transactional emails at each order stage |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required by users, but create meaningful competitive distance.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-powered insole design recommendation | Most competitors use manual podiatrist review (Upstep, Bilt Labs). Automated design based on scan data + foot condition + activity type = faster turnaround and lower cost | HIGH | Algorithm maps arch height, pressure distribution, pronation to insole parameters. This is the technical core differentiator |
| Customer segment-specific UX flows | Three distinct entry points: (1) foot health concern (plantar fasciitis, flat feet, etc.), (2) comfort-seeking general consumer, (3) athlete performance. Each flow asks different questions and recommends differently | MEDIUM | Competitors offer generic quizzes. Segment-specific flows build trust with each audience |
| Insole customization preview/visualization | Show users what their custom insole will look like before ordering — arch support zones, material choices, color. No competitor does this well | HIGH | 3D insole model rendered from scan data. Interactive: users see how their measurements map to insole design |
| Foot health education content | Position platform as expert authority, not just a store. Blog/guides on plantar fasciitis, pronation, arch types, sport-specific foot care | LOW | Builds SEO, trust, and reduces support tickets. Can drive organic traffic |
| Reorder with updated/previous measurements | "Your feet from 6 months ago" vs "scan again" — users with stored profiles can reorder in under 2 minutes | LOW | Wiivv supports reorders but doesn't emphasize it. Make this a first-class feature |
| Scan quality scoring with re-scan prompts | Academic research shows foot scanning apps fail on accuracy due to lighting, angle, surface issues. Real-time quality feedback during scanning prevents bad measurements | HIGH | Analyze scan input quality before processing. Reject blurry/poorly lit scans with specific guidance |
| Manufacturing partner integration dashboard | Direct API connection to factory for order dispatch, production status, QC reporting. Competitors use manual processes | HIGH | Factory-side: receive order specs, update production status. Platform-side: real-time sync |
| FSA/HSA eligibility documentation | Bilt Labs and Upstep highlight FSA/HSA eligibility prominently — it's a purchase motivator for health-focused customers in US market | LOW | Provide receipt format compatible with FSA/HSA claims. Consider if applicable in Korean market (health insurance integration) |
| Size recommendation engine | Based on foot scan data, recommend specific shoe sizes per brand/model. Reduces returns significantly | MEDIUM | Map scan dimensions to shoe last dimensions per product |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Deliberately not building these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| AR shoe try-on (virtual fitting) | Nike/Gucci do it; seems modern and engaging | Enormous complexity (3D shoe models for every SKU, real-time rendering); conversion lift is for brand shoes, not custom insoles where the value is internal fit, not appearance. ROI doesn't justify cost for a startup | High-quality product photography + insole customization preview instead |
| Real-time gait analysis via phone | Some competitors mention gait analytics; sounds impressive | Smartphone accelerometer/camera-based gait analysis is unreliable for clinical use (per academic review). Making claims based on bad data creates liability | Focus on static foot measurement (dimensions, arch) which smartphone cameras CAN do reliably. Offer gait analysis as future professional-grade add-on |
| Social features / community forum | "Build a community around foot health" | Moderation burden, medical misinformation risk, low engagement for a product you buy 1-2x per year. Distraction from core commerce | Curated educational blog content. Link to external communities |
| In-app podiatrist consultation (telemedicine) | Upstep has podiatrist review; could go further with live consults | Regulatory complexity (medical licensing per jurisdiction), liability, staffing cost. Overkill for a product platform | Partner with telehealth platforms. Provide scan data export for users to share with their own podiatrist |
| Custom shoe manufacturing (not just insoles) | "Why stop at insoles? Custom shoes too!" | 10x manufacturing complexity. Custom shoe lasts, material sourcing, sizing per design. Completely different supply chain | Curate pre-made shoes that pair well with custom insoles. The insole IS the customization |
| Subscription/auto-reorder insoles | SaaS-ify everything; recurring revenue | Insoles last 1-3 years. Forcing subscription on a durable good annoys customers and increases churn | Proactive reorder reminders based on purchase date + usage (email nudge at 12-18 months) |
| Overly detailed medical questionnaire | "More data = better insole" | Users abandon long forms. Most consumers aren't patients. Asking 30 medical questions for a shoe purchase is friction | Tiered approach: 3-5 quick questions for general consumers, optional detailed form for foot health segment |

## Feature Dependencies

```
[User Account System]
    |-- requires --> [Auth / Login / Registration]
    |-- requires --> [Foot Profile Storage]
                        |-- requires --> [Foot Scanning Module]
                                            |-- requires --> [Camera Access / Image Processing]

[Shoe + Insole Bundle Order]
    |-- requires --> [Shoe Catalog]
    |-- requires --> [Insole Design Algorithm]
                        |-- requires --> [Foot Scanning Module]
    |-- requires --> [Shopping Cart / Checkout]
                        |-- requires --> [Payment Processing]

[Order Status Tracking]
    |-- requires --> [Order Management System]
    |-- requires --> [Factory Integration API]

[Size Recommendation Engine]
    |-- requires --> [Foot Scanning Module]
    |-- requires --> [Shoe Catalog] (with last/sizing data per product)

[Insole Customization Preview]
    |-- requires --> [Insole Design Algorithm]
    |-- requires --> [3D Rendering / Visualization]

[Customer Segment Flows]
    |-- enhances --> [Foot Scanning Module] (different question sets per segment)
    |-- enhances --> [Shoe Catalog] (filtered recommendations per segment)

[Reorder Flow]
    |-- requires --> [User Account System]
    |-- requires --> [Foot Profile Storage]
    |-- requires --> [Order History]
```

### Dependency Notes

- **Insole Design Algorithm requires Foot Scanning:** No custom insole without measurement data. Scanning module is the foundational dependency.
- **Bundle Order requires both Shoe Catalog and Insole Design:** The core product is the combination; both systems must exist before orders are possible.
- **Order Tracking requires Factory Integration:** Without factory API, order status is just "processing" with no granularity. Can launch with manual status updates but should automate quickly.
- **Size Recommendation requires scan data AND shoe sizing data:** Need to map foot dimensions to specific shoe models. Depends on having detailed product data from shoe suppliers.
- **Customer Segment Flows enhance (don't block) core features:** Can launch with a single generic flow and add segment-specific paths iteratively.

## MVP Definition

### Launch With (v1)

Minimum viable product to validate that people will buy shoes with custom insoles via smartphone scanning.

- [ ] Smartphone foot scanning (photo-based, guided flow with quality checks) -- this is the core innovation
- [ ] Basic insole design algorithm (map scan to 3-5 insole parameter templates based on arch type + foot size) -- doesn't need to be fully AI-driven at v1
- [ ] Shoe catalog with 10-20 SKUs across 3 categories (casual, athletic, dress) -- curated, not comprehensive
- [ ] Bundle product page (shoe + insole preview) with clear value proposition
- [ ] Shopping cart + checkout with payment processing
- [ ] User account with foot profile storage
- [ ] Order management with basic status tracking (manual updates acceptable)
- [ ] Email notifications (confirmation, shipping, delivery)
- [ ] Mobile-responsive design (scanning flow must be mobile-native)
- [ ] Return/remake policy page with 90-day satisfaction guarantee

### Add After Validation (v1.x)

Features to add once core purchase flow is proven and first orders are fulfilled.

- [ ] AI-enhanced insole design algorithm (more parameters, better personalization) -- trigger: customer feedback on fit quality
- [ ] Customer segment-specific flows (foot health / comfort / athlete) -- trigger: understanding which segment converts best
- [ ] Size recommendation engine -- trigger: return rate data showing size-related returns
- [ ] Insole customization preview (3D visualization) -- trigger: conversion rate optimization
- [ ] Factory API integration for automated order dispatch and real-time status -- trigger: order volume exceeds manual processing capacity
- [ ] Scan quality scoring with automated re-scan prompts -- trigger: support tickets about poor fit due to bad scans
- [ ] Reorder flow for returning customers -- trigger: first customers reaching reorder timeframe

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Expanded shoe catalog (50+ SKUs, more categories) -- why defer: inventory/supplier management complexity
- [ ] FSA/HSA eligibility documentation -- why defer: market-specific, validate demand first
- [ ] Foot health education blog/content hub -- why defer: SEO is a long game, focus on product first
- [ ] Manufacturing partner dashboard (factory-facing portal) -- why defer: depends on scale and number of factory partners
- [ ] Multi-language support -- why defer: validate in primary market first
- [ ] Foot condition tracking over time (compare scans) -- why defer: requires enough reorder data

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Guided foot scanning flow | HIGH | HIGH | P1 |
| Insole design algorithm (basic) | HIGH | HIGH | P1 |
| Shoe catalog + product pages | HIGH | MEDIUM | P1 |
| Bundle ordering (shoe + insole) | HIGH | MEDIUM | P1 |
| Cart + checkout + payment | HIGH | MEDIUM | P1 |
| User account + foot profile | HIGH | LOW | P1 |
| Order status tracking (basic) | MEDIUM | LOW | P1 |
| Email notifications | MEDIUM | LOW | P1 |
| Mobile-first responsive UI | HIGH | MEDIUM | P1 |
| Return/remake policy | HIGH | LOW | P1 |
| Customer segment flows | MEDIUM | MEDIUM | P2 |
| AI-enhanced insole design | HIGH | HIGH | P2 |
| Size recommendation engine | HIGH | MEDIUM | P2 |
| Insole customization preview | MEDIUM | HIGH | P2 |
| Factory API integration | MEDIUM | HIGH | P2 |
| Scan quality scoring | MEDIUM | HIGH | P2 |
| Reorder flow | MEDIUM | LOW | P2 |
| Foot health content/blog | LOW | LOW | P3 |
| FSA/HSA documentation | LOW | LOW | P3 |
| Manufacturing dashboard | LOW | HIGH | P3 |
| Foot condition tracking | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Upstep | Wiivv/FitMyFoot | Bilt Labs | ScanSoles | FitSole (Our Approach) |
|---------|--------|-----------------|-----------|-----------|----------------------|
| Foot measurement method | Foam impression kit (mailed) | Smartphone app scan | Foam impression kit (mailed) | Smartphone app + medical questionnaire | Smartphone scan with guided flow + quality scoring |
| Turnaround time | 10-16 business days | Under 7 days | 2-3 weeks | Varies | Target: 10-14 days (factory dependent) |
| Product sold | Insole only | Insole only | Insole only | Insole only | Shoe + insole bundle (differentiator) |
| Guarantee | 180-day money-back | 30-day refund | 6-month trial | N/A | 90-day satisfaction + free remake |
| Podiatrist involvement | Yes, reviews each order | No, algorithmic | Yes, DPM approved | AI + medical questionnaire | Algorithmic with optional specialist review |
| Manufacturing | Traditional manufacturing | 3D printing | CNC precision milling | Varies by partner | 3D printing or CNC via factory partner |
| Customer segmentation | Activity-based quiz | Generic sizing | Condition-focused | Medical + general | Three distinct flows: health / comfort / athlete |
| Pricing | $229-$279 per pair | $99-$119 per pair | $229-$259 per pair | Varies | Competitive with Wiivv for insole; premium bundle with shoe |

### Key Competitive Observations

1. **Nobody sells shoe + insole bundles.** Every competitor sells insoles only, expecting users to put them in existing shoes. FitSole's bundle approach is genuinely differentiated.
2. **Impression kits are still common** (Upstep, Bilt Labs). Smartphone scanning is newer and growing but still being validated for accuracy. Being smartphone-first is forward-looking but carries accuracy risk.
3. **Pricing ranges widely** from $99 (Wiivv) to $280+ (Upstep with podiatrist). Bundle pricing with shoes will be a different conversation entirely.
4. **Satisfaction guarantees are expected** — 30 days minimum, 90 days is competitive, 180 days is aggressive but builds trust.

## Sources

- [Upstep Custom Orthotics](https://www.upstep.com/) — competitor features and pricing (MEDIUM confidence)
- [Wiivv / FitMyFoot Custom Insoles](https://wiivv.com/) — smartphone scanning competitor (MEDIUM confidence)
- [Bilt Labs Custom Orthotics](https://biltlabs.com/) — medical-grade competitor (MEDIUM confidence)
- [ScanSoles AI Orthotics](https://www.scansoles.com/) — AI + smartphone scanning competitor (MEDIUM confidence)
- [Sole Dynamix Home Scanning](https://soledynamix.com/en/content/scanning) — scanning UX reference (MEDIUM confidence)
- [PMC: Mobile Apps for Foot Measurement Scoping Review](https://pmc.ncbi.nlm.nih.gov/articles/PMC7974751/) — accuracy limitations of smartphone foot scanning (HIGH confidence, academic source)
- [Astrivis 3D Scanning Technology](https://astrivis.com/blog/astrivis-and-3d-fit-revolutionize-custom-insoles-with-smartphone-3d-scanning-technology) — scanning technology overview (MEDIUM confidence)
- [3D Systems / Wiivv Mass Customization](https://www.3dsystems.com/customer-stories/mass-customization-measured-foot) — 3D printing manufacturing (MEDIUM confidence)
- [Fibbl: 3D Commerce for Footwear](https://fibbl.com/how-to-choose-3d-commerce-providerfor-footwear/) — AR/3D visualization landscape (MEDIUM confidence)
- [BrandXR: AR in Retail Research Report 2025](https://www.brandxr.io/2025-augmented-reality-in-retail-e-commerce-research-report) — AR try-on statistics (MEDIUM confidence)

---
*Feature research for: Custom insole + shoe e-commerce platform*
*Researched: 2026-04-09*
