# Phase 4: Shopping & Checkout - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Shopping cart, checkout flow, and Toss Payments integration. Users add shoe+insole bundles to cart, enter shipping info, pay via Korean payment methods (card, KakaoPay, NaverPay, TossPay), and receive order confirmation email.

</domain>

<decisions>
## Implementation Decisions

### Shopping Cart
- **D-01:** Zustand-based client-side cart with localStorage persistence
- **D-02:** Cart items include: product (shoe), insole design reference (designId from Phase 3), quantity, bundle price
- **D-03:** Cart page shows line items with shoe image, insole zone preview thumbnail, bundle price, quantity controls, remove button
- **D-04:** Cart supports both Line 1 (camera-based) and Line 2 (SALTED) insole designs — differentiated by designSource field

### Checkout Flow
- **D-05:** Multi-step checkout: 배송 정보 → 결제 → 주문 확인
- **D-06:** Shipping address form with Korean address fields (우편번호 검색 via Daum 우편번호 API)
- **D-07:** Order summary before payment showing all items + shipping + total

### Toss Payments
- **D-08:** Toss Payments SDK integration (docs.tosspayments.com) — NOT Stripe
- **D-09:** Payment methods: 카드, 카카오페이, 네이버페이, 토스페이, 계좌이체
- **D-10:** Payment flow: frontend SDK widget → Toss server → webhook callback → order confirmed
- **D-11:** Webhook handler verifies payment and updates order status in DB

### Order Confirmation
- **D-12:** Order confirmation page with order number, items, shipping address, payment summary
- **D-13:** Confirmation email sent via Resend with Korean template (주문 확인 이메일)

### Claude's Discretion
- Toss Payments SDK exact version and initialization pattern
- Daum 우편번호 API integration details
- Cart animation/transitions
- Email template HTML structure

</decisions>

<canonical_refs>
## Canonical References

- `.planning/PROJECT.md` — Core value, constraints
- `.planning/REQUIREMENTS.md` — SHOP-01~04
- `.planning/research/STACK.md` — Toss Payments recommendation
- No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/db/schema.ts` — Add orders/orderItems tables
- `src/lib/insole/types.ts` — InsoleDesign type for cart items
- `src/payload/collections/Products.ts` — Product data for cart display
- Resend email setup from Phase 1 (password reset) — reuse for order confirmation

### Established Patterns
- Zustand stores (scan store, SALTED store) — follow same pattern for cart
- shadcn/ui components, Pretendard font, Korean UI
- API routes proxying to backend services

### Integration Points
- Cart references Product (from Payload CMS) + InsoleDesign (from Phase 3)
- Orders table links to insoleDesigns for manufacturing
- Phase 5 (Admin Dashboard) reads orders for management

</code_context>

<specifics>
## Specific Ideas

- Toss Payments is the correct choice for Korean market — supports all major Korean payment methods
- 다음 우편번호 API for Korean postal code lookup is free and widely used
- Bundle pricing already exists on product detail page — cart just carries it through

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-shopping-checkout*
*Context gathered: 2026-04-09*
