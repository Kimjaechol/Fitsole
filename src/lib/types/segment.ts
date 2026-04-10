/**
 * Customer segmentation contracts (Phase 06 D-01/D-02/D-03/D-06).
 *
 * Three primary segments drive landing experiences, scanning guidance, and
 * catalog pre-filtering. Stored as nullable text in users.segment (DB) for
 * authenticated users and in localStorage (`fitsole_segment`) for guests.
 */

export const SEGMENT_VALUES = ["health", "general", "athlete"] as const;
export type Segment = (typeof SEGMENT_VALUES)[number];

export const SEGMENT_LABELS: Record<Segment, string> = {
  health: "발 건강 고민",
  general: "일반 소비자",
  athlete: "운동선수",
};

export const SEGMENT_DESCRIPTIONS: Record<Segment, string> = {
  health: "평발, 요족, 무지외반, 족저근막염 등 발 건강 고민이 있으신 분",
  general: "편안함과 일상 착용감을 중시하는 일반 소비자",
  athlete: "성능과 정밀 측정이 필요한 운동선수 · 러너",
};

/**
 * Segment → Payload category slug mapping (D-03, D-06).
 *
 * Aligned with the Phase 3 Payload `categories` collection (see
 * src/payload/collections/Categories.ts). The Payload seed uses four Korean
 * top-level categories — 운동화 / 구두 / 부츠 / 샌들. Until the real product
 * taxonomy is expanded with running / walking / sports / casual subcategories,
 * we map each segment to the closest existing top-level slug so the catalog
 * filter still yields a meaningful pre-filtered result set rather than an
 * empty page.
 *
 * health   → 운동화 (cushioning + support shoes, closest match for health)
 * general  → 구두, 샌들 (casual / comfort daily wear)
 * athlete  → 운동화 (performance athletic footwear)
 *
 * TODO: once the Payload categories collection is expanded with
 * running/walking/sports/casual sub-slugs, update this map to the richer
 * mapping from the plan (health → running,walking; general → casual,sneakers;
 * athlete → running,sports).
 */
export const SEGMENT_TO_CATEGORIES: Record<Segment, string[]> = {
  health: ["운동화"],
  general: ["구두", "샌들"],
  athlete: ["운동화"],
};

/** Type guard to validate an untrusted value is a known Segment. */
export function isSegment(value: unknown): value is Segment {
  return (
    typeof value === "string" &&
    (SEGMENT_VALUES as readonly string[]).includes(value)
  );
}
