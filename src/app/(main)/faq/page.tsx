import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * FAQ page (D-07, SUPP-01).
 *
 * 5 required sections: 측정 정확도, 배송, 반품/교환, 맞춤 인솔, 오프라인 매장.
 * Content is boilerplate Korean text (per CONTEXT.md "Claude's Discretion").
 */

interface QA {
  q: string;
  a: React.ReactNode;
}

interface Section {
  id: string;
  title: string;
  items: QA[];
}

const SECTIONS: Section[] = [
  {
    id: "accuracy",
    title: "측정 정확도",
    items: [
      {
        q: "FitSole 측정은 얼마나 정확한가요?",
        a: "스마트폰 동영상 기반 SfM(Structure-from-Motion) 분석을 통해 ±0.15mm 수준의 정밀도를 제공합니다. 기존 사진 기반 측정(±0.95mm) 대비 약 6배 정확합니다.",
      },
      {
        q: "측정할 때 왜 A4 용지가 필요한가요?",
        a: "A4 용지의 국제 표준 크기(210×297mm)를 기준 스케일로 사용해 실제 발 치수를 정확히 환산합니다. 첫 5프레임의 중앙값을 취해 노이즈를 제거합니다.",
      },
      {
        q: "스캔 품질 점수는 무엇인가요?",
        a: "촬영 각도, 조명, 손떨림 등을 종합 평가한 0-100 점수입니다. 80점 이상에서 안정적인 결과가 나오며, 낮을 경우 재촬영을 안내합니다.",
      },
    ],
  },
  {
    id: "shipping",
    title: "배송",
    items: [
      {
        q: "제작 기간은 얼마나 걸리나요?",
        a: "주문 확정 후 평균 2-3주가 소요됩니다. 인솔 설계(1-2일) → 제작(1-2주) → 배송(2-3일) 순으로 진행됩니다.",
      },
      {
        q: "배송비는 얼마인가요?",
        a: "50,000원 이상 주문 시 무료 배송입니다. 이하 주문은 택배비 3,000원이 부과됩니다.",
      },
      {
        q: "해외 배송도 가능한가요?",
        a: "현재는 국내 배송만 지원합니다. 해외 배송은 추후 도입 예정입니다.",
      },
    ],
  },
  {
    id: "returns",
    title: "반품/교환",
    items: [
      {
        q: "맞춤 인솔도 반품이 가능한가요?",
        a: (
          <>
            네, FitSole은 <Link href="/guarantee" className="text-[#2563EB] hover:underline">90일 만족 보장</Link> 정책을 제공합니다. 착용 후 불편함이 있다면 90일 이내 무료 재제작 또는 환불이 가능합니다.
          </>
        ),
      },
      {
        q: "교환 신청은 어떻게 하나요?",
        a: (
          <>
            <Link href="/support" className="text-[#2563EB] hover:underline">문의하기</Link> 페이지에서 주문번호와 함께 교환 사유를 작성해 주시면 1-2 영업일 내 연락드립니다.
          </>
        ),
      },
      {
        q: "재제작이 필요한 경우 비용이 드나요?",
        a: (
          <>
            품질 이슈 및 착용감 문제로 인한 재제작은 무료입니다. 자세한 조건은 <Link href="/remake-policy" className="text-[#2563EB] hover:underline">재제작 정책</Link>을 확인해 주세요.
          </>
        ),
      },
    ],
  },
  {
    id: "insoles",
    title: "맞춤 인솔",
    items: [
      {
        q: "Varioshore TPU는 어떤 소재인가요?",
        a: "독일 BASF에서 개발한 열가소성 폴리우레탄 폼으로, 온도 조절을 통해 같은 소재에서 다양한 경도(Shore A)를 구현할 수 있습니다. 가볍고 내구성이 뛰어납니다.",
      },
      {
        q: "영역별 경도가 왜 다른가요?",
        a: "발의 해부학적 특성에 따라 힐컵은 단단하게(지지), 중족부는 중간(충격 흡수), 전족부는 부드럽게(편안함) 설계됩니다. 사용자의 압력 분포에 맞춰 조정됩니다.",
      },
      {
        q: "Line 1과 Line 2의 차이점은 무엇인가요?",
        a: "Line 1은 일반 소비자용 표준 설계이며, Line 2는 운동선수/족부 질환자용 정밀 설계입니다. Line 2는 스마트 인솔 키트로 족저압 분포까지 측정해 제작합니다.",
      },
    ],
  },
  {
    id: "offline",
    title: "오프라인 매장",
    items: [
      {
        q: "오프라인 매장은 어디에 있나요?",
        a: (
          <>
            강남역 지하상가 내 FitSole 쇼룸에서 현장 측정 및 상담이 가능합니다. 자세한 위치는 <Link href="/stores/gangnam" className="text-[#2563EB] hover:underline">강남역 매장 페이지</Link>에서 확인해 주세요.
          </>
        ),
      },
      {
        q: "스마트 인솔 키트는 어떤 서비스인가요?",
        a: "실제 족저압 센서를 내장한 정밀 측정 기기로, 보행 중 하중 분포를 분석합니다. 운동선수 및 족부 질환자에게 권장되며, 오프라인 매장에서만 이용 가능합니다.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] md:text-4xl">
          자주 묻는 질문
        </h1>
        <p className="mt-3 text-base text-[#64748B]">
          FitSole 이용 중 궁금한 점을 모아두었습니다. 답변을 찾지 못하셨다면{" "}
          <Link href="/support" className="text-[#2563EB] hover:underline">
            문의하기
          </Link>
          를 이용해 주세요.
        </p>
      </header>

      <div className="space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.id}>
            <h2 className="mb-3 text-xl font-semibold text-[#0F172A]">
              {section.title}
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {section.items.map((item, idx) => (
                <AccordionItem
                  key={`${section.id}-${idx}`}
                  value={`${section.id}-${idx}`}
                >
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>
    </div>
  );
}
