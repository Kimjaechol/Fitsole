import Link from "next/link";

/**
 * 90-day satisfaction guarantee page (D-09, SUPP-03).
 */

export default function GuaranteePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      {/* Hero */}
      <section className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center rounded-full bg-[#2563EB]/10 px-4 py-1.5 text-sm font-semibold text-[#2563EB]">
          FitSole 품질 약속
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-[#0F172A] md:text-5xl">
          90일 만족 보장
        </h1>
        <p className="mt-4 text-lg text-[#64748B]">
          내 발에 완벽하게 맞을 때까지, 책임지고 함께합니다.
        </p>
      </section>

      <div className="space-y-10">
        <section>
          <h2 className="mb-3 text-2xl font-semibold text-[#0F172A]">
            보장 범위
          </h2>
          <p className="text-base text-[#475569] leading-relaxed">
            제품 수령일로부터 90일 이내, 맞춤 인솔 착용 중 불편함이나 품질 이슈가
            발생한 경우 FitSole은 전액 환불 또는 무료 재제작을 약속합니다. 일반적인
            사용에 따른 자연스러운 마모는 보장 대상이 아닙니다.
          </p>
          <ul className="mt-4 list-inside list-disc space-y-2 text-[#475569]">
            <li>착용감이 설계와 현저히 다른 경우</li>
            <li>제작 과정의 품질 결함</li>
            <li>측정/설계 오류로 인한 사이즈 부적합</li>
            <li>사용 중 내구성 문제 (정상 사용 범위)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-[#0F172A]">
            신청 방법
          </h2>
          <ol className="space-y-3 text-[#475569]">
            <li>
              <strong className="text-[#0F172A]">1. 문의하기</strong> —{" "}
              <Link href="/support" className="text-[#2563EB] hover:underline">
                /support
              </Link>{" "}
              페이지에서 주문번호와 함께 불편 사항을 작성합니다.
            </li>
            <li>
              <strong className="text-[#0F172A]">2. 원인 분석</strong> — FitSole
              설계팀이 측정 데이터와 설계 파라미터를 재검토합니다.
            </li>
            <li>
              <strong className="text-[#0F172A]">3. 재제작 또는 환불</strong> —
              고객이 원하는 방식으로 해결합니다. 재제작은 무료로 진행됩니다.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-[#0F172A]">
            무료 재제작 안내
          </h2>
          <p className="text-base text-[#475569] leading-relaxed">
            재제작은 추가 측정, 설계 조정, 공장 제작, 배송까지 모두 무료로 진행됩니다.
            자세한 프로세스는{" "}
            <Link
              href="/remake-policy"
              className="text-[#2563EB] hover:underline"
            >
              재제작 정책
            </Link>
            을 확인해 주세요.
          </p>
        </section>

        <section className="rounded-xl bg-[#F8FAFC] p-6 md:p-8">
          <h2 className="mb-2 text-xl font-semibold text-[#0F172A]">
            문의가 있으신가요?
          </h2>
          <p className="mb-4 text-[#64748B]">
            FitSole 고객 지원팀이 1-2 영업일 내 답변드립니다.
          </p>
          <Link
            href="/support"
            className="inline-flex items-center rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]/90"
          >
            문의하기
          </Link>
        </section>
      </div>
    </div>
  );
}
