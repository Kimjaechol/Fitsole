import Link from "next/link";

import {
  SEGMENT_DESCRIPTIONS,
  SEGMENT_LABELS,
  SEGMENT_VALUES,
  type Segment,
} from "@/lib/types/segment";

/**
 * /segment — segment hub (Phase 06 D-01).
 *
 * Server component. Links to the three locked segment landing pages and
 * surfaces a "바꾸기" affordance so returning users can switch context.
 */

const SEGMENT_ROUTES: Record<Segment, string> = {
  health: "/segment/health",
  general: "/segment/general",
  athlete: "/segment/athlete",
};

export default function SegmentIndexPage() {
  return (
    <div className="px-5 py-10 md:px-10">
      <header className="mb-8 space-y-3">
        <h1 className="text-3xl font-semibold text-[#0F172A]">
          나에게 맞는 FitSole 시작하기
        </h1>
        <p className="text-base text-[#64748B]">
          가장 가까운 항목을 선택하시면 맞춤 추천, 측정 가이드, 조건별
          솔루션을 바로 보여드립니다.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {SEGMENT_VALUES.map((segment) => (
          <Link
            key={segment}
            href={SEGMENT_ROUTES[segment]}
            className="rounded-xl border border-border bg-white p-6 transition hover:border-[#0F172A] hover:shadow-md"
          >
            <h2 className="mb-2 text-xl font-semibold text-[#0F172A]">
              {SEGMENT_LABELS[segment]}
            </h2>
            <p className="text-sm leading-relaxed text-[#64748B]">
              {SEGMENT_DESCRIPTIONS[segment]}
            </p>
          </Link>
        ))}
      </div>

      <footer className="mt-10 text-sm text-[#64748B]">
        잘못 선택하셨나요?{" "}
        <Link href="/segment" className="underline">
          언제든 바꾸기
        </Link>
      </footer>
    </div>
  );
}
