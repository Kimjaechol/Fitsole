"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/lib/cart/store";

const FREE_SHIPPING_THRESHOLD = 50000; // KRW
const SHIPPING_FEE = 3000; // KRW

export function CartSummary() {
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);

  const productTotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const insoleTotal = items.reduce(
    (sum, item) =>
      sum + (item.includesInsole ? item.bundleInsolePrice * item.quantity : 0),
    0
  );
  const subtotal = totalPrice();
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const grandTotal = subtotal + shippingFee;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">주문 요약</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">상품 금액</span>
          <span>{productTotal.toLocaleString("ko-KR")}원</span>
        </div>
        {insoleTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">인솔 추가 금액</span>
            <span>{insoleTotal.toLocaleString("ko-KR")}원</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">배송비</span>
          <span>
            {shippingFee === 0
              ? "무료"
              : `${shippingFee.toLocaleString("ko-KR")}원`}
          </span>
        </div>
        {shippingFee > 0 && (
          <p className="text-xs text-muted-foreground">
            {FREE_SHIPPING_THRESHOLD.toLocaleString("ko-KR")}원 이상 무료배송
          </p>
        )}

        <Separator />

        <div className="flex justify-between font-bold text-lg">
          <span>총 결제 금액</span>
          <span>{grandTotal.toLocaleString("ko-KR")}원</span>
        </div>

        <Button asChild size="lg" className="w-full bg-[#2563EB] hover:bg-[#2563EB]/90">
          <Link href="/checkout">결제하기</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
