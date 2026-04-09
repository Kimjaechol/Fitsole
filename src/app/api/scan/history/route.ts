import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { footScans, footMeasurements } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // Fetch user's scan history ordered by most recent
    const userScans = await db
      .select({
        id: footScans.id,
        footSide: footScans.footSide,
        status: footScans.status,
        qualityScore: footScans.qualityScore,
        qualityLabel: footScans.qualityLabel,
        createdAt: footScans.createdAt,
        completedAt: footScans.completedAt,
      })
      .from(footScans)
      .where(eq(footScans.userId, session.user.id))
      .orderBy(desc(footScans.createdAt))
      .limit(20);

    // Fetch measurements for completed scans
    const scansWithMeasurements = await Promise.all(
      userScans.map(async (scan) => {
        let measurements: { footLength: number; ballWidth: number } | null =
          null;

        if (scan.status === "completed") {
          const [m] = await db
            .select({
              footLength: footMeasurements.footLength,
              ballWidth: footMeasurements.ballWidth,
            })
            .from(footMeasurements)
            .where(eq(footMeasurements.scanId, scan.id))
            .limit(1);

          if (m) {
            measurements = m;
          }
        }

        return {
          id: scan.id,
          footSide: scan.footSide,
          status: scan.status,
          qualityScore: scan.qualityScore,
          qualityLabel: scan.qualityLabel,
          createdAt: scan.createdAt.toISOString(),
          completedAt: scan.completedAt?.toISOString() ?? null,
          measurements,
        };
      })
    );

    return NextResponse.json({ scans: scansWithMeasurements });
  } catch {
    return NextResponse.json(
      { error: "문제가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
