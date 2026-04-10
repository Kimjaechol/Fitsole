/**
 * GET /api/admin/orders
 *
 * Admin-only endpoint that returns all orders with customer info and the
 * design line type (if any), with optional filtering by status/date/search/lineType.
 *
 * Threat model:
 * - T-05-07 (Information Disclosure): requireAdmin() re-checks role in DB.
 *
 * Query params:
 *   - status   : OrderStatus (comma-separated allowed, e.g. "paid,designing")
 *   - dateFrom : ISO date (inclusive lower bound on createdAt)
 *   - dateTo   : ISO date (inclusive upper bound on createdAt — end of day)
 *   - search   : case-insensitive substring match on customer name or email
 *   - lineType : "general" | "professional" — filters by any order item's insole design
 */

import { NextResponse } from "next/server";
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orders,
  orderItems,
  users,
  insoleDesigns,
} from "@/lib/db/schema";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import type { OrderStatus, OrderSummary } from "@/lib/types/order";

export interface AdminOrderSummary extends OrderSummary {
  customerName: string | null;
  customerEmail: string | null;
  lineType: "general" | "professional" | null;
}

const ORDER_STATUS_VALUES: readonly OrderStatus[] = [
  "pending",
  "paid",
  "designing",
  "manufacturing",
  "shipping",
  "delivered",
  "cancelled",
] as const;

function parseStatusParam(raw: string | null): OrderStatus[] | null {
  if (!raw) return null;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as OrderStatus[];
  const filtered = parts.filter((p) =>
    (ORDER_STATUS_VALUES as readonly string[]).includes(p)
  );
  return filtered.length > 0 ? filtered : null;
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: Request) {
  // 1. Admin gate (T-05-07)
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    const statuses = parseStatusParam(params.get("status"));
    const dateFrom = parseDate(params.get("dateFrom"));
    const dateToRaw = parseDate(params.get("dateTo"));
    const search = params.get("search")?.trim() || null;
    const lineTypeRaw = params.get("lineType");
    const lineType =
      lineTypeRaw === "general" || lineTypeRaw === "professional"
        ? lineTypeRaw
        : null;

    // Make dateTo inclusive of the whole day
    let dateTo: Date | null = null;
    if (dateToRaw) {
      dateTo = new Date(dateToRaw);
      dateTo.setHours(23, 59, 59, 999);
    }

    const conditions: SQL[] = [];

    if (statuses && statuses.length > 0) {
      conditions.push(inArray(orders.status, statuses));
    }

    if (dateFrom) {
      conditions.push(gte(orders.createdAt, dateFrom));
    }

    if (dateTo) {
      conditions.push(lte(orders.createdAt, dateTo));
    }

    if (search) {
      const pattern = `%${search}%`;
      const nameOrEmail = or(
        ilike(users.name, pattern),
        ilike(users.email, pattern)
      );
      if (nameOrEmail) {
        conditions.push(nameOrEmail);
      }
    }

    // If lineType specified, constrain to orders that have at least one item
    // whose attached insole design matches the requested line.
    let orderIdsFilteredByLine: string[] | null = null;
    if (lineType) {
      const rows = await db
        .selectDistinct({ orderId: orderItems.orderId })
        .from(orderItems)
        .innerJoin(insoleDesigns, eq(orderItems.designId, insoleDesigns.id))
        .where(eq(insoleDesigns.lineType, lineType));

      orderIdsFilteredByLine = rows.map((r) => r.orderId);
      if (orderIdsFilteredByLine.length === 0) {
        return NextResponse.json({ orders: [] as AdminOrderSummary[] });
      }
      conditions.push(inArray(orders.id, orderIdsFilteredByLine));
    }

    const whereExpr = conditions.length > 0 ? and(...conditions) : undefined;

    const baseRows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        customerName: users.name,
        customerEmail: users.email,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(whereExpr)
      .orderBy(desc(orders.createdAt));

    if (baseRows.length === 0) {
      return NextResponse.json({ orders: [] as AdminOrderSummary[] });
    }

    const orderIds = baseRows.map((r) => r.id);

    // Fetch items for item count + first item name
    const items = await db
      .select({
        orderId: orderItems.orderId,
        productName: orderItems.productName,
        quantity: orderItems.quantity,
        createdAt: orderItems.createdAt,
        designId: orderItems.designId,
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    // Fetch line type per design referenced by any order item
    const designIds = Array.from(
      new Set(items.map((it) => it.designId).filter((v): v is string => !!v))
    );
    const designRows =
      designIds.length > 0
        ? await db
            .select({ id: insoleDesigns.id, lineType: insoleDesigns.lineType })
            .from(insoleDesigns)
            .where(inArray(insoleDesigns.id, designIds))
        : [];

    const designLineById = new Map<string, string>();
    for (const d of designRows) {
      designLineById.set(d.id, d.lineType);
    }

    const itemsByOrder = new Map<
      string,
      {
        count: number;
        firstName: string;
        firstCreated: Date;
        lineTypes: Set<string>;
      }
    >();

    for (const it of items) {
      const qty = Number(it.quantity) || 1;
      const existing = itemsByOrder.get(it.orderId);
      const lineTypeForItem = it.designId
        ? designLineById.get(it.designId)
        : undefined;

      if (!existing) {
        const lineTypes = new Set<string>();
        if (lineTypeForItem) lineTypes.add(lineTypeForItem);
        itemsByOrder.set(it.orderId, {
          count: qty,
          firstName: it.productName,
          firstCreated: it.createdAt,
          lineTypes,
        });
      } else {
        existing.count += qty;
        if (it.createdAt < existing.firstCreated) {
          existing.firstName = it.productName;
          existing.firstCreated = it.createdAt;
        }
        if (lineTypeForItem) existing.lineTypes.add(lineTypeForItem);
      }
    }

    const summaries: AdminOrderSummary[] = baseRows.map((r) => {
      const agg = itemsByOrder.get(r.id);
      // Choose a representative lineType: professional > general > null
      let line: "general" | "professional" | null = null;
      if (agg?.lineTypes.has("professional")) {
        line = "professional";
      } else if (agg?.lineTypes.has("general")) {
        line = "general";
      }

      return {
        id: r.id,
        orderNumber: r.orderNumber,
        status: r.status as OrderStatus,
        totalAmount: Number(r.totalAmount),
        createdAt: r.createdAt.toISOString(),
        itemCount: agg?.count ?? 0,
        firstItemName: agg?.firstName ?? "주문 상품",
        customerName: r.customerName ?? null,
        customerEmail: r.customerEmail ?? null,
        lineType: line,
      };
    });

    return NextResponse.json({ orders: summaries });
  } catch (error) {
    console.error("[GET /api/admin/orders] failed:", error);
    return NextResponse.json(
      { error: "주문 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
