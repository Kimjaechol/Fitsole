"use client";

/**
 * Admin Order Detail View (D-06).
 *
 * Assembles the full order detail UI for the admin dashboard:
 *   - Header with order number, customer info, status badge
 *   - Tab 1 주문 정보: items, shipping, payment, customer
 *   - Tab 2 스캔 데이터: ScanDataViewer (D-07)
 *   - Tab 3 인솔 설계: DesignSpecViewer per item with insole (D-08)
 *
 * Status transition controls live in StatusControls (rendered separately
 * by the page) so this component stays a pure data view.
 */

import Link from "next/link";
import { ChevronLeft, Package, Truck, CreditCard, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ORDER_STATUS_BADGE_CLASSES,
  ORDER_STATUS_LABELS,
} from "@/lib/types/order";
import type { AdminOrderDetail } from "@/app/api/admin/orders/[id]/route";
import { ScanDataViewer } from "@/components/admin/scan-data-viewer";
import { DesignSpecViewer } from "@/components/admin/design-spec-viewer";

interface OrderDetailViewProps {
  order: AdminOrderDetail;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CARD: "카드",
  카드: "카드",
  card: "카드",
  KAKAO_PAY: "카카오페이",
  카카오페이: "카카오페이",
  kakaopay: "카카오페이",
  NAVER_PAY: "네이버페이",
  네이버페이: "네이버페이",
  naverpay: "네이버페이",
  TOSS_PAY: "토스페이",
  토스페이: "토스페이",
  tosspay: "토스페이",
  TRANSFER: "계좌이체",
  계좌이체: "계좌이체",
  transfer: "계좌이체",
};

function formatKrw(amount: number): string {
  return `${Number(amount).toLocaleString("ko-KR")}원`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-slate-500" />
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
    </div>
  );
}

export function OrderDetailView({ order }: OrderDetailViewProps) {
  const fullAddress = order.shippingDetailAddress
    ? `${order.shippingAddress} ${order.shippingDetailAddress}`
    : order.shippingAddress;

  const paymentLabel = order.paymentMethod
    ? PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod
    : "-";

  // Index designs by id for fast lookup, and build the items-with-insole list
  // for the design tab (one DesignSpecViewer per item, only when item references
  // a design that exists in the order's designs array).
  const designById = new Map(order.designs.map((d) => [d.designId, d]));

  const designItems = order.items
    .map((item) => {
      if (!item.designId) return null;
      const design = designById.get(item.designId);
      if (!design) return null;
      return { item, design };
    })
    .filter((x): x is { item: typeof order.items[number]; design: typeof order.designs[number] } => x !== null);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/dashboard/orders">
            <ChevronLeft className="mr-1 h-4 w-4" />
            주문 목록
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>{formatDateTime(order.createdAt)}</span>
          <span>·</span>
          <span className="font-mono">{order.orderNumber}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            {order.customer.name ?? "이름 없음"}
          </h1>
          <span className="text-sm text-slate-600">
            {order.customer.email}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS_BADGE_CLASSES[order.status]}`}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full justify-start md:w-auto">
          <TabsTrigger value="info">주문 정보</TabsTrigger>
          <TabsTrigger value="scan">스캔 데이터</TabsTrigger>
          <TabsTrigger value="design">
            인솔 설계 ({designItems.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: 주문 정보 */}
        <TabsContent value="info" className="mt-6 space-y-6">
          {/* Customer */}
          <Card>
            <CardContent className="p-5 md:p-6">
              <SectionHeader icon={User} title="고객 정보" />
              <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">이름</dt>
                  <dd className="font-medium text-slate-900">
                    {order.customer.name ?? "-"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">이메일</dt>
                  <dd className="font-medium text-slate-900">
                    {order.customer.email}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardContent className="p-5 md:p-6">
              <SectionHeader icon={Package} title="주문 상품" />
              <div className="flex flex-col divide-y divide-slate-100">
                {order.items.map((item) => {
                  const unitPrice =
                    item.price +
                    (item.includesInsole ? item.bundleInsolePrice ?? 0 : 0);
                  return (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.productName}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>사이즈 {item.size}mm</span>
                          <span>·</span>
                          <span>수량 {item.quantity}개</span>
                          {item.includesInsole && (
                            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                              맞춤 인솔 포함
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="whitespace-nowrap text-sm font-bold text-slate-900">
                        {formatKrw(unitPrice * item.quantity)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Shipping */}
          <Card>
            <CardContent className="p-5 md:p-6">
              <SectionHeader icon={Truck} title="배송 정보" />
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">수령인</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {order.shippingName}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">연락처</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {order.shippingPhone}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">주소</dt>
                  <dd className="max-w-[65%] text-right font-medium text-slate-900">
                    ({order.shippingZipcode}) {fullAddress}
                  </dd>
                </div>
                {order.trackingNumber && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-slate-500">운송장 번호</dt>
                      <dd className="text-right font-semibold text-slate-900">
                        {order.trackingCarrier
                          ? `${order.trackingCarrier} `
                          : ""}
                        {order.trackingNumber}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardContent className="p-5 md:p-6">
              <SectionHeader icon={CreditCard} title="결제 정보" />
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">결제 수단</dt>
                  <dd className="font-medium text-slate-900">{paymentLabel}</dd>
                </div>
                {order.paymentKey && (
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">결제 키</dt>
                    <dd className="font-mono text-xs text-slate-700">
                      {order.paymentKey}
                    </dd>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <dt className="font-semibold text-slate-900">
                    총 결제 금액
                  </dt>
                  <dd className="text-lg font-bold text-slate-900">
                    {formatKrw(order.totalAmount)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Scan data */}
        <TabsContent value="scan" className="mt-6">
          <ScanDataViewer scans={order.scans} />
        </TabsContent>

        {/* Tab 3: Design specs */}
        <TabsContent value="design" className="mt-6">
          {designItems.length === 0 ? (
            <Card>
              <CardContent className="flex h-[160px] items-center justify-center p-6 text-sm text-slate-500">
                인솔 설계 데이터 없음
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {designItems.map(({ item, design }) => (
                <DesignSpecViewer
                  key={`${item.id}-${design.designId}`}
                  design={design}
                  shoeSize={item.size}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
