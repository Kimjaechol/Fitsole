import type { StoreInfo } from "@/lib/stores/constants";
import { StoreLocationMap } from "@/components/stores/store-location-map";

/**
 * StoreInfoSection — D-12 (address, hours, phone) + D-13 (map).
 *
 * Two-column on desktop (info + map), stacked on mobile.
 */
export function StoreInfoSection({ info }: { info: StoreInfo }) {
  return (
    <section className="px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-2xl font-bold text-[#0F172A] md:text-3xl">
          위치 안내
        </h2>

        <div className="grid gap-8 md:grid-cols-2">
          <dl className="space-y-6 text-sm md:text-base">
            <div>
              <dt className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                주소
              </dt>
              <dd className="text-slate-900">{info.address}</dd>
              <dd className="mt-1 text-xs text-slate-500">
                {info.addressDetail}
              </dd>
            </div>

            <div>
              <dt className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                운영시간
              </dt>
              <dd className="text-slate-900">{info.hours.weekday}</dd>
              <dd className="text-slate-900">{info.hours.weekend}</dd>
            </div>

            <div>
              <dt className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                전화
              </dt>
              <dd className="text-slate-900">{info.phone}</dd>
            </div>
          </dl>

          <StoreLocationMap info={info} />
        </div>
      </div>
    </section>
  );
}
