import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * KitRentalSection — D-15, OFFL-04.
 *
 * Wraps with `id="kit-rental"` so /segment/athlete can deep-link via
 * /stores/gangnam#kit-rental (existing link from Plan 06-01).
 *
 * Describes the 1-2주 rental program for athletes making custom 축구화 /
 * 마라톤화 insoles.
 */
export function KitRentalSection() {
  return (
    <section
      id="kit-rental"
      className="scroll-mt-20 px-4 py-12 md:px-8 md:py-16"
    >
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl border border-[#2563EB]/20 bg-gradient-to-br from-[#2563EB]/5 to-[#7C3AED]/5 p-6 md:p-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#2563EB]">
            Athlete Program
          </p>
          <h2 className="mb-4 text-2xl font-bold text-[#0F172A] md:text-3xl">
            운동선수 키트 대여 프로그램
          </h2>
          <p className="mb-6 max-w-2xl text-base text-slate-700">
            축구화·마라톤화 맞춤 제작을 위한 SALTED 스마트 인솔 키트를{" "}
            <strong className="font-semibold text-[#2563EB]">1-2주</strong>{" "}
            동안 대여해 드립니다. 실제 훈련 환경에서 족저압 데이터를 축적해
            경기력과 부상 예방에 최적화된 인솔을 설계합니다.
          </p>

          <ul className="mb-8 grid gap-4 md:grid-cols-3">
            <li className="rounded-lg bg-white/70 p-4 text-sm text-slate-700 backdrop-blur">
              <strong className="block font-semibold text-[#0F172A]">
                1-2주 대여
              </strong>
              실제 훈련 루틴에서 측정
            </li>
            <li className="rounded-lg bg-white/70 p-4 text-sm text-slate-700 backdrop-blur">
              <strong className="block font-semibold text-[#0F172A]">
                SALTED 정밀 분석
              </strong>
              하중·COP·전족부 압력 포함
            </li>
            <li className="rounded-lg bg-white/70 p-4 text-sm text-slate-700 backdrop-blur">
              <strong className="block font-semibold text-[#0F172A]">
                맞춤 인솔 설계
              </strong>
              종목별 마감재/경도 최적화
            </li>
          </ul>

          <Button asChild size="lg">
            <Link href="/stores/gangnam?service=pickup#reservation-form">
              키트 대여 예약하기
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
