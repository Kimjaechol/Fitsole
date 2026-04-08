import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="flex min-h-dvh items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6 text-center px-4">
        <h1 className="text-[32px] font-bold leading-[1.1] text-foreground">
          당신의 발에 꼭 맞는 인솔, 과학이 설계합니다
        </h1>
        <p className="text-base leading-[1.5] text-[#64748B] max-w-md">
          스마트폰으로 발을 측정하고, 맞춤 인솔로 편안함을 경험하세요
        </p>
        <Button
          asChild
          className="h-12 px-8 bg-[#2563EB] text-white font-bold text-base rounded-lg hover:bg-[#2563EB]/90"
        >
          <Link href="/scan">내 발에 맞는 신발 찾기</Link>
        </Button>
      </div>
    </section>
  );
}
