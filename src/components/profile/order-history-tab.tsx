import { ShoppingBag, RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function OrderHistoryTab() {
  return (
    <div className="flex flex-col items-center gap-8">
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
