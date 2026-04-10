"use client";

import { useCallback, useMemo, useState, useTransition, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, X, RotateCcw } from "lucide-react";
import type { OrderStatus } from "@/lib/types/order";
import { ORDER_STATUS_LABELS } from "@/lib/types/order";

const STATUS_OPTIONS: Array<{ value: "" | OrderStatus; label: string }> = [
  { value: "", label: "전체" },
  { value: "paid", label: ORDER_STATUS_LABELS.paid },
  { value: "designing", label: ORDER_STATUS_LABELS.designing },
  { value: "manufacturing", label: ORDER_STATUS_LABELS.manufacturing },
  { value: "shipping", label: ORDER_STATUS_LABELS.shipping },
  { value: "delivered", label: ORDER_STATUS_LABELS.delivered },
  { value: "cancelled", label: ORDER_STATUS_LABELS.cancelled },
];

const LINE_OPTIONS: Array<{ value: "" | "general" | "professional"; label: string }> = [
  { value: "", label: "전체" },
  { value: "general", label: "카메라 측정 (Line 1)" },
  { value: "professional", label: "SALTED 정밀 (Line 2)" },
];

/**
 * Admin order filters — stores filter state in URL searchParams so the
 * server component can refetch with the correct query string.
 *
 * Pattern follows Phase 3 product catalog filter convention.
 */
export function OrderFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local form state hydrated from URL so the inputs reflect applied filters.
  const initialStatus = (searchParams.get("status") ?? "") as "" | OrderStatus;
  const initialDateFrom = searchParams.get("dateFrom") ?? "";
  const initialDateTo = searchParams.get("dateTo") ?? "";
  const initialSearch = searchParams.get("search") ?? "";
  const initialLineType = (searchParams.get("lineType") ?? "") as
    | ""
    | "general"
    | "professional";

  const [status, setStatus] = useState<"" | OrderStatus>(initialStatus);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [search, setSearch] = useState(initialSearch);
  const [lineType, setLineType] = useState<"" | "general" | "professional">(
    initialLineType
  );

  // Keep local state in sync if URL changes externally (e.g., reset).
  useEffect(() => {
    setStatus((searchParams.get("status") ?? "") as "" | OrderStatus);
    setDateFrom(searchParams.get("dateFrom") ?? "");
    setDateTo(searchParams.get("dateTo") ?? "");
    setSearch(searchParams.get("search") ?? "");
    setLineType(
      (searchParams.get("lineType") ?? "") as "" | "general" | "professional"
    );
  }, [searchParams]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (status) count += 1;
    if (dateFrom) count += 1;
    if (dateTo) count += 1;
    if (search) count += 1;
    if (lineType) count += 1;
    return count;
  }, [status, dateFrom, dateTo, search, lineType]);

  const applyFilters = useCallback(
    (next: {
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      lineType?: string;
    }) => {
      const params = new URLSearchParams();
      if (next.status) params.set("status", next.status);
      if (next.dateFrom) params.set("dateFrom", next.dateFrom);
      if (next.dateTo) params.set("dateTo", next.dateTo);
      if (next.search) params.set("search", next.search);
      if (next.lineType) params.set("lineType", next.lineType);

      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({
      status,
      dateFrom,
      dateTo,
      search: search.trim(),
      lineType,
    });
  };

  const handleReset = () => {
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setLineType("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        {/* Status */}
        <div className="space-y-1.5">
          <Label htmlFor="filter-status" className="text-xs text-slate-600">
            상태
          </Label>
          <select
            id="filter-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as "" | OrderStatus)}
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div className="space-y-1.5">
          <Label htmlFor="filter-date-from" className="text-xs text-slate-600">
            시작일
          </Label>
          <Input
            id="filter-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            max={dateTo || undefined}
          />
        </div>

        {/* Date to */}
        <div className="space-y-1.5">
          <Label htmlFor="filter-date-to" className="text-xs text-slate-600">
            종료일
          </Label>
          <Input
            id="filter-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom || undefined}
          />
        </div>

        {/* Line type */}
        <div className="space-y-1.5">
          <Label htmlFor="filter-line" className="text-xs text-slate-600">
            설계 유형
          </Label>
          <select
            id="filter-line"
            value={lineType}
            onChange={(e) =>
              setLineType(e.target.value as "" | "general" | "professional")
            }
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
          >
            {LINE_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="space-y-1.5">
          <Label htmlFor="filter-search" className="text-xs text-slate-600">
            고객 검색
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="filter-search"
              type="text"
              placeholder="이름 또는 이메일"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="검색어 지우기"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {activeFilterCount > 0
            ? `적용된 필터 ${activeFilterCount}개`
            : "필터가 적용되지 않았습니다."}
        </p>
        <div className="flex gap-2">
          {activeFilterCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isPending}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              초기화
            </Button>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "적용 중..." : "필터 적용"}
          </Button>
        </div>
      </div>
    </form>
  );
}
