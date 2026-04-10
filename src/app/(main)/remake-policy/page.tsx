import Link from "next/link";

/**
 * Free remake policy page (D-10).
 */

const STEPS = [
  {
    num: "1",
    title: "문의 접수",
    body: "주문번호와 불편 사항을 접수하시면 담당자가 배정됩니다.",
  },
  {
    num: "2",
    title: "원인 분석",
    body: "측정 데이터와 설계 파라미터를 재검토하여 원인을 파악합니다.",
  },
  {
    num: "3",
    title: "재제작",
    body: "조정된 설계로 공장에 재제작을 의뢰합니다. 비용은 전액 FitSole이 부담합니다.",
  },
  {
    num: "4",
    title: "배송",
    body: "완성된 인솔을 안전하게 배송해 드립니다. 기존 제품 회수는 필요 없습니다.",
  },
];

export default function RemakePolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] md:text-4xl">
          무료 재제작 정책
        </h1>
        <p className="mt-3 text-base text-[#64748B]">
          FitSole의{" "}
          <Link href="/guarantee" className="text-[#2563EB] hover:underline">
            90일 만족 보장
          </Link>{" "}
          정책의 일환으로, 품질 및 착용감 이슈에 대해 무료 재제작을 제공합니다.
        </p>
      </header>

      <div className="space-y-10">
        <section>
          <h2 className="mb-3 text-2xl font-semibold text-[#0F172A]">
            재제작 조건
          </h2>
          <ul className="list-inside list-disc space-y-2 text-[#475569]">
            <li>수령일로부터 90일 이내</li>
            <li>일반적인 사용 범위 내 발생한 불편</li>
            <li>측정/설계/제작 단계의 품질 이슈</li>
            <li>사이즈·아치·힐컵 등 주요 설계 요소의 부적합</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[#0F172A]">
            재제작 프로세스
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="rounded-xl border border-[#E2E8F0] bg-white p-5"
              >
                <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-sm font-bold text-white">
                  {step.num}
                </div>
                <h3 className="mb-1 text-base font-semibold text-[#0F172A]">
                  {step.title}
                </h3>
                <p className="text-sm text-[#475569]">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-[#0F172A]">
            재제작 기간
          </h2>
          <p className="text-base text-[#475569] leading-relaxed">
            전체 프로세스는 접수 후 평균 2-3주가 소요됩니다. 긴급한 경우 고객 지원팀으로
            별도 문의해 주세요.
          </p>
        </section>

        <section className="rounded-xl bg-[#F8FAFC] p-6 md:p-8">
          <h2 className="mb-2 text-xl font-semibold text-[#0F172A]">
            재제작이 필요하신가요?
          </h2>
          <p className="mb-4 text-[#64748B]">
            문의하기 페이지에서 간단히 접수하실 수 있습니다.
          </p>
          <Link
            href="/support"
            className="inline-flex items-center rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]/90"
          >
            재제작 문의하기
          </Link>
        </section>
      </div>
    </div>
  );
}
