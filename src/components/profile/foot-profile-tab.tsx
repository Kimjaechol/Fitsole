import { ScanLine } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export function FootProfileTab() {
  return (
    <EmptyState
      icon={ScanLine}
      title="아직 발 측정을 하지 않았어요"
      body="스마트폰 카메라로 간편하게 발을 측정해 보세요"
      ctaText="발 측정 시작하기"
      ctaHref="/scan"
    />
  );
}
