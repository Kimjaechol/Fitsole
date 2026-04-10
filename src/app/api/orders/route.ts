import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import type { OrderStatus, OrderSummary } from "@/lib/types/order";
import { eq, desc, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/orders
 *
 * Returns the authenticated user's order list as OrderSummary[].
 *
 * Threat model:
 * - T-05-02 (Spoofing): auth() required, 401 if no session.
 * - T-05-01 (IDOR): results filtered by session.user.id only.
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const userOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.userId, session.user.id))
      .orderBy(desc(orders.createdAt));

    if (userOrders.length === 0) {
      return NextResponse.json({ orders: [] as OrderSummary[] });
    }

    // Fetch items for all returned orders in a single query.
    const orderIds = userOrders.map((o) => o.id);
    const items = await db
      .select({
        orderId: orderItems.orderId,
        productName: orderItems.productName,
        quantity: orderItems.quantity,
        createdAt: orderItems.createdAt,
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    // Group items per order for itemCount + firstItemName.
    const itemsByOrder = new Map<
      string,
      { count: number; firstName: string; firstCreated: Date }
    >();

    for (const it of items) {
      const existing = itemsByOrder.get(it.orderId);
      const qty = Number(it.quantity) || 1;
      if (!existing) {
        itemsByOrder.set(it.orderId, {
          count: qty,
          firstName: it.productName,
          firstCreated: it.createdAt,
        });
      } else {
        existing.count += qty;
        // Keep earliest-created item as "first" for stable display.
        if (it.createdAt < existing.firstCreated) {
          existing.firstName = it.productName;
          existing.firstCreated = it.createdAt;
        }
      }
    }

    const summaries: OrderSummary[] = userOrders.map((o) => {
      const agg = itemsByOrder.get(o.id);
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status as OrderStatus,
        totalAmount: Number(o.totalAmount),
        createdAt: o.createdAt.toISOString(),
        itemCount: agg?.count ?? 0,
        firstItemName: agg?.firstName ?? "주문 상품",
      };
    });

    return NextResponse.json({ orders: summaries });
  } catch (error) {
    console.error("[GET /api/orders] failed:", error);
    return NextResponse.json(
      { error: "주문 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
