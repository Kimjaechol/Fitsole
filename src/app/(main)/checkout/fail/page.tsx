'use client';

import { useSearchParams } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const ERROR_MESSAGES: Record<string, string> = {
  PAY_PROCESS_CANCELED: '결제가 취소되었습니다.',
  PAY_PROCESS_ABORTED: '결제 처리가 중단되었습니다.',
  REJECT_CARD_COMPANY: '카드사에서 결제가 거부되었습니다.',
  INSUFFICIENT_BALANCE: '잔액이 부족합니다.',
  EXCEED_MAX_DAILY_PAYMENT_COUNT: '일일 결제 횟수를 초과했습니다.',
  EXCEED_MAX_PAYMENT_AMOUNT: '결제 한도를 초과했습니다.',
  INVALID_CARD_EXPIRATION: '카드 유효기간이 만료되었습니다.',
  NOT_SUPPORTED_INSTALLMENT_PLAN_CARD: '할부가 지원되지 않는 카드입니다.',
};

export default function CheckoutFailPage() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const message = searchParams.get('message') || '';

  const displayMessage =
    ERROR_MESSAGES[code] || message || '알 수 없는 오류가 발생했습니다.';

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <div className="rounded-full bg-destructive/10 p-4">
        <XCircle className="h-12 w-12 text-destructive" />
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">결제에 실패했습니다</h1>
        <p className="text-muted-foreground">{displayMessage}</p>
        {code && (
          <p className="text-xs text-muted-foreground">오류 코드: {code}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="default" asChild>
          <Link href="/checkout">다시 시도하기</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/cart">장바구니로 돌아가기</Link>
        </Button>
      </div>
    </div>
  );
}
