import type { StoreInfo } from "@/lib/stores/constants";

/**
 * StoreHero — top section of the offline store page (D-11).
 *
 * Per CONTEXT.md "Claude's Discretion", we use an abstract gradient hero
 * instead of a real photo (store photo gallery is deferred). See
 * `.planning/phases/06-segmentation-support-offline-store/06-CONTEXT.md`.
 */
export function StoreHero({ info }: { info: StoreInfo }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#2563EB] via-[#4F46E5] to-[#7C3AED] px-4 py-16 text-white md:px-8 md:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-white/80">
          Offline Showroom
        </p>
        <h1 className="text-3xl font-bold leading-tight md:text-5xl">
          {info.name}
        </h1>
        <p className="mt-4 text-base text-white/90 md:text-lg">
          강남역 지하상가에서 SALTED 스마트 인솔 키트로 정밀 발 측정을 직접
          경험하세요.
        </p>
        <div
          className="mx-auto mt-10 flex h-32 w-full max-w-md items-center justify-center rounded-xl bg-white/10 text-5xl backdrop-blur-sm md:h-40"
          aria-hidden="true"
        >
          👟
        </div>
      </div>
    </section>
  );
}
