import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { SEGMENT_VALUES } from "@/lib/types/segment";

/**
 * POST/GET /api/user/segment — persist and read the authenticated user's
 * customer segment (Phase 06 D-02).
 *
 * Threat model (06-01 plan):
 * - T-06-01 (Tampering): Zod enum validation against SEGMENT_VALUES. Unknown
 *   strings return 400; body-level userId overrides are ignored (we only
 *   read session.user.id).
 * - T-06-02 (Elevation): auth() session required; update scoped to
 *   session.user.id only — body cannot retarget another user.
 */

const segmentSchema = z.object({
  segment: z.enum(SEGMENT_VALUES as unknown as [string, ...string[]]),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: "요청 본문을 해석할 수 없습니다." },
        { status: 400 }
      );
    }

    const parsed = segmentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "유효하지 않은 세그먼트 값입니다." },
        { status: 400 }
      );
    }

    const { segment } = parsed.data;

    await db
      .update(users)
      .set({ segment })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ segment });
  } catch (error) {
    console.error("[POST /api/user/segment] failed:", error);
    return NextResponse.json(
      { error: "세그먼트를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const user = rows[0];
    if (!user) {
      return NextResponse.json({ segment: null });
    }

    return NextResponse.json({ segment: user.segment ?? null });
  } catch (error) {
    console.error("[GET /api/user/segment] failed:", error);
    return NextResponse.json(
      { error: "세그먼트를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
