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
    id: "measurement-method",
    title: "측정 방법 (카메라 설치 가이드)",
    items: [
      {
        q: "측정은 총 몇 번 촬영해야 하나요?",
        a: (
          <div className="space-y-2">
            <p>정확한 측정을 위해 총 <strong>3번의 촬영</strong>이 필요합니다:</p>
            <ol className="ml-4 list-decimal space-y-1">
              <li><strong>발 360° 촬영</strong> (15-20초) — 3D 발 모델 생성</li>
              <li><strong>옆에서 걷기 촬영</strong> (10-15초) — 보폭과 아치 변화 측정</li>
              <li><strong>뒤에서 걷기 촬영</strong> (10-15초) — 회내/회외 정확도 측정</li>
            </ol>
            <p className="text-sm text-[#64748B]">
              옆과 뒤 두 각도에서 촬영하는 이유는 생체역학적으로 발이 <strong>3개의 평면</strong>에서 움직이기 때문입니다. 옆에서는 앞/뒤 움직임, 뒤에서는 좌/우 기울기를 측정합니다.
            </p>
          </div>
        ),
      },
      {
        q: "옆에서 걷는 영상은 어떻게 촬영하나요?",
        a: (
          <div className="space-y-3">
            <p className="font-medium">🎯 카메라 설정 (옆모습):</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>카메라 방향: <strong>가로 모드</strong></li>
              <li>카메라 높이: <strong>바닥에서 50cm (무릎 높이)</strong></li>
              <li>받침대: 의자, 작은 탁자 또는 책 쌓기</li>
              <li>카메라와 보행선 거리: <strong>옆으로 3m</strong></li>
              <li>카메라 수평 유지 (기울어지면 안 됨)</li>
            </ul>
            <p className="font-medium">🚶 걷는 방법:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>카메라 옆 3m 지점에 서서 시작</li>
              <li>카메라와 직각 방향(카메라 옆을 지나가며)으로 5-10걸음</li>
              <li>카메라를 쳐다보지 말고 전방 응시</li>
              <li>평소 속도로 자연스럽게</li>
            </ul>
            <p className="text-sm text-[#64748B]">
              측정 항목: 보폭, 발목 굽힘 각도, 아치 변형, 보행 주기
            </p>
          </div>
        ),
      },
      {
        q: "뒤에서 걷는 영상은 어떻게 촬영하나요?",
        a: (
          <div className="space-y-3">
            <p className="font-medium">🎯 카메라 설정 (뒷모습):</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>카메라 방향: <strong>세로 모드</strong></li>
              <li>카메라 높이: <strong>바닥에서 80cm (엉덩이 높이)</strong></li>
              <li>받침대: 옆모습 촬영 시 받침대 위에 책 추가로 쌓기</li>
              <li>사용자 시작점: <strong>카메라 앞 1m</strong></li>
              <li>카메라 수평 유지</li>
            </ul>
            <p className="font-medium">🚶 걷는 방법:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>카메라에 <strong>등지고</strong> 섬 (카메라가 뒷모습을 봄)</li>
              <li>카메라에서 <strong>멀어지는 방향</strong>으로 5-10걸음</li>
              <li>양팔을 자연스럽게 흔들며 걷기</li>
              <li>뒤돌아보지 말고 전방 응시</li>
            </ul>
            <p className="text-sm text-[#64748B]">
              측정 항목: 회내/회외 각도 (발이 안/바깥으로 기우는 정도), Q각도, 양쪽 다리 대칭성
            </p>
          </div>
        ),
      },
      {
        q: "촬영 공간과 복장은 어떻게 준비해야 하나요?",
        a: (
          <div className="space-y-2">
            <p className="font-medium">📏 공간:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>최소 직선 4m 이상 걸을 수 있는 공간</li>
              <li>측면에 3m 이상 여유 공간 (옆 촬영용)</li>
              <li>단색 배경 (흰 벽, 회색 벽) 권장</li>
              <li>균일한 조명 (역광 금지 — 창문 앞에 서지 마세요)</li>
              <li>평평한 바닥 (카펫/울퉁불퉁한 바닥 피하기)</li>
            </ul>
            <p className="mt-3 font-medium">👖 복장:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>무릎이 보이는 옷</strong> — 반바지 또는 레깅스 권장</li>
              <li>긴 바지 + 검은 양말은 AI 관절 감지 실패율이 높습니다</li>
              <li>맨발 또는 얇은 양말 (발 윤곽이 보여야 함)</li>
            </ul>
          </div>
        ),
      },
      {
        q: "촬영 시 흔한 실수는 무엇인가요?",
        a: (
          <div className="space-y-2">
            <p>다음 실수를 피해주세요:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>❌ 카메라를 손에 들고 촬영 → 흔들림으로 정확도 저하</li>
              <li>❌ 카메라를 바닥에 놓기 → 다리 전체가 안 보임</li>
              <li>❌ 트레드밀에서 촬영 → 바닥이 움직여 보폭 계산 불가</li>
              <li>❌ 카메라 쳐다보며 걷기 → 자세가 부자연스러움</li>
              <li>❌ 긴 바지 + 어두운 양말 → 관절 감지 실패</li>
              <li>❌ 역광 (창문 앞) → 실루엣만 보임</li>
              <li>❌ 3걸음만 걷기 → 데이터 부족</li>
              <li>❌ 걷다가 프레임 밖으로 이탈</li>
            </ul>
          </div>
        ),
      },
    ],
  },
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
        q: "왜 옆과 뒤 두 방향에서 보행을 촬영하나요?",
        a: "해부학적으로 발은 3개의 평면에서 움직입니다. 보폭과 아치 변화(시상면)는 옆에서, 회내/회외 기울기(관상면)는 뒤에서만 정확히 측정할 수 있습니다. 한 방향으로만 촬영하면 핵심 데이터의 절반이 누락됩니다.",
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
