/**
 * GET/POST /api/admin/reservations
 *
 * Admin-only endpoints for offline store reservation management (D-11, ADMN-06).
 *
 * Threat model:
 * - T-05-12 (Tampering): Zod validation + requireAdmin() gate on all writes.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { reservations } from "@/lib/db/schema";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export type ServiceType = "measurement" | "consultation" | "pickup";

export interface AdminReservation {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  reservationDate: string;
  timeSlot: string;
  serviceType: ServiceType | string;
  status: ReservationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const RESERVATION_STATUS_VALUES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
] as const satisfies readonly ReservationStatus[];

const SERVICE_TYPE_VALUES = [
  "measurement",
  "consultation",
  "pickup",
] as const satisfies readonly ServiceType[];

const createReservationSchema = z.object({
  customerName: z.string().trim().min(1, "고객명은 필수입니다.").max(100),
  customerPhone: z.string().trim().min(1, "전화번호는 필수입니다.").max(40),
  customerEmail: z
    .string()
    .trim()
    .email("이메일 형식이 올바르지 않습니다.")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? null : v)),
  reservationDate: z
    .string()
    .min(1, "예약일은 필수입니다.")
    .refine((s) => !Number.isNaN(new Date(s).getTime()), {
      message: "예약일 형식이 올바르지 않습니다.",
    }),
  timeSlot: z.string().trim().min(1, "시간대는 필수입니다.").max(40),
  serviceType: z.enum(SERVICE_TYPE_VALUES, {
    message: "서비스 유형이 올바르지 않습니다.",
  }),
  notes: z.string().trim().max(1000).optional().nullable(),
});

function parseStatusParam(raw: string | null): ReservationStatus[] | null {
  if (!raw) return null;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as ReservationStatus[];
  const filtered = parts.filter((p) =>
    (RESERVATION_STATUS_VALUES as readonly string[]).includes(p)
  );
  return filtered.length > 0 ? filtered : null;
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toAdminReservation(row: typeof reservations.$inferSelect): AdminReservation {
  return {
    id: row.id,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail ?? null,
    reservationDate: row.reservationDate.toISOString(),
    timeSlot: row.timeSlot,
    serviceType: row.serviceType,
    status: row.status as ReservationStatus,
    notes: row.notes ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  try {
    const url = new URL(request.url);
    const statuses = parseStatusParam(url.searchParams.get("status"));
    const dateFrom = parseDate(url.searchParams.get("dateFrom"));
    const dateToRaw = parseDate(url.searchParams.get("dateTo"));

    let dateTo: Date | null = null;
    if (dateToRaw) {
      dateTo = new Date(dateToRaw);
      dateTo.setHours(23, 59, 59, 999);
    }

    const conditions: SQL[] = [];
    if (statuses && statuses.length > 0) {
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

    return NextResponse.json({
      reservations: rows.map(toAdminReservation),
    });
  } catch (error) {
    console.error("[GET /api/admin/reservations] failed:", error);
    return NextResponse.json(
      { error: "예약 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문을 파싱할 수 없습니다." },
      { status: 400 }
    );
  }

  const parsed = createReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "입력 값이 올바르지 않습니다.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  try {
    const [row] = await db
      .insert(reservations)
      .values({
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        customerEmail: parsed.data.customerEmail ?? null,
        reservationDate: new Date(parsed.data.reservationDate),
        timeSlot: parsed.data.timeSlot,
        serviceType: parsed.data.serviceType,
        notes: parsed.data.notes ?? null,
      })
      .returning();

    return NextResponse.json(
      { reservation: toAdminReservation(row) },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/admin/reservations] failed:", error);
    return NextResponse.json(
      { error: "예약을 생성하지 못했습니다." },
      { status: 500 }
    );
  }
}

// Re-export for route handler sibling
export { createReservationSchema };
