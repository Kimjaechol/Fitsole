import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * /segment/athlete — Athlete segment landing (Phase 06 D-05).
 *
 * Performance hero + SALTED smart insole kit rental section + catalog /
 * scan CTAs (walking-video emphasis per D-05).
 */
export default function AthleteSegmentPage() {
  return (
    <div className="px-5 py-10 md:px-10">
      <section className="mb-10 space-y-4">
        <h1 className="text-3xl font-semibold text-[#0F172A]">
          기록은 발에서 시작됩니다
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-[#64748B]">
          마라톤, 축구, 러닝 — 당신의 퍼포먼스는 인솔 한 장 차이로 달라집니다.
          FitSole은 운동선수의 발 형태와 보행 패턴을 동시에 분석해 고강도
          환경에 최적화된 인솔을 설계합니다.
        </p>
      </section>

      <section className="mb-10 rounded-2xl border border-border bg-[#F8FAFC] p-6">
        <h2 className="mb-3 text-2xl font-semibold text-[#0F172A]">
          SALTED 스마트 인솔 키트 대여 프로그램
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-[#64748B]">
          정밀 측정이 필요한 운동선수를 위해 FitSole은 SALTED smart insole kit
          을 1~2주간 대여해 드립니다. 실제 훈련·경기 환경에서 수집한 압력
          데이터를 기반으로 인솔을 설계하기 때문에, 랩 측정만으로는 잡히지
          않는 동적 하중 패턴까지 반영할 수 있습니다.
        </p>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-[#64748B]">
          <li>1~2주 동안 실제 훈련 · 경기에서 smart insole kit 을 착용</li>
          <li>보행 · 러닝 구간별 족저압 데이터를 자동 수집</li>
          <li>수집 데이터를 바탕으로 전담 엔지니어가 인솔을 재설계</li>
        </ul>
        <Button asChild variant="outline">
          <Link href="/stores/gangnam#kit-rental">
            SALTED 키트 대여 자세히 보기
          </Link>
        </Button>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="bg-[#0F172A] text-white hover:bg-[#1E293B]">
          <Link href="/catalog?segment=athlete">
            운동선수용 신발 보기
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/scan">보행 영상 측정 시작</Link>
        </Button>
      </section>
    </div>
  );
}
