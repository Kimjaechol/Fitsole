import type { Metadata } from "next";
import Link from "next/link";
import { STORE_GANGNAM } from "@/lib/stores/constants";
import { StoreHero } from "@/components/stores/store-hero";
import { StoreInfoSection } from "@/components/stores/store-info-section";
import { KitServiceSection } from "@/components/stores/kit-service-section";
import { KitRentalSection } from "@/components/stores/kit-rental-section";
import { PublicReservationForm } from "@/components/stores/public-reservation-form";

/**
 * /stores/gangnam — Offline store page (Phase 06 Plan 03).
 *
 * Implements D-11 (page composition), D-12 (store info), D-13 (Kakao map),
 * D-14 (reservation form), D-15 (kit rental info).
 *
 * Section order per D-11: Hero → Info/Map → Kit Service → Reservation Form
 * → Kit Rental → FAQ link back to /faq#offline.
 *
 * Covers OFFL-01 (store intro), OFFL-02 (kit service), OFFL-03 (location +
 * hours + reservation), OFFL-04 (athlete kit rental).
 */

export const metadata: Metadata = {
  title: "FitSole 강남점 | SALTED 스마트 인솔 측정",
  description:
    "강남역 지하상가의 FitSole 쇼룸. SALTED 기반 스마트 인솔 키트 현장 측정과 운동선수 키트 대여 프로그램을 제공합니다.",
};

export default function GangnamStorePage() {
  return (
    <div className="flex flex-col">
      <StoreHero info={STORE_GANGNAM} />
      <StoreInfoSection info={STORE_GANGNAM} />
      <KitServiceSection />
      <PublicReservationForm />
      <KitRentalSection />

      <section className="bg-slate-50 px-4 py-10 md:px-8">
        <div className="mx-auto max-w-5xl text-center text-sm text-slate-600">
          자주 묻는 질문이 있으신가요?{" "}
          <Link
            href="/faq#offline"
            className="font-medium text-[#2563EB] hover:underline"
          >
            오프라인 매장 FAQ 보기
          </Link>
        </div>
      </section>
    </div>
  );
}
