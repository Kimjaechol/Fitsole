import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems, insoleDesigns } from "@/lib/db/schema";
import type {
  OrderDetail,
  OrderInsoleDesignSummary,
  OrderItemDetail,
  OrderStatus,
  DesignSource,
} from "@/lib/types/order";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/orders/[id]
 *
 * Returns a single OrderDetail for the authenticated user.
 *
 * Threat model:
 * - T-05-02 (Spoofing): auth() required, 401 if no session.
 * - T-05-01 (IDOR): WHERE matches both id AND userId. Returns 404 if order
 *   does not exist OR belongs to a different user (same response avoids
 *   user enumeration via differential status codes).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "유효하지 않은 주문입니다." },
        { status: 400 }
      );
    }

    // Order row (IDOR: enforce userId in WHERE per T-05-01)
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, session.user.id)))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { error: "주문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const itemDetails: OrderItemDetail[] = items.map((it) => ({
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

    // Attached insole designs (if any items reference one)
    const designIds = itemDetails
      .map((it) => it.designId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    let designSummaries: OrderInsoleDesignSummary[] = [];

    if (designIds.length > 0) {
      const designs = await db
        .select({
          id: insoleDesigns.id,
          lineType: insoleDesigns.lineType,
          designParams: insoleDesigns.designParams,
        })
        .from(insoleDesigns)
        .where(inArray(insoleDesigns.id, designIds));

      designSummaries = designs.map((d) => {
        const params = (d.designParams as Record<string, unknown> | null) ?? null;
        const archHeight = extractNumber(params, [
          "archHeight",
          "arch_height",
          "arch",
        ]);
        const heelCupDepth = extractNumber(params, [
          "heelCupDepth",
          "heel_cup_depth",
          "heelCup",
        ]);
        return {
          designId: d.id,
          lineType: d.lineType,
          lineTypeLabel:
            d.lineType === "professional"
              ? "SALTED 정밀 측정"
              : "카메라 측정",
          archHeight,
          heelCupDepth,
          designParams: params,
        };
      });
    }

    const detail: OrderDetail = {
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
      items: itemDetails,
      insoleDesigns: designSummaries,
    };

    return NextResponse.json({ order: detail });
  } catch (error) {
    console.error("[GET /api/orders/[id]] failed:", error);
    return NextResponse.json(
      { error: "주문 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}

function extractNumber(
  params: Record<string, unknown> | null,
  keys: string[]
): number | null {
  if (!params) return null;
  for (const key of keys) {
    const v = params[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}
