/**
 * GET /api/admin/orders/[id]
 *
 * Admin-only endpoint that returns the full enriched order detail used by
 * /admin/dashboard/orders/[id]:
 *   - Order + customer info
 *   - Order items (with insole design IDs)
 *   - Insole designs (params + hardness map + STL URL + lineType)
 *   - Customer foot scans (with measurements + pressure distribution)
 *
 * Threat model:
 * - T-05-10 (Elevation of Privilege): requireAdmin() re-checks role in DB
 *   on every request.
 *
 * Notes:
 * - Mirrors the user-facing GET /api/orders/[id] but without the IDOR
 *   userId filter (admin can see any order).
 * - Designs are pulled per-orderItem (each item may carry its own designId).
 * - Foot scans are pulled per *customer* (not per order) so the admin can
 *   see the underlying scan data the design was generated from.
 */

import { NextResponse } from "next/server";
import { eq, inArray, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orders,
  orderItems,
  insoleDesigns,
  users,
  footScans,
  footMeasurements,
  pressureDistribution,
  gaitAnalysis,
} from "@/lib/db/schema";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import type { OrderStatus, DesignSource } from "@/lib/types/order";

export interface AdminScanData {
  scanId: string;
  footSide: "left" | "right";
  modelUrl: string | null;
  qualityLabel: string | null;
  measurements: {
    footLength: number;
    ballWidth: number;
    archHeight: number;
    instepHeight: number;
    heelWidth: number;
    toeLength: number;
  } | null;
  pressure: {
    heatmapData: number[][];
    highPressureZones: Array<{
      x: number;
      y: number;
      intensity: number;
      label: string;
    }>;
  } | null;
  gait: {
    gaitPattern: string;
    ankleAlignment: string;
    archFlexibilityIndex: number;
  } | null;
}

export interface AdminDesignData {
  designId: string;
  lineType: "general" | "professional";
  lineTypeLabel: string;
  footSide: "left" | "right";
  designParams: Record<string, unknown>;
  hardnessMap: Record<string, unknown>;
  stlUrl: string | null;
  status: string;
}

export interface AdminOrderItemDetail {
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

export interface AdminCustomerInfo {
  id: string;
  name: string | null;
  email: string;
}

export interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
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

  // Relations
  customer: AdminCustomerInfo;
  items: AdminOrderItemDetail[];
  designs: AdminDesignData[];
  scans: AdminScanData[];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Admin gate (T-05-10)
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "주문 ID가 필요합니다." },
      { status: 400 }
    );
  }

  // 2. Order
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) {
    return NextResponse.json(
      { error: "주문을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 3. Customer
  const [customerRow] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, order.userId))
    .limit(1);

  if (!customerRow) {
    return NextResponse.json(
      { error: "주문 고객 정보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 4. Order items
  const itemRows = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  const items: AdminOrderItemDetail[] = itemRows.map((it) => ({
    id: it.id,
    productId: it.productId,
    productName: it.productName,
    size: Number(it.size),
    price: Number(it.price),
    bundleInsolePrice:
      it.bundleInsolePrice === null ? null : Number(it.bundleInsolePrice),
    includesInsole: it.includesInsole === "true",
    designSource: (it.designSource ?? null) as DesignSource,
    quantity: Number(it.quantity),
    designId: it.designId ?? null,
  }));

  // 5. Insole designs (full payload, not just summary)
  const designIds = items
    .map((it) => it.designId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  let designs: AdminDesignData[] = [];
  if (designIds.length > 0) {
    const designRows = await db
      .select()
      .from(insoleDesigns)
      .where(inArray(insoleDesigns.id, designIds));

    designs = designRows.map((d) => ({
      designId: d.id,
      lineType: (d.lineType === "professional" ? "professional" : "general") as
        | "general"
        | "professional",
      lineTypeLabel:
        d.lineType === "professional" ? "SALTED 정밀 측정" : "카메라 측정",
      footSide: d.footSide as "left" | "right",
      designParams: (d.designParams as Record<string, unknown>) ?? {},
      hardnessMap: (d.hardnessMap as Record<string, unknown>) ?? {},
      stlUrl: d.stlUrl ?? null,
      status: d.status,
    }));
  }

  // 6. Customer foot scans (most recent first, both feet if available)
  const scanRows = await db
    .select()
    .from(footScans)
    .where(eq(footScans.userId, order.userId))
    .orderBy(desc(footScans.createdAt))
    .limit(8);

  let scans: AdminScanData[] = [];

  if (scanRows.length > 0) {
    const scanIds = scanRows.map((s) => s.id);

    const measurementRows = await db
      .select()
      .from(footMeasurements)
      .where(inArray(footMeasurements.scanId, scanIds));

    const pressureRows = await db
      .select()
      .from(pressureDistribution)
      .where(inArray(pressureDistribution.scanId, scanIds));

    const gaitRows = await db
      .select()
      .from(gaitAnalysis)
      .where(inArray(gaitAnalysis.scanId, scanIds));

    const measurementByScan = new Map(
      measurementRows.map((m) => [m.scanId, m])
    );
    const pressureByScan = new Map(pressureRows.map((p) => [p.scanId, p]));
    const gaitByScan = new Map(gaitRows.map((g) => [g.scanId, g]));

    // Keep one scan per foot side, the most recent (rows already DESC by createdAt)
    const seenSides = new Set<string>();
    const dedupedScans = scanRows.filter((s) => {
      if (seenSides.has(s.footSide)) return false;
      seenSides.add(s.footSide);
      return true;
    });

    scans = dedupedScans.map((s) => {
      const m = measurementByScan.get(s.id);
      const p = pressureByScan.get(s.id);
      const g = gaitByScan.get(s.id);

      return {
        scanId: s.id,
        footSide: s.footSide as "left" | "right",
        modelUrl: s.modelUrl ?? null,
        qualityLabel: s.qualityLabel ?? null,
        measurements: m
          ? {
              footLength: Number(m.footLength),
              ballWidth: Number(m.ballWidth),
              archHeight: Number(m.archHeight),
              instepHeight: Number(m.instepHeight),
              heelWidth: Number(m.heelWidth),
              toeLength: Number(m.toeLength),
            }
          : null,
        pressure: p
          ? {
              heatmapData: (p.heatmapData as number[][]) ?? [],
              highPressureZones:
                (p.highPressureZones as Array<{
                  x: number;
                  y: number;
                  intensity: number;
                  label: string;
                }>) ?? [],
            }
          : null,
        gait: g
          ? {
              gaitPattern: g.gaitPattern,
              ankleAlignment: g.ankleAlignment,
              archFlexibilityIndex: Number(g.archFlexibilityIndex),
            }
          : null,
      };
    });
  }

  const detail: AdminOrderDetail = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status as OrderStatus,
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    shippingName: order.shippingName,
    shippingPhone: order.shippingPhone,
    shippingZipcode: order.shippingZipcode,
    shippingAddress: order.shippingAddress,
    shippingDetailAddress: order.shippingDetailAddress ?? null,
    trackingNumber: order.trackingNumber ?? null,
    trackingCarrier: order.trackingCarrier ?? null,
    paymentKey: order.paymentKey ?? null,
    paymentMethod: order.paymentMethod ?? null,
    customer: {
      id: customerRow.id,
      name: customerRow.name,
      email: customerRow.email,
    },
    items,
    designs,
    scans,
  };

  return NextResponse.json({ order: detail });
}
