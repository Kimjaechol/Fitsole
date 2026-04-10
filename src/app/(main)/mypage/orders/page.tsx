import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import {
  ORDER_STATUS_BADGE_CLASSES,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type OrderSummary,
} from "@/lib/types/order";

function formatKrw(amount: number): string {
  return `${Number(amount).toLocaleString("ko-KR")}원`;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

/**
 * Standalone order list page at /mypage/orders.
 *
 * Server-rendered equivalent of the mypage order-history tab, useful when
 * linking directly to the list (e.g., from the order detail page's back button).
 *
 * Security: auth() required — unauthenticated users redirect to /login.
 * IDOR: query filters by session.user.id only (T-05-01).
 */
export default async function OrderListPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
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

  let summaries: OrderSummary[] = [];

  if (userOrders.length > 0) {
    const ids = userOrders.map((o) => o.id);
    const items = await db
      .select({
        orderId: orderItems.orderId,
        productName: orderItems.productName,
        quantity: orderItems.quantity,
        createdAt: orderItems.createdAt,
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, ids));

    const agg = new Map<
      string,
      { count: number; firstName: string; firstCreated: Date }
    >();
    for (const it of items) {
      const qty = Number(it.quantity) || 1;
      const existing = agg.get(it.orderId);
      if (!existing) {
        agg.set(it.orderId, {
          count: qty,
          firstName: it.productName,
          firstCreated: it.createdAt,
        });
      } else {
        existing.count += qty;
        if (it.createdAt < existing.firstCreated) {
          existing.firstName = it.productName;
          existing.firstCreated = it.createdAt;
        }
      }
    }

    summaries = userOrders.map((o) => {
      const a = agg.get(o.id);
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status as OrderStatus,
        totalAmount: Number(o.totalAmount),
        createdAt: o.createdAt.toISOString(),
        itemCount: a?.count ?? 0,
        firstItemName: a?.firstName ?? "주문 상품",
      };
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/mypage">
            <ChevronLeft className="h-4 w-4 mr-1" />
            마이페이지
          </Link>
        </Button>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-[#0F172A]">주문 내역</h1>

      {summaries.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="아직 주문 내역이 없어요"
          body="맞춤 인솔과 신발을 둘러보세요"
          ctaText="상품 둘러보기"
          ctaHref="/catalog"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {summaries.map((order) => {
            const extraCount = Math.max(order.itemCount - 1, 0);
            const itemSummary =
              extraCount > 0
                ? `${order.firstItemName} 외 ${extraCount}건`
                : order.firstItemName;
            return (
              <Link
                key={order.id}
                href={`/mypage/orders/${order.id}`}
                className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0F172A]"
              >
                <Card className="hover:border-[#0F172A] transition-colors">
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm text-[#64748B]">
                          <span>{formatDate(new Date(order.createdAt))}</span>
                          <span>·</span>
                          <span className="truncate">{order.orderNumber}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS_BADGE_CLASSES[order.status]}`}
                          >
                            {ORDER_STATUS_LABELS[order.status]}
                          </span>
                          <p className="text-base font-semibold text-[#0F172A] truncate">
                            {itemSummary}
                          </p>
                        </div>
                        <p className="mt-2 text-lg font-bold text-[#0F172A]">
                          {formatKrw(order.totalAmount)}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-[#94A3B8] shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
