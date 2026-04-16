import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { gte, inArray, sql } from "drizzle-orm";
import { DashboardStats } from "@/components/admin/dashboard-stats";

export const dynamic = "force-dynamic";

/**
 * Admin dashboard overview.
 *
 * Fetches aggregate statistics for the 4 top-level stat cards:
 * - Total orders
 * - Today's new orders
 * - In-progress orders (designing + manufacturing)
 * - Total revenue (KRW) across non-cancelled orders
 */
export default async function AdminDashboardPage() {
  // Start of today (local midnight)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders);

  const [todayRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(gte(orders.createdAt, todayStart));

  const [inProgressRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(inArray(orders.status, ["designing", "manufacturing"]));

  const [revenueRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::float`,
    })
    .from(orders)
    .where(sql`${orders.status} <> 'cancelled'`);

  const stats = {
    totalOrders: Number(totalRow?.count ?? 0),
    todayOrders: Number(todayRow?.count ?? 0),
    inProgressOrders: Number(inProgressRow?.count ?? 0),
    totalRevenue: Number(revenueRow?.total ?? 0),
  };

  return (
    <div className="space-y-6 pt-14 md:pt-0">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
        <p className="mt-1 text-sm text-slate-500">
          주문 현황과 주요 지표를 한눈에 확인하세요.
        </p>
      </div>

      <DashboardStats stats={stats} />
    </div>
  );
}
