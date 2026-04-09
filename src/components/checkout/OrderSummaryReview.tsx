'use client';

import type { CartItem } from '@/lib/cart/types';
import type { ShippingInfo } from '@/lib/checkout/types';
import { Separator } from '@/components/ui/separator';

const FREE_SHIPPING_THRESHOLD = 50_000;
const SHIPPING_FEE = 3_000;

function formatPrice(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

interface OrderSummaryReviewProps {
  items: CartItem[];
  shipping: ShippingInfo | null;
}

export function OrderSummaryReview({ items, shipping }: OrderSummaryReviewProps) {
  const subtotal = items.reduce((sum, item) => {
    const unitPrice = item.price + (item.includesInsole ? item.bundleInsolePrice : 0);
    return sum + unitPrice * item.quantity;
  }, 0);

  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const totalAmount = subtotal + shippingFee;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">주문 요약</h3>

      {/* Items list */}
      <div className="space-y-3">
        {items.map((item) => {
          const unitPrice =
            item.price + (item.includesInsole ? item.bundleInsolePrice : 0);
          return (
            <div key={item.id} className="flex items-start justify-between text-sm">
              <div className="flex-1">
                <p className="font-medium">{item.productName}</p>
                <p className="text-muted-foreground">
                  {item.size}mm
                  {item.includesInsole && ' | 맞춤 인솔 포함'}
                  {item.quantity > 1 && ` x ${item.quantity}`}
                </p>
              </div>
              <p className="font-medium whitespace-nowrap">
                {formatPrice(unitPrice * item.quantity)}
              </p>
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Price breakdown */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">상품 금액</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">배송비</span>
          <span>
            {shippingFee === 0 ? (
              <span className="text-primary">무료</span>
            ) : (
              formatPrice(shippingFee)
            )}
          </span>
        </div>
        {shippingFee > 0 && (
          <p className="text-xs text-muted-foreground">
            {formatPrice(FREE_SHIPPING_THRESHOLD)} 이상 구매 시 무료 배송
          </p>
        )}
      </div>

      <Separator />

      {/* Total */}
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">총 결제 금액</span>
        <span className="text-xl font-bold text-primary">
          {formatPrice(totalAmount)}
        </span>
      </div>

      {/* Shipping address summary */}
      {shipping && (
        <>
          <Separator />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">배송지 정보</h4>
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p>{shipping.name} | {shipping.phone}</p>
              <p>
                ({shipping.zipcode}) {shipping.address}
                {shipping.detailAddress && ` ${shipping.detailAddress}`}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
