'use client';

import { useEffect, useState, useCallback } from 'react';
import { loadTossPayments, TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAYMENT_METHODS = [
  { id: 'CARD', label: '카드' },
  { id: 'TRANSFER', label: '계좌이체' },
  { id: 'TOSSPAY', label: '토스페이' },
  { id: 'KAKAOPAY', label: '카카오페이' },
  { id: 'NAVERPAY', label: '네이버페이' },
] as const;

type PaymentMethodId = (typeof PAYMENT_METHODS)[number]['id'];

interface PaymentWidgetProps {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  customerName: string;
  customerKey: string;
  onSuccess: () => void;
}

export function PaymentWidget({
  orderNumber,
  totalAmount,
  customerName,
  customerKey,
}: PaymentWidgetProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>('CARD');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [widgets, setWidgets] = useState<TossPaymentsWidgets | null>(null);

  useEffect(() => {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      console.error('NEXT_PUBLIC_TOSS_CLIENT_KEY is not set');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function initSDK() {
      try {
        const tossPayments = await loadTossPayments(clientKey!);
        const tossWidgets = tossPayments.widgets({
          customerKey,
        });

        if (!cancelled) {
          setWidgets(tossWidgets);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Toss Payments SDK 초기화 실패:', error);
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    initSDK();

    return () => {
      cancelled = true;
    };
  }, [customerKey]);

  const handlePayment = useCallback(async () => {
    if (!widgets) return;

    setIsProcessing(true);

    try {
      // Build order name
      const orderName = `FitSole 주문 (${orderNumber})`;

      await widgets.setAmount({
        currency: 'KRW',
        value: totalAmount,
      });

      await widgets.requestPayment({
        orderId: orderNumber,
        orderName,
        customerName,
        successUrl: `${window.location.origin}/checkout/success`,
        failUrl: `${window.location.origin}/checkout/fail`,
      });
    } catch (error) {
      // User cancelled or SDK error
      console.error('결제 요청 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [widgets, orderNumber, totalAmount, customerName]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          결제 모듈을 불러오는 중...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-base font-semibold">결제 수단 선택</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => setSelectedMethod(method.id)}
              className={cn(
                'flex items-center justify-center rounded-lg border p-3 text-sm font-medium transition-colors',
                selectedMethod === method.id
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-background text-foreground hover:bg-muted'
              )}
            >
              {method.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">결제 금액</span>
          <span className="text-lg font-bold">
            {totalAmount.toLocaleString('ko-KR')}원
          </span>
        </div>
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={handlePayment}
        disabled={isProcessing || !widgets}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            결제 진행 중...
          </>
        ) : (
          `${totalAmount.toLocaleString('ko-KR')}원 결제하기`
        )}
      </Button>
    </div>
  );
}
