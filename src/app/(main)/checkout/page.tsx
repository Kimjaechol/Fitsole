'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCartStore } from '@/lib/cart/store';
import type { ShippingInfo, CheckoutStep } from '@/lib/checkout/types';
import { CheckoutStepper } from '@/components/checkout/CheckoutStepper';
import { ShippingForm } from '@/components/checkout/ShippingForm';
import { OrderSummaryReview } from '@/components/checkout/OrderSummaryReview';
import { PaymentWidget } from '@/components/checkout/PaymentWidget';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PrepareResult {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const items = useCartStore((s) => s.items);
  const itemCount = useCartStore((s) => s.itemCount);

  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [shipping, setShipping] = useState<ShippingInfo | null>(null);
  const [prepareResult, setPrepareResult] = useState<PrepareResult | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  // Redirect to cart if empty
  useEffect(() => {
    if (itemCount() === 0) {
      router.replace('/cart');
    }
  }, [itemCount, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (session === null) {
      router.replace('/auth/login?callbackUrl=/checkout');
    }
  }, [session, router]);

  const handleShippingSubmit = async (data: ShippingInfo) => {
    setShipping(data);
    setIsPreparing(true);

    try {
      const response = await fetch('/api/checkout/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, shipping: data }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '주문 준비에 실패했습니다');
      }

      const result: PrepareResult = await response.json();
      setPrepareResult(result);
      setStep('payment');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '주문 준비에 실패했습니다';
      toast.error(message);
    } finally {
      setIsPreparing(false);
    }
  };

  const handlePaymentSuccess = () => {
    setStep('confirmation');
  };

  if (itemCount() === 0 || session === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <CheckoutStepper currentStep={step} />

      {step === 'shipping' && (
        <div className="mx-auto max-w-lg">
          <h2 className="mb-4 text-lg font-semibold">배송 정보</h2>
          <ShippingForm
            onSubmit={handleShippingSubmit}
            defaultValues={shipping ?? undefined}
          />
          {isPreparing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              주문을 준비하고 있습니다...
            </div>
          )}
        </div>
      )}

      {step === 'payment' && prepareResult && shipping && (
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-lg font-semibold">주문 내역</h2>
            <div className="rounded-lg border p-4">
              <OrderSummaryReview items={items} shipping={shipping} />
            </div>
          </div>
          <div>
            <h2 className="mb-4 text-lg font-semibold">결제</h2>
            <div className="rounded-lg border p-4">
              <PaymentWidget
                orderId={prepareResult.orderId}
                orderNumber={prepareResult.orderNumber}
                totalAmount={prepareResult.totalAmount}
                customerName={shipping.name}
                customerKey={session?.user?.id ?? ''}
                onSuccess={handlePaymentSuccess}
              />
            </div>
          </div>
        </div>
      )}

      {step === 'confirmation' && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            주문 확인 페이지는 다음 플랜에서 구현됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
