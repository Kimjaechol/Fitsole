'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCartStore } from '@/lib/cart/store';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface OrderConfirmation {
  orderNumber: string;
  orderId: string;
}

type PageStatus = 'loading' | 'success' | 'error';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const clearCart = useCartStore((s) => s.clearCart);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const confirmedRef = useRef(false);

  const confirmPayment = useCallback(async () => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');

    if (!paymentKey || !orderId || !amount) {
      setErrorMessage('결제 정보가 올바르지 않습니다.');
      setStatus('error');
      return;
    }

    try {
      const response = await fetch('/api/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount: Number(amount),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || '결제 확인에 실패했습니다.');
        setStatus('error');
        return;
      }

      setOrder({
        orderNumber: data.orderNumber,
        orderId: data.orderId,
      });
      setStatus('success');
      clearCart();
    } catch {
      setErrorMessage('결제 확인 중 오류가 발생했습니다.');
      setStatus('error');
    }
  }, [searchParams, clearCart]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional fire-on-mount; confirmedRef guards against double-invocation.
    confirmPayment();
  }, [confirmPayment]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">결제를 확인하고 있습니다...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <div className="rounded-full bg-destructive/10 p-4">
          <CheckCircle className="h-12 w-12 text-destructive" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">결제 확인 실패</h1>
          <p className="text-muted-foreground">{errorMessage}</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="default"
            onClick={() => {
              confirmedRef.current = false;
              setStatus('loading');
              confirmPayment();
            }}
          >
            다시 시도하기
          </Button>
          <Button variant="outline" asChild>
            <Link href="/checkout">결제 페이지로 돌아가기</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-8">
      <div className="rounded-full bg-green-100 p-4">
        <CheckCircle className="h-12 w-12 text-green-600" />
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">주문이 완료되었습니다!</h1>
        <p className="text-muted-foreground">
          주문 확인 이메일이 발송되었습니다.
        </p>
      </div>

      {order && (
        <div className="w-full max-w-md space-y-4">
          <div className="rounded-lg border p-6 text-center">
            <p className="text-sm text-muted-foreground">주문번호</p>
            <p className="mt-1 text-xl font-bold">{order.orderNumber}</p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="default" asChild>
          <Link href="/mypage">주문 내역 보기</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/catalog">쇼핑 계속하기</Link>
        </Button>
      </div>
    </div>
  );
}
