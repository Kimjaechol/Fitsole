import Link from "next/link";

import { ConditionCard } from "@/components/segment/condition-card";
import { Button } from "@/components/ui/button";

/**
 * /segment/health — Health segment landing page (Phase 06 D-04).
 *
 * Server component with four locked condition cards for 평발, 요족,
 * 무지외반, 족저근막염. Buttons route to the segment-prefiltered catalog
 * and the scanning flow.
 */

const CONDITIONS: Array<{ title: string; description: string }> = [
  {
    title: "평발 (Flat feet)",
    description:
      "아치 서포트가 강화된 인솔로 아치를 받쳐드립니다. 장시간 서 있어도 피로가 덜합니다.",
  },
  {
    title: "요족 (High arches)",
    description:
      "충격 흡수와 압력 분산에 중점을 둔 인솔. 발바닥의 국소 통증을 완화합니다.",
  },
  {
    title: "무지외반 (Hallux valgus)",
    description:
      "전족부 압력을 재분배하여 엄지 통증을 완화합니다. 신발 내부 압박을 줄여 드립니다.",
  },
  {
    title: "족저근막염 (Plantar fasciitis)",
    description:
      "뒤꿈치 쿠셔닝과 아치 지지로 기상 직후의 통증부터 완화해 드립니다.",
  },
];

export default function HealthSegmentPage() {
  return (
    <div className="px-5 py-10 md:px-10">
      <section className="mb-10 space-y-4">
        <h1 className="text-3xl font-semibold text-[#0F172A]">
          발 건강 고민이 있으신가요?
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-[#64748B]">
          FitSole은 조건별로 인솔을 다르게 설계합니다. 아래에서 내 상태와 가장
          가까운 항목을 확인하신 뒤 측정을 시작하시거나 조건에 맞는 신발을
          바로 보실 수 있습니다.
        </p>
      </section>

      <section className="mb-10">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {CONDITIONS.map((condition) => (
            <ConditionCard
              key={condition.title}
              title={condition.title}
              description={condition.description}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="bg-[#0F172A] text-white hover:bg-[#1E293B]">
          <Link href="/catalog?segment=health">
            이 조건에 맞는 신발 보기
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/scan">지금 측정 시작</Link>
        </Button>
      </section>
    </div>
  );
}
