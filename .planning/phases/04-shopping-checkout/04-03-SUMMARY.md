---
phase: 04-shopping-checkout
plan: 03
subsystem: checkout-confirmation
tags: [payment, webhook, email, toss-payments, order-confirmation]
dependency_graph:
  requires: [04-02]
  provides: [payment-confirmation, order-email, webhook-handler]
  affects: [checkout-flow, order-lifecycle]
tech_stack:
  added: [resend-email-template]
  patterns: [toss-confirm-api, webhook-verification, fire-and-forget-email]
key_files:
  created:
    - src/app/api/checkout/confirm/route.ts
    - src/app/api/checkout/webhook/route.ts
    - src/app/(main)/checkout/success/page.tsx
    - src/app/(main)/checkout/fail/page.tsx
    - src/lib/email/order-confirmation.ts
  modified: []
decisions:
  - "Fire-and-forget email after confirm response to avoid blocking user"
  - "Webhook always returns 200 to prevent Toss retry storms"
  - "Amount verification in confirm endpoint before calling Toss API"
metrics:
  duration: 4min
  completed: 2026-04-10T00:16:00Z
  tasks: 2
  files: 5
---

# Phase 04 Plan 03: Payment Confirmation & Order Email Summary

Server-side Toss Payments verification endpoint, webhook backup handler, success/fail pages, and Korean order confirmation email via Resend.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 202eadb | Payment confirm endpoint, webhook handler, success/fail pages |
| 2 | 6847538 | Korean order confirmation email via Resend |

## Task Details

### Task 1: Payment confirmation endpoint, webhook handler, and success/fail pages

- `/api/checkout/confirm` POST endpoint verifies payment server-side via Toss Payments confirm API (T-04-05 mitigation)
- Validates amount matches server-side order total before calling Toss
- On success: updates order status to "paid" with paymentKey, paymentMethod, paidAt
- On failure: updates order status to "cancelled"
- `/api/checkout/webhook` POST endpoint handles backup payment events (D-11)
- Webhook verifies authenticity by querying Toss API directly (T-04-07 mitigation)
- Always returns 200 OK to prevent retry storms
- Success page reads paymentKey/orderId/amount from Toss redirect URL params
- Calls confirm endpoint, displays order number, clears cart on success
- Fail page shows Korean error messages with Toss error code mapping and retry options

### Task 2: Order confirmation email via Resend

- `sendOrderConfirmationEmail()` function with full Korean HTML template
- Payment method labels mapped to Korean (카드, 카카오페이, 네이버페이, 토스페이, 계좌이체)
- Items table with insole badge ("맞춤 인솔 포함") when includesInsole is true
- KRW price formatting with `toLocaleString('ko-KR')` + "원" suffix
- Resend API with `RESEND_API_KEY` check and console.log dev fallback
- Wired into confirm endpoint as fire-and-forget after successful payment (T-04-08)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
