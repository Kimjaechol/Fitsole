"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, RotateCcw, ChevronRight, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ORDER_STATUS_BADGE_CLASSES,
  ORDER_STATUS_LABELS,
  type OrderSummary,
} from "@/lib/types/order";

function formatKrw(amount: number): string {
  return `${Number(amount).toLocaleString("ko-KR")}원`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export function OrderHistoryTab() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/orders", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`status ${res.status}`);
        }
        const data = (await res.json()) as { orders: OrderSummary[] };
        if (!cancelled) {
          setOrders(data.orders ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setError("주문 내역을 불러오지 못했습니다.");
          setOrders([]);
        }
        console.error("[order-history-tab] fetch failed:", e);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (orders === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#64748B]" />
        <span className="ml-2 text-sm text-[#64748B]">
          주문 내역을 불러오는 중...
        </span>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-8">
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <EmptyState
          icon={ShoppingBag}
          title="아직 주문 내역이 없어요"
          body="맞춤 인솔과 신발을 둘러보세요"
          ctaText="상품 둘러보기"
          ctaHref="/catalog"
        />

        <div className="flex flex-col items-center gap-2">
          <Button
            variant="outline"
            asChild
            aria-disabled="true"
            className="opacity-50 cursor-not-allowed pointer-events-none"
            tabIndex={-1}
          >
            <Link href="/scan" tabIndex={-1}>
              <RotateCcw className="mr-2 h-4 w-4" />
              이전 측정 데이터로 재주문
            </Link>
          </Button>
          <p className="text-sm text-[#64748B]">
            발 측정 완료 후 이용 가능합니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {orders.map((order) => {
          const extraCount = Math.max(order.itemCount - 1, 0);
          const itemSummary =
            extraCount > 0
              ? `${order.firstItemName} 외 ${extraCount}건`
              : order.firstItemName;

          return (
            <Link
              key={order.id}
              href={`/mypage/orders/${order.id}`}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0F172A] rounded-lg"
            >
              <Card className="hover:border-[#0F172A] transition-colors">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm text-[#64748B]">
                        <span>{formatDate(order.createdAt)}</span>
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

      <div className="mt-4 flex flex-col items-center gap-2">
        <Button
          variant="outline"
          asChild
          aria-disabled="true"
          className="opacity-50 cursor-not-allowed pointer-events-none"
          tabIndex={-1}
        >
          <Link href="/scan" tabIndex={-1}>
            <RotateCcw className="mr-2 h-4 w-4" />
            이전 측정 데이터로 재주문
          </Link>
        </Button>
        <p className="text-sm text-[#64748B]">
          발 측정 완료 후 이용 가능합니다
        </p>
      </div>
    </div>
  );
}
