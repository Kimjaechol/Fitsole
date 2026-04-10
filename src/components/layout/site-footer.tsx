import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * Site-wide footer rendered on all (main) routes.
 *
 * Requirements:
 * - D-09: prominently surfaces "90일 만족 보장" with link to /guarantee
 * - SUPP-03: guarantee badge visible on landing page footer
 * - Navigation row to /faq, /guarantee, /remake-policy, /support, /stores/gangnam
 */

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/faq", label: "자주 묻는 질문" },
  { href: "/guarantee", label: "90일 만족 보장" },
  { href: "/remake-policy", label: "무료 재제작 정책" },
  { href: "/support", label: "문의하기" },
  { href: "/stores/gangnam", label: "강남역 매장" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[#E2E8F0] bg-[#F8FAFC]">
      {/* Guarantee badge row (D-09 — must be visible on landing) */}
      <div className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-3 px-4 py-5 md:flex-row md:px-6">
          <Link
            href="/guarantee"
            className="inline-flex items-center gap-2 text-[#0F172A] transition-colors hover:text-[#2563EB]"
          >
            <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
            <span className="text-base font-semibold">90일 만족 보장</span>
            <span className="hidden text-sm text-[#64748B] md:inline">
              · 착용 불만족 시 무료 재제작 또는 환불
            </span>
          </Link>
          <Link
            href="/guarantee"
            className="text-sm font-medium text-[#2563EB] hover:underline"
          >
            자세히 보기 →
          </Link>
        </div>
      </div>

      {/* Navigation + company info */}
      <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-lg font-bold text-[#0F172A]">FitSole</p>
            <p className="mt-2 max-w-xs text-sm text-[#64748B] leading-relaxed">
              스마트폰 하나로 시작하는 과학적 맞춤 인솔. 당신의 발에 꼭 맞는
              인솔을 설계합니다.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <ul className="flex flex-col gap-2 text-sm md:flex-row md:gap-6">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[#475569] hover:text-[#0F172A] hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 border-t border-[#E2E8F0] pt-6 text-xs text-[#94A3B8] leading-relaxed">
          <p>© {new Date().getFullYear()} FitSole. All rights reserved.</p>
          <p className="mt-1">
            고객센터: support@fitsole.kr · 평일 10:00 - 18:00 (공휴일 제외)
          </p>
        </div>
      </div>
    </footer>
  );
}
