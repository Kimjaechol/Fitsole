"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ORDER_STATUS_BADGE_CLASSES,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/types/order";
import { cn } from "@/lib/utils";
import type { AdminOrderSummary } from "@/app/api/admin/orders/route";

const formatKRW = (value: number) =>
  `₩${Math.round(value).toLocaleString("ko-KR")}`;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        ORDER_STATUS_BADGE_CLASSES[status]
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

function LineTypeBadge({
  lineType,
}: {
  lineType: "general" | "professional" | null;
}) {
  if (!lineType) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const label =
    lineType === "professional" ? "Line 2 · SALTED" : "Line 1 · 카메라";
  const classes =
    lineType === "professional"
      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
      : "bg-cyan-50 text-cyan-700 border-cyan-200";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        classes
      )}
    >
      {label}
    </span>
  );
}

function SortIcon({ dir }: { dir: false | "asc" | "desc" }) {
  if (dir === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
  if (dir === "desc") return <ArrowDown className="h-3.5 w-3.5" />;
  return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
}

/**
 * OrderTable — client-side data table rendering AdminOrderSummary[] with
 * sortable 주문일/금액 columns and row navigation to /admin/dashboard/orders/[id].
 */
export function OrderTable({ orders }: { orders: AdminOrderSummary[] }) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const columns = useMemo<ColumnDef<AdminOrderSummary>[]>(
    () => [
      {
        accessorKey: "orderNumber",
        header: () => <span>주문번호</span>,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-slate-900">
            {row.original.orderNumber}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "customer",
        header: () => <span>고객명</span>,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {row.original.customerName ?? "—"}
            </p>
            {row.original.customerEmail && (
              <p className="truncate text-xs text-slate-500">
                {row.original.customerEmail}
              </p>
            )}
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "status",
        header: () => <span>상태</span>,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        enableSorting: false,
      },
      {
        accessorKey: "lineType",
        header: () => <span>설계 유형</span>,
        cell: ({ row }) => <LineTypeBadge lineType={row.original.lineType} />,
        enableSorting: false,
      },
      {
        accessorKey: "totalAmount",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            금액
            <SortIcon dir={column.getIsSorted()} />
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-slate-900">
            {formatKRW(row.original.totalAmount)}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            주문일
            <SortIcon dir={column.getIsSorted()} />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-slate-700">
            {formatDate(row.original.createdAt)}
          </span>
        ),
        enableSorting: true,
        sortingFn: (a, b) =>
          new Date(a.original.createdAt).getTime() -
          new Date(b.original.createdAt).getTime(),
      },
    ],
    []
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table's useReactTable returns non-memoizable functions by design; a refactor would require replacing the library. See https://github.com/TanStack/table/issues for React Compiler compatibility status.
  const table = useReactTable({
    data: orders,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleRowClick = (id: string) => {
    router.push(`/admin/dashboard/orders/${id}`);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-slate-50">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-sm text-slate-500"
              >
                조건에 맞는 주문이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => handleRowClick(row.original.id)}
                className="cursor-pointer hover:bg-slate-50"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
