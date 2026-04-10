/**
 * Shared Order type contracts used by both user-facing order pages and admin dashboard.
 *
 * See D-01, D-03 in .planning/phases/05-admin-dashboard-order-management/05-CONTEXT.md
 */

// Matches orderStatusEnum values in src/lib/db/schema.ts
export type OrderStatus =
  | "pending"
  | "paid"
  | "designing"
  | "manufacturing"
  | "shipping"
  | "delivered"
  | "cancelled";

// Korean labels per D-01 stage definitions
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "주문 대기",
  paid: "주문확인",
  designing: "인솔설계",
  manufacturing: "제작중",
  shipping: "배송중",
  delivered: "완료",
  cancelled: "취소됨",
};

// Progress bar steps (excludes pending and cancelled per D-01 visible stages)
export const ORDER_STATUS_STEPS: readonly OrderStatus[] = [
  "paid",
  "designing",
  "manufacturing",
  "shipping",
  "delivered",
] as const;

// Tailwind class hints for status badge coloring
export const ORDER_STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  paid: "bg-blue-100 text-blue-700 border-blue-200",
  designing: "bg-purple-100 text-purple-700 border-purple-200",
  manufacturing: "bg-orange-100 text-orange-700 border-orange-200",
  shipping: "bg-sky-100 text-sky-700 border-sky-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

/**
 * Row shape returned by GET /api/orders for the mypage order list.
 */
export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string; // ISO date
  itemCount: number;
  firstItemName: string;
}

export type DesignSource = "general" | "professional" | null;

/**
 * Single line item on an order detail page.
 */
export interface OrderItemDetail {
  id: string;
  productId: string;
  productName: string;
  size: number;
  price: number;
  bundleInsolePrice: number | null;
  includesInsole: boolean;
  designSource: DesignSource;
  quantity: number;
  designId: string | null;
}

/**
 * Summary of the attached insole design (if any item has designId).
 * Per D-03: shows the key params and which measurement line produced it.
 */
export interface OrderInsoleDesignSummary {
  designId: string;
  lineType: string; // "general" | "professional" (aka Line 1 camera / Line 2 SALTED)
  lineTypeLabel: string; // Korean label: "카메라 측정" | "SALTED 정밀 측정"
  archHeight: number | null;
  heelCupDepth: number | null;
  // Raw params passed through for advanced callers / admin view
  designParams: Record<string, unknown> | null;
}

/**
 * Full payload returned by GET /api/orders/[id].
 */
export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  paidAt: string | null;

  // Shipping
  shippingName: string;
  shippingPhone: string;
  shippingZipcode: string;
  shippingAddress: string;
  shippingDetailAddress: string | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;

  // Payment
  paymentKey: string | null;
  paymentMethod: string | null;

  // Items + insole summaries
  items: OrderItemDetail[];
  insoleDesigns: OrderInsoleDesignSummary[];
}

// Helper to convert stored "false"/"true" text back to boolean
export function parseIncludesInsole(raw: string | null | undefined): boolean {
  return raw === "true";
}
