import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * /segment/general — General consumer segment landing (Phase 06 D-03).
 *
 * Comfort-focused hero + segment-prefiltered catalog CTA + scan link.
 */
export default function GeneralSegmentPage() {
  return (
    <div className="px-5 py-10 md:px-10">
      <section className="mb-10 space-y-4">
        <h1 className="text-3xl font-semibold text-[#0F172A]">
          편안함에 집중한 맞춤 인솔
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-[#64748B]">
          매일 신는 신발, 오래 서 있는 하루에 필요한 것은 결국 편안함입니다.
          FitSole은 당신의 발 형태에 맞춘 쿠셔닝과 아치 지지로 하루 종일
          편안한 착용감을 설계합니다.
        </p>
      </section>

      <section className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border p-5">
          <h2 className="mb-2 text-lg font-semibold text-[#0F172A]">
            맞춤 쿠셔닝
          </h2>
          <p className="text-sm text-[#64748B]">
            발 모양에 맞춘 쿠션 배치로 하루 종일 피로를 줄여 드립니다.
          </p>
        </div>
        <div className="rounded-xl border border-border p-5">
          <h2 className="mb-2 text-lg font-semibold text-[#0F172A]">
            일상 착용감
          </h2>
          <p className="text-sm text-[#64748B]">
            출퇴근, 외출, 산책까지 모든 일상에 잘 어울리는 편안한 설계입니다.
          </p>
        </div>
        <div className="rounded-xl border border-border p-5">
          <h2 className="mb-2 text-lg font-semibold text-[#0F172A]">
            간편한 측정
          </h2>
          <p className="text-sm text-[#64748B]">
            스마트폰만 있으면 5분 안에 측정이 완료됩니다.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="bg-[#0F172A] text-white hover:bg-[#1E293B]">
          <Link href="/catalog?segment=general">
            편안한 신발 보기
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/scan">지금 측정 시작</Link>
        </Button>
      </section>
    </div>
  );
}
