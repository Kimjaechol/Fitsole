import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { footScans } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { z } from "zod";

const createScanSchema = z.object({
  footSide: z.enum(["left", "right"]),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = createScanSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { footSide } = result.data;

    const [scan] = await db
      .insert(footScans)
      .values({
        userId: session.user.id,
        footSide,
        status: "uploading",
      })
      .returning({
        id: footScans.id,
        footSide: footScans.footSide,
        status: footScans.status,
      });

    return NextResponse.json(scan, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "문제가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
