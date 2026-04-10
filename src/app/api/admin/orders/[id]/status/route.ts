/**
 * PATCH /api/admin/orders/[id]/status
 *
 * Admin-only endpoint to transition an order to a new status and, when the
 * status warrants it, fire off a customer notification email.
 *
 * References:
 * - D-02 (ORDR-02): email notifications at each stage transition
 * - D-09 partial (ORDR-03): admin can update order status
 * - T-05-03: requireAdmin() re-checks role in DB
 * - T-05-04: Zod validates the status enum so tampered bodies are rejected
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { sendOrderStatusEmail } from "@/lib/email/order-status-notification";
import type { OrderStatus } from "@/lib/types/order";

const ORDER_STATUS_VALUES = [
  "pending",
  "paid",
  "designing",
  "manufacturing",
  "shipping",
  "delivered",
  "cancelled",
] as const satisfies readonly OrderStatus[];

const patchSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES),
  trackingNumber: z.string().min(1).max(64).optional(),
  trackingCarrier: z.string().min(1).max(32).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Admin gate (D-12, T-05-03)
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "주문 ID가 필요합니다." },
      { status: 400 }
    );
  }

  // 2. Parse and validate body (T-05-04)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 }
    );
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "잘못된 상태 값입니다.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { status, trackingNumber, trackingCarrier } = parsed.data;

  // 3. Ensure the order exists
  const [existing] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json(
      { error: "주문을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 4. Build update patch — only overwrite tracking fields if provided
  const updatePatch: {
    status: OrderStatus;
    updatedAt: Date;
    trackingNumber?: string;
    trackingCarrier?: string;
  } = {
    status,
    updatedAt: new Date(),
  };
  if (trackingNumber !== undefined) updatePatch.trackingNumber = trackingNumber;
  if (trackingCarrier !== undefined) updatePatch.trackingCarrier = trackingCarrier;

  const [updated] = await db
    .update(orders)
    .set(updatePatch)
    .where(eq(orders.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "주문 업데이트에 실패했습니다." },
      { status: 500 }
    );
  }

  // 5. Fire-and-forget email notification (D-02, same pattern as checkout/confirm)
  const [customer] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, updated.userId))
    .limit(1);

  if (customer?.email) {
    sendOrderStatusEmail({
      to: customer.email,
      orderNumber: updated.orderNumber,
      newStatus: updated.status,
      trackingNumber: updated.trackingNumber ?? undefined,
      trackingCarrier: updated.trackingCarrier ?? undefined,
    }).catch((err) => {
      console.error(
        `[admin/orders/status] Failed to send status email for ${updated.orderNumber}:`,
        err
      );
    });
  }

  return NextResponse.json({ order: updated });
}
