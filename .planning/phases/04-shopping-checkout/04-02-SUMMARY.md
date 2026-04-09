---
phase: 04-shopping-checkout
plan: 02
subsystem: payments
tags: [toss-payments, checkout, zod, react-hook-form, daum-postcode, drizzle]

requires:
  - phase: 04-shopping-checkout/01
    provides: Cart store with CartItem type and useCartStore API
  - phase: 03-insole-design-product-catalog
    provides: Payload CMS product collection with price and bundleInsolePrice fields
provides:
  - Multi-step checkout page with shipping and payment steps
  - Korean shipping address form with Daum Postcode API integration
  - Toss Payments SDK widget with 5 Korean payment methods
  - Server-side order preparation API with price validation
  - Checkout validation schemas (Zod)
affects: [04-shopping-checkout/03, order-management, payment-confirmation]

tech-stack:
  added: ["@tosspayments/tosspayments-sdk"]
  patterns: [server-side-price-validation, daum-postcode-dynamic-loading, multi-step-checkout-flow]

key-files:
  created:
    - src/lib/checkout/types.ts
    - src/lib/validators/checkout.ts
    - src/components/checkout/CheckoutStepper.tsx
    - src/components/checkout/ShippingForm.tsx
    - src/components/checkout/OrderSummaryReview.tsx
    - src/components/checkout/PaymentWidget.tsx
    - src/app/(main)/checkout/page.tsx
    - src/app/(main)/checkout/layout.tsx
    - src/app/api/checkout/prepare/route.ts
  modified:
    - .env.example
    - package.json

key-decisions:
  - "Toss Payments widgets API for SDK integration with customerKey-based initialization"
  - "Server-side price validation via Payload Local API to prevent price tampering (T-04-03)"
  - "Daum Postcode script loaded dynamically on demand rather than in global layout"

patterns-established:
  - "Checkout multi-step: Zustand-free local state for step management in checkout page"
  - "Korean address: Daum Postcode API with dynamic script loading and readonly zipcode/address fields"
  - "Price trust boundary: Server always re-fetches product prices from Payload DB, never trusts client-sent values"

requirements-completed: [SHOP-02, SHOP-03]

duration: 4min
completed: 2026-04-09
---

# Phase 04 Plan 02: Checkout Flow Summary

**Multi-step checkout with Korean shipping form (Daum postal code), order summary review, and Toss Payments SDK widget supporting 5 payment methods**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-09T23:29:10Z
- **Completed:** 2026-04-09T23:33:30Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Checkout types (ShippingInfo, CheckoutStep) and Zod validation schemas for Korean phone/address
- 3-step checkout stepper with visual progress, shipping form with Daum Postcode API popup, and order summary with shipping fee logic
- Toss Payments SDK widget with 5 Korean payment methods (card, transfer, TossPay, KakaoPay, NaverPay)
- Server-side order preparation API with price validation via Payload Local API (T-04-03 mitigation)

## Task Commits

Each task was committed atomically:

1. **Task 1: Checkout types, validation, stepper, shipping form, and order summary** - `4e0c1fd` (feat)
2. **Task 2: Toss Payments widget, checkout page, and order preparation API** - `eafc3aa` (feat)

## Files Created/Modified
- `src/lib/checkout/types.ts` - ShippingInfo and CheckoutStep type definitions
- `src/lib/validators/checkout.ts` - Zod shippingSchema with Korean phone regex validation
- `src/components/checkout/CheckoutStepper.tsx` - 3-step horizontal stepper (배송 정보/결제/주문 확인)
- `src/components/checkout/ShippingForm.tsx` - Shipping address form with Daum Postcode API integration
- `src/components/checkout/OrderSummaryReview.tsx` - Order items, shipping fee, total, and address summary
- `src/components/checkout/PaymentWidget.tsx` - Toss Payments SDK widget with payment method selector
- `src/app/(main)/checkout/page.tsx` - Multi-step checkout page (shipping -> payment flow)
- `src/app/(main)/checkout/layout.tsx` - Checkout layout with max-w-4xl centering
- `src/app/api/checkout/prepare/route.ts` - Order creation API with server-validated prices
- `.env.example` - Added NEXT_PUBLIC_TOSS_CLIENT_KEY and TOSS_SECRET_KEY placeholders
- `package.json` - Added @tosspayments/tosspayments-sdk dependency

## Decisions Made
- Used Toss Payments widgets API (tossPayments.widgets()) for SDK integration with customerKey-based initialization
- Server re-fetches product prices from Payload CMS DB for each cart item during order preparation, never trusting client-sent prices (T-04-03 threat mitigation)
- Daum Postcode script loaded dynamically on button click rather than included in global layout, reducing initial page load
- Checkout step state managed via local React useState (not Zustand) since it's ephemeral per-session state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Zod detailAddress type mismatch with react-hook-form resolver**
- **Found during:** Task 1 (ShippingForm implementation)
- **Issue:** Using `.optional().default("")` on the detailAddress field created a Zod input/output type mismatch that conflicted with react-hook-form's zodResolver type inference
- **Fix:** Changed detailAddress to plain `z.string()` with empty string default in form defaultValues instead
- **Files modified:** src/lib/validators/checkout.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 4e0c1fd (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix necessary for type correctness. No scope creep.

## Issues Encountered
None

## User Setup Required

Toss Payments requires API keys for payment processing:
- Set `NEXT_PUBLIC_TOSS_CLIENT_KEY` in `.env.local` (client key from Toss Payments dashboard)
- Set `TOSS_SECRET_KEY` in `.env.local` (secret key from Toss Payments dashboard)
- Test keys available from Toss Payments developer console for sandbox testing

## Next Phase Readiness
- Checkout flow ready for Plan 03 (payment success/fail callback handling and Toss webhook verification)
- Order created in DB with "pending" status, ready for payment confirmation flow
- Success/fail URLs configured to /checkout/success and /checkout/fail (to be implemented in Plan 03)

---
*Phase: 04-shopping-checkout*
*Completed: 2026-04-09*
