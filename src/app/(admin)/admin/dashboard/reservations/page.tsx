import {
  and,
  desc,
  gte,
  inArray,
  lte,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { reservations, kitInventory } from "@/lib/db/schema";
import { ReservationTable } from "@/components/admin/reservation-table";
import { ReservationForm } from "@/components/admin/reservation-form";
import { KitInventoryCard } from "@/components/admin/kit-inventory-card";
import type {
  AdminReservation,
  ReservationStatus,
} from "@/app/api/admin/reservations/route";

export const dynamic = "force-dynamic";

const RESERVATION_STATUS_VALUES: readonly ReservationStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
] as const;

interface PageProps {
  searchParams: Promise<{
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Admin reservation management page (D-11, ADMN-06).
 *
 * Server component — queries Drizzle directly (layout enforces admin via
 * isAdmin in layout.tsx). Mirrors filter logic from /api/admin/reservations
 * so the two stay consistent.
 */
async function fetchReservations(filters: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AdminReservation[]> {
  const statuses =
    filters.status
      ?.split(",")
      .map((s) => s.trim())
      .filter((s): s is ReservationStatus =>
        (RESERVATION_STATUS_VALUES as readonly string[]).includes(s)
      ) ?? [];

  const dateFrom = parseDate(filters.dateFrom);
  const dateToRaw = parseDate(filters.dateTo);
  let dateTo: Date | null = null;
  if (dateToRaw) {
    dateTo = new Date(dateToRaw);
    dateTo.setHours(23, 59, 59, 999);
  }

  const conditions: SQL[] = [];
  if (statuses.length > 0) {
    conditions.push(inArray(reservations.status, statuses));
  }
  if (dateFrom) conditions.push(gte(reservations.reservationDate, dateFrom));
  if (dateTo) conditions.push(lte(reservations.reservationDate, dateTo));

  const whereExpr = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(reservations)
    .where(whereExpr)
    .orderBy(desc(reservations.reservationDate));

  return rows.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    customerEmail: r.customerEmail ?? null,
    reservationDate: r.reservationDate.toISOString(),
    timeSlot: r.timeSlot,
    serviceType: r.serviceType,
    status: r.status as ReservationStatus,
    notes: r.notes ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

async function fetchKitInventory() {
  const rows = await db
    .select()
    .from(kitInventory)
    .orderBy(kitInventory.kitName);

  return rows.map((r) => ({
    id: r.id,
    kitName: r.kitName,
    totalQuantity: r.totalQuantity,
    availableQuantity: r.availableQuantity,
    lastUpdated: r.lastUpdated.toISOString(),
  }));
}

export default async function AdminReservationsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const [list, kits] = await Promise.all([
    fetchReservations(sp),
    fetchKitInventory(),
  ]);

  return (
    <div className="space-y-6 pt-14 md:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">매장 예약 관리</h1>
          <p className="mt-1 text-sm text-slate-500">
            오프라인 매장 방문 예약을 관리하고 스마트 인솔 키트 재고를 확인할 수 있습니다.
          </p>
        </div>
        <ReservationForm />
      </div>

      <div>
        <p className="mb-3 text-xs text-slate-500">총 {list.length}건</p>
        <ReservationTable reservations={list} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">스마트 인솔 키트 재고</h2>
        {kits.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            등록된 키트가 없습니다. DB에 직접 추가해 주세요.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {kits.map((k) => (
              <KitInventoryCard key={k.id} item={k} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
