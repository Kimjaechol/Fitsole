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
import { orders, orderItems, users, insoleDesigns } from "@/lib/db/schema";
import type { OrderStatus } from "@/lib/types/order";
import { OrderFilters } from "@/components/admin/order-filters";
import { OrderTable } from "@/components/admin/order-table";
import type { AdminOrderSummary } from "@/app/api/admin/orders/route";

export const dynamic = "force-dynamic";

interface OrdersPageProps {
  searchParams: Promise<{
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    lineType?: string;
  }>;
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

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Server-side admin order list fetcher.
 *
 * Runs in a server component (layout already enforces admin via requireAdmin
 * + isAdmin in layout.tsx), so we can read directly from the DB without a
 * second HTTP round-trip. Mirrors the filter logic in /api/admin/orders so
 * the two stay consistent.
 */
async function fetchAdminOrders(filters: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  lineType?: string;
}): Promise<AdminOrderSummary[]> {
  const statuses =
    filters.status
      ?.split(",")
      .map((s) => s.trim())
      .filter((s): s is OrderStatus =>
        (ORDER_STATUS_VALUES as readonly string[]).includes(s)
      ) ?? [];

  const dateFrom = parseDate(filters.dateFrom);
  const dateToRaw = parseDate(filters.dateTo);
  let dateTo: Date | null = null;
  if (dateToRaw) {
    dateTo = new Date(dateToRaw);
    dateTo.setHours(23, 59, 59, 999);
  }

  const search = filters.search?.trim() || null;
  const lineType =
    filters.lineType === "general" || filters.lineType === "professional"
      ? filters.lineType
      : null;

  const conditions: SQL[] = [];

  if (statuses.length > 0) {
    conditions.push(inArray(orders.status, statuses));
  }
  if (dateFrom) conditions.push(gte(orders.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(orders.createdAt, dateTo));

  if (search) {
    const pattern = `%${search}%`;
    const nameOrEmail = or(
      ilike(users.name, pattern),
      ilike(users.email, pattern)
    );
    if (nameOrEmail) conditions.push(nameOrEmail);
  }

  if (lineType) {
    const rows = await db
      .selectDistinct({ orderId: orderItems.orderId })
      .from(orderItems)
      .innerJoin(insoleDesigns, eq(orderItems.designId, insoleDesigns.id))
      .where(eq(insoleDesigns.lineType, lineType));
    const idsFiltered = rows.map((r) => r.orderId);
    if (idsFiltered.length === 0) return [];
    conditions.push(inArray(orders.id, idsFiltered));
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

  if (baseRows.length === 0) return [];

  const orderIds = baseRows.map((r) => r.id);

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
  for (const d of designRows) designLineById.set(d.id, d.lineType);

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
    const lt = it.designId ? designLineById.get(it.designId) : undefined;

    if (!existing) {
      const lineTypes = new Set<string>();
      if (lt) lineTypes.add(lt);
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
      if (lt) existing.lineTypes.add(lt);
    }
  }

  return baseRows.map((r) => {
    const agg = itemsByOrder.get(r.id);
    let line: "general" | "professional" | null = null;
    if (agg?.lineTypes.has("professional")) line = "professional";
    else if (agg?.lineTypes.has("general")) line = "general";

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
}

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const sp = await searchParams;
  const list = await fetchAdminOrders(sp);

  return (
    <div className="space-y-5 pt-14 md:pt-0">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">주문 관리</h1>
        <p className="mt-1 text-sm text-slate-500">
          전체 주문을 필터링하고 상세 정보를 확인할 수 있습니다.
        </p>
      </div>

      <OrderFilters />

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">총 {list.length}건</p>
      </div>

      <OrderTable orders={list} />
    </div>
  );
}
