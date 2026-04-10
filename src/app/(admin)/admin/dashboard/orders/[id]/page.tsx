/**
 * Admin Order Detail Page (D-06).
 *
 * Server component that loads the full order detail (customer, items,
 * insole designs, foot scans) and renders OrderDetailView + StatusControls.
 *
 * Auth: enforced by the parent (admin) layout via isAdmin() — no extra check
 * needed here, but we still rely on the layout running first.
 */

import { notFound } from "next/navigation";
import { eq, inArray, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orders,
  orderItems,
  users,
  insoleDesigns,
  footScans,
  footMeasurements,
  pressureDistribution,
  gaitAnalysis,
} from "@/lib/db/schema";
import type { OrderStatus, DesignSource } from "@/lib/types/order";
import type {
  AdminOrderDetail,
  AdminScanData,
  AdminDesignData,
  AdminOrderItemDetail,
} from "@/app/api/admin/orders/[id]/route";
import { OrderDetailView } from "@/components/admin/order-detail-view";
import { StatusControls } from "@/components/admin/status-controls";

export const dynamic = "force-dynamic";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Same logic as GET /api/admin/orders/[id] but invoked via Drizzle directly
 * for server components. Mirrors the convention used by the orders list page
 * (Phase 05-03 decision: admin server components query Drizzle directly).
 */
async function loadAdminOrderDetail(
  orderId: string
): Promise<AdminOrderDetail | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return null;

  const [customerRow] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, order.userId))
    .limit(1);

  if (!customerRow) return null;

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

  // Customer foot scans (most recent first)
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

  return {
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
}

export default async function AdminOrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { id } = await params;
  const order = await loadAdminOrderDetail(id);

  if (!order) {
    notFound();
  }

  // hasDesignSpecs lets StatusControls know whether the dispatch button
  // is enabled (D-09: dispatch needs design specs to send to factory).
  const hasDesignSpecs = order.designs.length > 0;

  return (
    <div className="space-y-6">
      <OrderDetailView order={order} />

      {/* Status controls live below the tabs so they're always reachable
          regardless of which tab the admin is viewing. */}
      <StatusControls
        orderId={order.id}
        currentStatus={order.status}
        hasDesignSpecs={hasDesignSpecs}
      />
    </div>
  );
}
