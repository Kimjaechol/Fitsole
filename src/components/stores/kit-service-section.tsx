import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * KitServiceSection — D-11 / OFFL-02.
 *
 * Explains the SALTED smart insole kit measurement service — the in-store
 * premium alternative to the phone-camera scan (Phase 2). Both health and
 * athlete segments are the target audience.
 */
export function KitServiceSection() {
  return (
    <section className="bg-slate-50 px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-3 text-2xl font-bold text-[#0F172A] md:text-3xl">
          스마트 인솔 키트 측정 서비스
        </h2>
        <p className="mb-8 max-w-2xl text-base text-slate-600">
          Phase 2-3에서 소개한 Moticon / SALTED 기반의 스마트 인솔 측정 키트를
          강남점 현장에서 직접 체험할 수 있습니다. 스마트폰 측정보다 한 단계
          정밀한 족저압 데이터를 확보합니다.
        </p>

        <ul className="mb-10 grid gap-6 md:grid-cols-3">
          <li className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-base font-semibold text-[#0F172A]">
              어떻게 측정하나요?
            </h3>
            <p className="text-sm text-slate-600">
              SALTED 인솔을 착용하고 약 5분간 자연스러운 보행 세션을 진행합니다.
              걸음 중 실제 하중 변화를 실시간으로 기록합니다.
            </p>
          </li>
          <li className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-base font-semibold text-[#0F172A]">
              무엇을 측정하나요?
            </h3>
            <p className="text-sm text-slate-600">
              랜딩 패턴, 압력 중심(COP) 궤적, 전/중/후족부 압력 분포를 분석해
              맞춤 인솔 설계에 필요한 데이터를 산출합니다.
            </p>
          </li>
          <li className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-base font-semibold text-[#0F172A]">
              누구에게 적합한가요?
            </h3>
            <p className="text-sm text-slate-600">
              평발·요족·족저근막염 등 발 건강 고민자, 그리고 장시간 훈련이
              필요한 운동선수에게 권장합니다.
            </p>
          </li>
        </ul>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/segment/health">발 건강 맞춤 추천 보기</Link>
          </Button>
          <Button asChild>
            <Link href="/segment/athlete">운동선수 프로그램 알아보기</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
