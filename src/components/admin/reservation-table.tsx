"use client";

/**
 * ReservationTable — admin table for offline store reservations.
 *
 * Row actions:
 *   - pending   → 확인 (confirm), 취소 (cancel)
 *   - confirmed → 완료 (complete), 취소 (cancel)
 *   - completed → (no actions)
 *   - cancelled → (no actions)
 *
 * Filter state (status + date range) is stored in URL searchParams so the
 * server component can refetch with the correct query string, matching the
 * OrderFilters pattern.
 */

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  AdminReservation,
  ReservationStatus,
  ServiceType,
} from "@/app/api/admin/reservations/route";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  measurement: "발 측정",
  consultation: "상담",
  pickup: "수령",
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "대기",
  confirmed: "확인됨",
  completed: "완료",
  cancelled: "취소",
};

const STATUS_BADGE_CLASSES: Record<ReservationStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_FILTER_OPTIONS: Array<{ value: "" | ReservationStatus; label: string }> = [
  { value: "", label: "전체" },
  { value: "pending", label: STATUS_LABELS.pending },
  { value: "confirmed", label: STATUS_LABELS.confirmed },
  { value: "completed", label: STATUS_LABELS.completed },
  { value: "cancelled", label: STATUS_LABELS.cancelled },
];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        STATUS_BADGE_CLASSES[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function RowActions({
  reservation,
  onChanged,
}: {
  reservation: AdminReservation;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const patch = async (status: ReservationStatus) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "요청에 실패했습니다.");
      }
      toast.success(
        status === "confirmed"
          ? "예약이 확인되었습니다."
          : status === "completed"
            ? "예약이 완료 처리되었습니다."
            : "예약이 취소되었습니다."
      );
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const status = reservation.status as ReservationStatus;

  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "pending" && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => patch("confirmed")}
          >
            확인
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => patch("cancelled")}
          >
            취소
          </Button>
        </>
      )}
      {status === "confirmed" && (
        <>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => patch("completed")}
          >
            완료
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => patch("cancelled")}
          >
            취소
          </Button>
        </>
      )}
      {(status === "completed" || status === "cancelled") && (
        <span className="text-xs text-slate-400">—</span>
      )}
    </div>
  );
}

interface ReservationTableProps {
  reservations: AdminReservation[];
}

export function ReservationTable({ reservations }: ReservationTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [status, setStatus] = useState<"" | ReservationStatus>(
    (searchParams.get("status") ?? "") as "" | ReservationStatus
  );
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");

  // Syncing local form state from URL searchParams (external source); this is
  // the documented React pattern for external-input sync.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus((searchParams.get("status") ?? "") as "" | ReservationStatus);
    setDateFrom(searchParams.get("dateFrom") ?? "");
    setDateTo(searchParams.get("dateTo") ?? "");
  }, [searchParams]);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }, [status, dateFrom, dateTo, pathname, router]);

  const handleReset = () => {
    setStatus("");
    setDateFrom("");
    setDateTo("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="rsv-status" className="text-xs text-slate-600">
              상태
            </Label>
            <select
              id="rsv-status"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "" | ReservationStatus)
              }
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            >
              {STATUS_FILTER_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rsv-date-from" className="text-xs text-slate-600">
              시작일
            </Label>
            <Input
              id="rsv-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo || undefined}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rsv-date-to" className="text-xs text-slate-600">
              종료일
            </Label>
            <Input
              id="rsv-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
            />
          </div>

          <div className="flex items-end gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              필터 적용
            </Button>
            {(status || dateFrom || dateTo) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isPending}
              >
                초기화
              </Button>
            )}
          </div>
        </div>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>고객명</TableHead>
              <TableHead>전화번호</TableHead>
              <TableHead>예약일</TableHead>
              <TableHead>시간대</TableHead>
              <TableHead>서비스 유형</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-sm text-slate-500"
                >
                  조건에 맞는 예약이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              reservations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-slate-900">
                    {r.customerName}
                  </TableCell>
                  <TableCell className="text-slate-700 tabular-nums">
                    {r.customerPhone}
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {formatDateTime(r.reservationDate)}
                  </TableCell>
                  <TableCell className="text-slate-700 tabular-nums">
                    {r.timeSlot}
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {SERVICE_TYPE_LABELS[r.serviceType as ServiceType] ??
                      r.serviceType}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>
                    <RowActions reservation={r} onChanged={handleRefresh} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
