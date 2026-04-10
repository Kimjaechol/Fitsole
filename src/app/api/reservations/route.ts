/**
 * POST /api/reservations (D-14, OFFL-03).
 *
 * Public, unauthenticated endpoint for offline store reservations submitted
 * via /stores/gangnam. CONTEXT.md D-14 originally said "Posts to
 * /api/reservations created in Phase 5", but Phase 5 actually created
 * /api/admin/reservations which is admin-gated via requireAdmin(). A public
 * form cannot reach that endpoint, so we ship a new public POST-only route
 * that reuses the same reservations table + Zod base schema.
 *
 * Divergence from the literal CONTEXT.md wording is documented in the plan
 * summary.
 *
 * Threat model:
 * - T-06-10 (Tampering): Zod re-validates customerName/phone/email length,
 *   serviceType enum, and rejects past dates.
 * - T-06-11 (DoS): v1 has no rate limit; field length caps from the admin
 *   schema bound the payload. Accepted risk — revisit in v2.
 * - T-06-12 (Info Disclosure): NO GET handler — listing stays behind
 *   requireAdmin() on /api/admin/reservations.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { reservations } from "@/lib/db/schema";
import { createReservationSchema } from "@/lib/reservations/schema";

/**
 * Extends the admin base schema with a "reservationDate must be >= today"
 * guard. Admins can backfill historical reservations for walk-ins that
 * already happened, so the admin route does not enforce this; the public
 * endpoint does.
 */
const publicReservationSchema = createReservationSchema.extend({
  reservationDate: z
    .string()
    .min(1, "예약일은 필수입니다.")
    .refine((s) => !Number.isNaN(new Date(s).getTime()), {
      message: "예약일 형식이 올바르지 않습니다.",
    })
    .refine(
      (s) => {
        const d = new Date(s);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d >= today;
      },
      { message: "예약일은 오늘 이후여야 합니다." }
    ),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문을 파싱할 수 없습니다." },
      { status: 400 }
    );
  }

  const parsed = publicReservationSchema.safeParse(body);
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
      {
        reservation: {
          id: row.id,
          createdAt: row.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/reservations] failed:", error);
    return NextResponse.json(
      { error: "예약을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
