import Link from "next/link";
import { ContactForm } from "@/components/support/contact-form";

/**
 * Support / contact page (D-08, SUPP-02).
 */

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] md:text-4xl">
          문의하기
        </h1>
        <p className="mt-3 text-base text-[#64748B] leading-relaxed">
          제품, 측정, 재제작 등 궁금한 점이 있으시면 아래 양식을 통해 문의해 주세요.
          FitSole 고객 지원팀이 <strong>1-2 영업일 내</strong> 답변드립니다.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-[#E2E8F0] bg-white p-6 md:p-8">
        <ContactForm />
      </section>

      <section className="rounded-xl bg-[#F8FAFC] p-6 md:p-8">
        <h2 className="mb-3 text-lg font-semibold text-[#0F172A]">
          다른 방법으로 문의하기
        </h2>
        <div className="space-y-2 text-sm text-[#475569]">
          <p>
            <strong className="text-[#0F172A]">이메일:</strong>{" "}
            <a
              href="mailto:support@fitsole.kr"
              className="text-[#2563EB] hover:underline"
            >
              support@fitsole.kr
            </a>
          </p>
          <p>
            <strong className="text-[#0F172A]">자주 묻는 질문:</strong>{" "}
            <Link href="/faq" className="text-[#2563EB] hover:underline">
              FAQ 페이지에서 빠른 답변 찾기
            </Link>
          </p>
          <p>
            <strong className="text-[#0F172A]">운영 시간:</strong> 평일 10:00 - 18:00
            (공휴일 제외)
          </p>
        </div>
      </section>
    </div>
  );
}
