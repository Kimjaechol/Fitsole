import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { footScans } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const [scan] = await db
      .select({
        id: footScans.id,
        status: footScans.status,
        processingStage: footScans.processingStage,
        qualityScore: footScans.qualityScore,
        qualityLabel: footScans.qualityLabel,
        errorMessage: footScans.errorMessage,
      })
      .from(footScans)
      .where(
        and(
          eq(footScans.id, id),
          eq(footScans.userId, session.user.id)
        )
      )
      .limit(1);

    if (!scan) {
      return NextResponse.json(
        { error: "스캔을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(scan);
  } catch {
    return NextResponse.json(
      { error: "문제가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
