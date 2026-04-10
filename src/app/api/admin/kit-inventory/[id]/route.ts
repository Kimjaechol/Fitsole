/**
 * PATCH /api/admin/kit-inventory/[id]
 *
 * Admin-only endpoint for adjusting a kit's available quantity inline
 * from the reservations page (D-11).
 *
 * Threat model:
 * - T-05-12 (Tampering): Zod validation + requireAdmin() gate; availableQuantity
 *   cannot exceed totalQuantity.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { kitInventory } from "@/lib/db/schema";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

const patchSchema = z.object({
  availableQuantity: z
    .number({ message: "availableQuantity는 숫자여야 합니다." })
    .min(0, "availableQuantity는 0 이상이어야 합니다.")
    .finite(),
});

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
      { error: "키트 ID가 필요합니다." },
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

  const parsed = patchSchema.safeParse(body);
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
    // Enforce availableQuantity <= totalQuantity
    const [existing] = await db
      .select()
      .from(kitInventory)
      .where(eq(kitInventory.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "키트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (parsed.data.availableQuantity > existing.totalQuantity) {
      return NextResponse.json(
        {
          error: `사용 가능 수량은 전체 수량(${existing.totalQuantity}) 이하여야 합니다.`,
        },
        { status: 400 }
      );
    }

    const [row] = await db
      .update(kitInventory)
      .set({
        availableQuantity: parsed.data.availableQuantity,
        lastUpdated: new Date(),
      })
      .where(eq(kitInventory.id, id))
      .returning();

    return NextResponse.json({
      kit: {
        id: row.id,
        kitName: row.kitName,
        totalQuantity: row.totalQuantity,
        availableQuantity: row.availableQuantity,
        lastUpdated: row.lastUpdated.toISOString(),
      },
    });
  } catch (error) {
    console.error("[PATCH /api/admin/kit-inventory/[id]] failed:", error);
    return NextResponse.json(
      { error: "재고를 업데이트하지 못했습니다." },
      { status: 500 }
    );
  }
}
