import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Check, Package, Truck, Sparkles, CreditCard } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems, insoleDesigns } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ORDER_STATUS_BADGE_CLASSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STEPS,
  type OrderDetail,
  type OrderInsoleDesignSummary,
  type OrderItemDetail,
  type OrderStatus,
  type DesignSource,
} from "@/lib/types/order";

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

async function loadOrderDetail(
  orderId: string,
  userId: string
): Promise<OrderDetail | null> {
  // IDOR: filter by both id AND userId (T-05-01)
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!order) return null;

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
      return {
        designId: d.id,
        lineType: d.lineType,
        lineTypeLabel:
          d.lineType === "professional" ? "SALTED 정밀 측정" : "카메라 측정",
        archHeight: extractNumber(params, [
          "archHeight",
          "arch_height",
          "arch",
        ]),
        heelCupDepth: extractNumber(params, [
          "heelCupDepth",
          "heel_cup_depth",
          "heelCup",
        ]),
        designParams: params,
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
    items: itemDetails,
    insoleDesigns: designSummaries,
  };
}

function StatusProgressBar({ status }: { status: OrderStatus }) {
  // Cancelled orders show a distinct single-line banner instead of the progress bar.
  if (status === "cancelled") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm font-semibold text-red-700">
          {ORDER_STATUS_LABELS.cancelled}
        </p>
      </div>
    );
  }

  const currentIdx = ORDER_STATUS_STEPS.indexOf(status);
  // When status is "pending", treat it as "before step 0" (all steps inactive).
  const activeIdx = currentIdx === -1 ? -1 : currentIdx;

  return (
    <div className="w-full">
      <ol className="flex items-center justify-between">
        {ORDER_STATUS_STEPS.map((step, idx) => {
          const isCompleted = idx < activeIdx;
          const isCurrent = idx === activeIdx;
          const isUpcoming = idx > activeIdx;

          return (
            <li
              key={step}
              className="flex-1 flex flex-col items-center relative"
            >
              {/* Connector line to the next step */}
              {idx < ORDER_STATUS_STEPS.length - 1 && (
                <div
                  className={`absolute top-4 left-1/2 w-full h-0.5 ${
                    idx < activeIdx ? "bg-[#0F172A]" : "bg-[#E2E8F0]"
                  }`}
                  aria-hidden="true"
                />
              )}
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  isCompleted
                    ? "border-[#0F172A] bg-[#0F172A] text-white"
                    : isCurrent
                      ? "border-[#0F172A] bg-white text-[#0F172A]"
                      : "border-[#E2E8F0] bg-white text-[#94A3B8]"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium text-center ${
                  isUpcoming ? "text-[#94A3B8]" : "text-[#0F172A]"
                }`}
              >
                {ORDER_STATUS_LABELS[step]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-[#64748B]" />
      <h2 className="text-base font-bold text-[#0F172A]">{title}</h2>
    </div>
  );
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const order = await loadOrderDetail(id, session.user.id);

  if (!order) {
    notFound();
  }

  const fullAddress = order.shippingDetailAddress
    ? `${order.shippingAddress} ${order.shippingDetailAddress}`
    : order.shippingAddress;

  const paymentLabel = order.paymentMethod
    ? PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod
    : "-";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 lg:px-8">
      {/* Back button */}
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/mypage">
            <ChevronLeft className="h-4 w-4 mr-1" />
            주문 내역
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-[#64748B]">
          <span>{formatDateTime(order.createdAt)}</span>
          <span>·</span>
          <span>{order.orderNumber}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS_BADGE_CLASSES[order.status]}`}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>

      {/* Status progress */}
      <Card className="mb-6">
        <CardContent className="p-5 md:p-6">
          <StatusProgressBar status={order.status} />
        </CardContent>
      </Card>

      {/* 주문 상품 */}
      <Card className="mb-6">
        <CardContent className="p-5 md:p-6">
          <SectionHeader icon={Package} title="주문 상품" />
          <div className="flex flex-col divide-y divide-[#F1F5F9]">
            {order.items.map((item) => {
              const unitPrice =
                item.price + (item.includesInsole ? item.bundleInsolePrice ?? 0 : 0);
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {item.productName}
                    </p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-[#64748B]">
                      <span>사이즈 {item.size}mm</span>
                      <span>·</span>
                      <span>수량 {item.quantity}개</span>
                      {item.includesInsole && (
                        <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-700 border border-sky-200 px-2 py-0.5 text-[11px] font-semibold">
                          맞춤 인솔 포함
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-[#0F172A] whitespace-nowrap">
                    {formatKrw(unitPrice * item.quantity)}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 인솔 설계 요약 */}
      {order.insoleDesigns.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-5 md:p-6">
            <SectionHeader icon={Sparkles} title="인솔 설계 요약" />
            <div className="flex flex-col gap-3">
              {order.insoleDesigns.map((d) => (
                <div
                  key={d.designId}
                  className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[#0F172A]">
                      {d.lineTypeLabel}
                    </span>
                  </div>
                  <Separator className="mb-3" />
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-[#64748B]">아치 높이</dt>
                      <dd className="font-semibold text-[#0F172A]">
                        {d.archHeight !== null ? `${d.archHeight}mm` : "-"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-[#64748B]">힐컵 깊이</dt>
                      <dd className="font-semibold text-[#0F172A]">
                        {d.heelCupDepth !== null ? `${d.heelCupDepth}mm` : "-"}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 배송 정보 */}
      <Card className="mb-6">
        <CardContent className="p-5 md:p-6">
          <SectionHeader icon={Truck} title="배송 정보" />
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-[#64748B]">수령인</dt>
              <dd className="text-[#0F172A] font-medium text-right">
                {order.shippingName}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-[#64748B]">연락처</dt>
              <dd className="text-[#0F172A] font-medium text-right">
                {order.shippingPhone}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-[#64748B]">주소</dt>
              <dd className="text-[#0F172A] font-medium text-right max-w-[65%]">
                ({order.shippingZipcode}) {fullAddress}
              </dd>
            </div>
            {order.trackingNumber && (
              <>
                <Separator className="my-2" />
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[#64748B]">운송장 번호</dt>
                  <dd className="text-[#0F172A] font-semibold text-right">
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

      {/* 결제 정보 */}
      <Card className="mb-6">
        <CardContent className="p-5 md:p-6">
          <SectionHeader icon={CreditCard} title="결제 정보" />
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-[#64748B]">결제 수단</dt>
              <dd className="text-[#0F172A] font-medium">{paymentLabel}</dd>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <dt className="text-[#0F172A] font-semibold">총 결제 금액</dt>
              <dd className="text-lg font-bold text-[#0F172A]">
                {formatKrw(order.totalAmount)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" asChild>
          <Link href="/mypage">목록으로 돌아가기</Link>
        </Button>
      </div>
    </div>
  );
}
