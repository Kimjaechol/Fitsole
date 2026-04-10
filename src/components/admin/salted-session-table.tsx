"use client";

/**
 * SaltedSessionTable — lightweight list view of SALTED measurement sessions.
 *
 * Uses shadcn Table directly (dataset is small and we don't need sorting or
 * filtering at this stage). Row click pushes ?id=<session> into the URL so
 * the parent page can render the detail dialog alongside the list.
 */

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AdminSaltedSummary } from "@/app/api/admin/salted/route";

const SESSION_TYPE_LABELS: Record<string, string> = {
  initial: "초기 측정",
  verification: "착용 후 검증",
};

function formatDuration(seconds: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}초`;
  return `${m}분 ${s.toString().padStart(2, "0")}초`;
}

function formatCount(n: number | null): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString("ko-KR");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function SaltedSessionTable({
  sessions,
}: {
  sessions: AdminSaltedSummary[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSelect = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>고객명</TableHead>
            <TableHead>세션 유형</TableHead>
            <TableHead className="text-right">측정 시간</TableHead>
            <TableHead className="text-right">데이터 포인트 수</TableHead>
            <TableHead>측정일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-32 text-center text-sm text-slate-500"
              >
                SALTED 세션 데이터가 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            sessions.map((s) => (
              <TableRow
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className="cursor-pointer hover:bg-slate-50"
              >
                <TableCell>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {s.customerName ?? "—"}
                    </p>
                    {s.customerEmail && (
                      <p className="truncate text-xs text-slate-500">
                        {s.customerEmail}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      s.sessionType === "verification"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-blue-200 bg-blue-50 text-blue-700"
                    }
                  >
                    {SESSION_TYPE_LABELS[s.sessionType] ?? s.sessionType}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatDuration(s.durationSeconds)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCount(s.dataPointCount)}
                </TableCell>
                <TableCell className="text-slate-700">
                  {formatDate(s.createdAt)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
