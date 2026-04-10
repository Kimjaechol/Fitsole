/**
 * POST /api/admin/orders/[id]/dispatch
 *
 * Admin-only endpoint to dispatch an order to the manufacturing factory (D-09, ADMN-04).
 *
 * Workflow:
 *   1. requireAdmin() — T-05-10 elevation of privilege mitigation
 *   2. Load the order + items + insole designs
 *   3. Validate order is in "designing" status — T-05-09 tampering mitigation
 *   4. Update order status to "manufacturing"
 *   5. Send factory dispatch email with full design specs + STL links
 *   6. Send customer status notification (paid -> manufacturing flow)
 *   7. Return success response
 *
 * Side-effect ordering:
 *   - DB update happens first; emails are awaited (we want failure feedback
 *     so the admin knows the dispatch did or did not go out).
 */

import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems, insoleDesigns, users } from "@/lib/db/schema";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import {
  sendFactoryDispatchEmail,
  type FactoryDispatchItem,
} from "@/lib/email/factory-dispatch";
import { sendOrderStatusEmail } from "@/lib/email/order-status-notification";
import {
  VARIOSHORE_ZONES,
  type HardnessZone,
  type VarioshoreTpuZone,
} from "@/lib/insole/types";

const ZONE_LABELS: Record<HardnessZone, string> = {
  archCore: "아치 코어",
  heelCupWall: "힐컵 벽",
  heelCupFloor: "힐컵 바닥",
  forefoot: "전족부",
  toeArea: "발가락",
};

function extractNumber(
  params: Record<string, unknown> | null,
  keys: string[]
): number | null {
  if (!params) return null;
  for (const key of keys) {
    const v = params[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function buildHardnessRows(
  raw: Record<string, unknown> | null
): FactoryDispatchItem["hardness"] {
  return (Object.keys(VARIOSHORE_ZONES) as HardnessZone[]).map((zone) => {
    const fallback = VARIOSHORE_ZONES[zone];
    const entry = (raw?.[zone] as Partial<VarioshoreTpuZone> | undefined) ?? {};
    return {
      zone,
      label: ZONE_LABELS[zone],
      shoreA: typeof entry.shoreA === "number" ? entry.shoreA : fallback.shoreA,
      tempC: typeof entry.tempC === "number" ? entry.tempC : fallback.tempC,
    };
  });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Admin gate (T-05-10)
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

  // 2. Load order
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) {
    return NextResponse.json(
      { error: "주문을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 3. State guard — only "designing" orders can be dispatched (T-05-09)
  if (order.status !== "designing") {
    return NextResponse.json(
      {
        error: `현재 상태에서는 공장 의뢰를 보낼 수 없습니다. (current=${order.status}, expected=designing)`,
      },
      { status: 409 }
    );
  }

  // 4. Items + designs
  const itemRows = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  const designIds = itemRows
    .map((it) => it.designId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (designIds.length === 0) {
    return NextResponse.json(
      { error: "인솔 설계 데이터가 없는 주문은 공장에 의뢰할 수 없습니다." },
      { status: 400 }
    );
  }

  const designRows = await db
    .select()
    .from(insoleDesigns)
    .where(inArray(insoleDesigns.id, designIds));

  const designById = new Map(designRows.map((d) => [d.id, d]));

  // 5. Customer info
  const [customerRow] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, order.userId))
    .limit(1);

  if (!customerRow) {
    return NextResponse.json(
      { error: "주문 고객 정보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 6. Build factory dispatch payload
  const dispatchItems: FactoryDispatchItem[] = itemRows
    .filter((it) => it.designId && designById.has(it.designId))
    .map((it) => {
      const design = designById.get(it.designId!)!;
      const designParams = design.designParams as Record<string, unknown> | null;
      const hardnessMap = design.hardnessMap as Record<string, unknown> | null;
      const archHeight =
        extractNumber(designParams, ["archHeight", "arch_height", "arch"]) ?? 35;
      const heelCupDepth =
        extractNumber(designParams, [
          "heelCupDepth",
          "heel_cup_depth",
          "heelCup",
        ]) ?? 22;

      return {
        productName: it.productName,
        size: Number(it.size),
        quantity: Number(it.quantity),
        footSide: design.footSide as "left" | "right",
        archHeight,
        heelCupDepth,
        hardness: buildHardnessRows(hardnessMap),
        stlDownloadUrl: design.stlUrl ?? null,
      };
    });

  if (dispatchItems.length === 0) {
    return NextResponse.json(
      { error: "공장에 보낼 설계 데이터가 없습니다." },
      { status: 400 }
    );
  }

  // 7. Update order status to manufacturing FIRST so a dispatch retry won't
  //    re-trigger from a stale "designing" state.
  const [updated] = await db
    .update(orders)
    .set({
      status: "manufacturing",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "주문 상태 업데이트에 실패했습니다." },
      { status: 500 }
    );
  }

  // 8. Send factory dispatch email — awaited so the admin gets feedback
  try {
    await sendFactoryDispatchEmail({
      orderNumber: updated.orderNumber,
      customerName: customerRow.name ?? "이름 없음",
      customerEmail: customerRow.email,
      shippingName: updated.shippingName,
      shippingPhone: updated.shippingPhone,
      shippingZipcode: updated.shippingZipcode,
      shippingAddress: updated.shippingAddress,
      shippingDetailAddress: updated.shippingDetailAddress ?? null,
      items: dispatchItems,
    });
  } catch (err) {
    console.error(
      `[admin/orders/dispatch] Factory email failed for ${updated.orderNumber}:`,
      err
    );
    return NextResponse.json(
      {
        error:
          "주문은 제작 단계로 전환되었지만 공장 이메일 발송에 실패했습니다. 수동으로 확인해 주세요.",
        order: updated,
      },
      { status: 502 }
    );
  }

  // 9. Customer status notification (fire-and-forget — same pattern as PATCH /status)
  sendOrderStatusEmail({
    to: customerRow.email,
    orderNumber: updated.orderNumber,
    newStatus: updated.status,
  }).catch((err) => {
    console.error(
      `[admin/orders/dispatch] Customer status email failed for ${updated.orderNumber}:`,
      err
    );
  });

  return NextResponse.json({
    order: updated,
    dispatched: {
      itemCount: dispatchItems.length,
      stlLinkCount: dispatchItems.filter((i) => i.stlDownloadUrl).length,
    },
  });
}
