import Link from "next/link";
import { Button } from "@/components/ui/button";

export function BottomCTA() {
  return (
    <section className="bg-[#2563EB] py-16">
      <div className="flex flex-col items-center gap-6 text-center px-4">
        <h2 className="text-2xl font-bold text-white">
          맞춤 인솔로 새로운 편안함을 경험하세요
        </h2>
        <Button
          asChild
          variant="outline"
          className="h-12 px-8 border-white bg-white text-[#2563EB] font-bold text-base rounded-lg hover:bg-white/90"
        >
          <Link href="/scan">지금 시작하기</Link>
        </Button>
      </div>
    </section>
  );
}
