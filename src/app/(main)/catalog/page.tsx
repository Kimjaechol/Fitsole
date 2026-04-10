import Link from "next/link";

import {
  SEGMENT_LABELS,
  SEGMENT_TO_CATEGORIES,
  isSegment,
  type Segment,
} from "@/lib/types/segment";

/**
 * /catalog — Product catalog (Phase 06 D-06 segment-aware pre-filter).
 *
 * Phase 06 scope: we do NOT touch the Payload product query (that work
 * happens in a later phase). What we DO ship here:
 * 1. Typed `searchParams` that accept `segment` alongside existing params.
 * 2. `isSegment()` validation — unknown values are silently ignored
 *    (T-06-03: no injection surface, no partial match).
 * 3. A dismissible "{SEGMENT_LABEL} 추천 필터 적용됨" badge at the top of the
 *    page with a link that removes `?segment=` while preserving other params.
 * 4. A derived `activeCategories` list that downstream Payload integration
 *    can union with the user-selected `category` param.
 *
 * Because the existing page was a stub, the "no regression" guarantee is:
 * when no segment param is present, the page renders the same "준비 중"
 * placeholder it did before.
 */

type CatalogSearchParams = {
  segment?: string;
  category?: string | string[];
};

type CatalogPageProps = {
  searchParams?: CatalogSearchParams | Promise<CatalogSearchParams>;
};

function buildRemoveSegmentHref(params: CatalogSearchParams): string {
  const search = new URLSearchParams();
  if (params.category) {
    const categories = Array.isArray(params.category)
      ? params.category
      : [params.category];
    for (const c of categories) search.append("category", c);
  }
  const qs = search.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

function resolveActiveCategories(
  segment: Segment | null,
  params: CatalogSearchParams
): string[] {
  const base = segment ? SEGMENT_TO_CATEGORIES[segment] : [];
  const explicit = params.category
    ? Array.isArray(params.category)
      ? params.category
      : [params.category]
    : [];
  // Union (additive) so explicit categories are preserved alongside segment
  // defaults per D-06 plan note.
  return Array.from(new Set([...base, ...explicit]));
}

export default async function CatalogPage({
  searchParams,
}: CatalogPageProps) {
  const resolved: CatalogSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const segment: Segment | null = isSegment(resolved.segment)
    ? resolved.segment
    : null;

  const activeCategories = resolveActiveCategories(segment, resolved);

  return (
    <div className="flex min-h-[50vh] flex-col">
      {segment && (
        <div
          className="mx-5 mt-5 flex items-center justify-between gap-4 rounded-lg border border-[#0F172A]/10 bg-[#F1F5F9] px-4 py-3 text-sm text-[#0F172A] md:mx-10"
          data-testid="segment-filter-badge"
        >
          <span>
            <strong className="font-semibold">
              {SEGMENT_LABELS[segment]}
            </strong>{" "}
            추천 필터 적용됨
            {activeCategories.length > 0 && (
              <>
                {" "}
                · 카테고리:{" "}
                <span className="text-[#64748B]">
                  {activeCategories.join(", ")}
                </span>
              </>
            )}
          </span>
          <Link
            href={buildRemoveSegmentHref(resolved)}
            className="text-xs underline"
            data-testid="segment-filter-remove"
          >
            필터 해제
          </Link>
        </div>
      )}

      <div className="flex flex-1 items-center justify-center">
        <p className="text-lg text-[#64748B]">상품 카탈로그 (준비 중)</p>
      </div>
    </div>
  );
}
