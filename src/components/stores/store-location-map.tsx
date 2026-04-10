import { getKakaoStaticMapUrl, type StoreInfo } from "@/lib/stores/constants";

/**
 * StoreLocationMap — D-13.
 *
 * Uses Kakao static map image when KAKAO_MAP_KEY is provisioned; otherwise
 * falls back to a bordered address card with "지도 준비 중" text. This keeps
 * the page useful in preview/dev environments without a Kakao key.
 *
 * NOTE: Uses native <img> instead of next/image because we do not want to
 * add dapi.kakao.com to next.config remotePatterns just for one tile. The
 * ESLint rule disable is scoped to the single element.
 */
export function StoreLocationMap({ info }: { info: StoreInfo }) {
  const src = getKakaoStaticMapUrl(info);

  if (src) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`${info.name} 위치 지도 - ${info.address}`}
          width={600}
          height={400}
          className="h-auto w-full"
        />
      </div>
    );
  }

  return (
    <div className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="text-sm font-semibold text-slate-700">지도 준비 중</p>
      <p className="text-sm text-slate-600">{info.address}</p>
      <p className="text-xs text-slate-500">{info.addressDetail}</p>
    </div>
  );
}
