import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  footScans,
  footMeasurements,
  gaitAnalysis,
  pressureDistribution,
} from "@/lib/db/schema";
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

    // Fetch scan with userId filter (IDOR prevention)
    const [scan] = await db
      .select()
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

    // Fetch related data in parallel
    const [measurements, gait, pressure] = await Promise.all([
      db
        .select()
        .from(footMeasurements)
        .where(eq(footMeasurements.scanId, scan.id))
        .limit(1),
      db
        .select()
        .from(gaitAnalysis)
        .where(eq(gaitAnalysis.scanId, scan.id))
        .limit(1),
      db
        .select()
        .from(pressureDistribution)
        .where(eq(pressureDistribution.scanId, scan.id))
        .limit(1),
    ]);

    const measurementData = measurements[0] ?? null;
    const gaitData = gait[0] ?? null;
    const pressureData = pressure[0] ?? null;

    // Map quality score to label
    const qualityLabel = scan.qualityLabel as 'good' | 'fair' | 'poor' | null;

    return NextResponse.json({
      id: scan.id,
      footSide: scan.footSide,
      status: scan.status,
      qualityScore: scan.qualityScore,
      qualityLabel: qualityLabel ?? 'fair',
      measurements: measurementData
        ? {
            footLength: measurementData.footLength,
            ballWidth: measurementData.ballWidth,
            instepHeight: measurementData.instepHeight,
            archHeight: measurementData.archHeight,
            heelWidth: measurementData.heelWidth,
            toeLength: measurementData.toeLength,
          }
        : null,
      gaitAnalysis: gaitData
        ? {
            gaitPattern: gaitData.gaitPattern,
            ankleAlignment: gaitData.ankleAlignment,
            archFlexibilityIndex: gaitData.archFlexibilityIndex,
          }
        : null,
      pressureData: pressureData
        ? {
            heatmapData: pressureData.heatmapData,
            highPressureZones: pressureData.highPressureZones,
          }
        : null,
      modelUrl: scan.modelUrl,
      createdAt: scan.createdAt.toISOString(),
      completedAt: scan.completedAt?.toISOString() ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "문제가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
