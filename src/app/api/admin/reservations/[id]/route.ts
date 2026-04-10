/**
 * PATCH/DELETE /api/admin/reservations/[id]
 *
 * Admin-only endpoints for editing reservation details / status
 * and soft-deleting reservations (status -> cancelled) per D-11.
 *
 * Threat model:
 * - T-05-12 (Tampering): Zod validation + requireAdmin() gate.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reservations } from "@/lib/db/schema";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import type {
  AdminReservation,
  ReservationStatus,
  ServiceType,
} from "../route";

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

const updateReservationSchema = z
  .object({
    customerName: z.string().trim().min(1).max(100).optional(),
    customerPhone: z.string().trim().min(1).max(40).optional(),
    customerEmail: z
      .string()
      .trim()
      .email()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" || v === undefined ? null : v))
      .nullable(),
    reservationDate: z
      .string()
      .refine((s) => !Number.isNaN(new Date(s).getTime()))
      .optional(),
    timeSlot: z.string().trim().min(1).max(40).optional(),
    serviceType: z.enum(SERVICE_TYPE_VALUES).optional(),
    status: z.enum(RESERVATION_STATUS_VALUES).optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "수정할 필드가 없습니다.",
  });

function toAdminReservation(
  row: typeof reservations.$inferSelect
): AdminReservation {
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: "예약 ID가 필요합니다." },
      { status: 400 }
    );
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

  const parsed = updateReservationSchema.safeParse(body);
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
    const updates: Partial<typeof reservations.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (parsed.data.customerName !== undefined)
      updates.customerName = parsed.data.customerName;
    if (parsed.data.customerPhone !== undefined)
      updates.customerPhone = parsed.data.customerPhone;
    if (parsed.data.customerEmail !== undefined)
      updates.customerEmail = parsed.data.customerEmail;
    if (parsed.data.reservationDate !== undefined)
      updates.reservationDate = new Date(parsed.data.reservationDate);
    if (parsed.data.timeSlot !== undefined)
      updates.timeSlot = parsed.data.timeSlot;
    if (parsed.data.serviceType !== undefined)
      updates.serviceType = parsed.data.serviceType;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

    const [row] = await db
      .update(reservations)
      .set(updates)
      .where(eq(reservations.id, id))
      .returning();

    if (!row) {
      return NextResponse.json(
        { error: "예약을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ reservation: toAdminReservation(row) });
  } catch (error) {
    console.error("[PATCH /api/admin/reservations/[id]] failed:", error);
    return NextResponse.json(
      { error: "예약을 수정하지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: "예약 ID가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    // Soft delete — flip status to cancelled rather than hard delete
    const [row] = await db
      .update(reservations)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();

    if (!row) {
      return NextResponse.json(
        { error: "예약을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ reservation: toAdminReservation(row) });
  } catch (error) {
    console.error("[DELETE /api/admin/reservations/[id]] failed:", error);
    return NextResponse.json(
      { error: "예약을 취소하지 못했습니다." },
      { status: 500 }
    );
  }
}
