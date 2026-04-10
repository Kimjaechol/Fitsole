/**
 * Offline store constants (Phase 06 Plan 03, D-12).
 *
 * The 강남역 지하상가 location is seed data — the actual unit number is TBD
 * and will be updated post launch. Kept as a plain constant (no CMS) so the
 * store page can be fully statically rendered.
 */

export interface StoreInfo {
  slug: string;
  name: string;
  address: string;
  addressDetail: string;
  hours: { weekday: string; weekend: string };
  phone: string;
  lat: number;
  lng: number;
}

export const STORE_GANGNAM: StoreInfo = {
  slug: "gangnam",
  name: "FitSole 강남점",
  address: "서울특별시 강남구 강남역 지하상가",
  addressDetail: "상가 번호는 실제 입점 후 업데이트 예정",
  hours: { weekday: "평일 10:00-21:00", weekend: "주말 10:00-20:00" },
  phone: "02-XXX-XXXX",
  lat: 37.497942, // 강남역 approximate
  lng: 127.027621,
};

/**
 * Build a Kakao Maps static-image URL for the given store.
 *
 * Returns null when `KAKAO_MAP_KEY` env var is not set, so callers can
 * fall back to a plain address card without a key provisioned (D-13).
 *
 * The key is a client-safe Kakao REST/JS key restricted by referer in the
 * Kakao dashboard — see threat register T-06-13 for why this is accepted.
 */
export function getKakaoStaticMapUrl(
  info: StoreInfo,
  width = 600,
  height = 400
): string | null {
  const key = process.env.KAKAO_MAP_KEY;
  if (!key) return null;

  const params = new URLSearchParams({
    appkey: key,
    center: `${info.lat},${info.lng}`,
    level: "3",
    w: String(width),
    h: String(height),
    markers: `type:d|pos:${info.lng} ${info.lat}`,
  });
  return `https://dapi.kakao.com/v2/maps/staticmap?${params.toString()}`;
}
