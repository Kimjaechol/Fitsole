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
import { z } from "zod";

const MEASUREMENT_SERVICE_URL =
  process.env.MEASUREMENT_SERVICE_URL || "http://localhost:8000";

const processRequestSchema = z.object({
  scanId: z.string().uuid(),
  footSide: z.enum(["left", "right"]),
  weight: z.number().positive().max(300).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  age: z.number().positive().max(150).optional(),
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
    const parsed = processRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { scanId, footSide, weight, gender, age } = parsed.data;

    // Verify scan belongs to user (IDOR prevention)
    const [scan] = await db
      .select({
        id: footScans.id,
        status: footScans.status,
        videoUrl: footScans.videoUrl,
      })
      .from(footScans)
      .where(
        and(
          eq(footScans.id, scanId),
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

    // T-02-16: Prevent re-processing already completed scans
    if (scan.status === "completed") {
      return NextResponse.json(
        { error: "이미 처리 완료된 스캔입니다." },
        { status: 409 }
      );
    }

    // T-02-16: Prevent re-processing scans already in progress
    if (scan.status === "processing") {
      return NextResponse.json(
        { error: "이미 처리 중인 스캔입니다." },
        { status: 409 }
      );
    }

    // Update status to processing
    await db
      .update(footScans)
      .set({
        status: "processing",
        processingStage: "analyzing_video",
      })
      .where(eq(footScans.id, scanId));

    try {
      // Step 1: SfM foot scan processing
      await db
        .update(footScans)
        .set({ processingStage: "generating_model" })
        .where(eq(footScans.id, scanId));

      const scanResponse = await fetch(
        `${MEASUREMENT_SERVICE_URL}/scan/process`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scanId, footSide }),
        }
      );

      if (!scanResponse.ok) {
        throw new Error(`Scan processing failed: ${scanResponse.status}`);
      }

      const scanResult = await scanResponse.json();

      // Save foot measurements
      await db
        .update(footScans)
        .set({ processingStage: "calculating_measurements" })
        .where(eq(footScans.id, scanId));

      await db.insert(footMeasurements).values({
        scanId,
        footLength: scanResult.measurements.footLength,
        ballWidth: scanResult.measurements.ballWidth,
        instepHeight: scanResult.measurements.instepHeight,
        archHeight: scanResult.measurements.archHeight,
        heelWidth: scanResult.measurements.heelWidth,
        toeLength: scanResult.measurements.toeLength,
      });

      // Update scan quality
      await db
        .update(footScans)
        .set({
          qualityScore: scanResult.qualityScore,
          qualityLabel: scanResult.qualityLabel,
          modelUrl: scanResult.modelUrl,
        })
        .where(eq(footScans.id, scanId));

      // Step 2: Check if gait analysis already exists (populated by upload route)
      await db
        .update(footScans)
        .set({ processingStage: "analyzing_gait" })
        .where(eq(footScans.id, scanId));

      const existingGait = await db
        .select()
        .from(gaitAnalysis)
        .where(eq(gaitAnalysis.scanId, scanId))
        .limit(1);

      if (existingGait.length === 0) {
        console.warn(`No gait results found for scan ${scanId} — gait upload may still be pending`);
      }

      // Step 3: Pressure estimation
      await db
        .update(footScans)
        .set({ processingStage: "estimating_pressure" })
        .where(eq(footScans.id, scanId));

      // Resolve biometric inputs: from request body or fallback to DB
      let resolvedWeight = weight;
      let resolvedGender = gender;
      let resolvedAge = age;

      if (!resolvedWeight || !resolvedGender || !resolvedAge) {
        // Try to read from previously saved pressure data
        const [existingPressure] = await db
          .select({
            inputWeight: pressureDistribution.inputWeight,
            inputGender: pressureDistribution.inputGender,
            inputAge: pressureDistribution.inputAge,
          })
          .from(pressureDistribution)
          .where(eq(pressureDistribution.scanId, scanId))
          .limit(1);

        if (existingPressure) {
          resolvedWeight = resolvedWeight ?? existingPressure.inputWeight ?? undefined;
          resolvedGender = resolvedGender ?? (existingPressure.inputGender as "male" | "female" | "other" | undefined) ?? undefined;
          resolvedAge = resolvedAge ?? existingPressure.inputAge ?? undefined;
        }
      }

      if (!resolvedWeight || !resolvedGender || !resolvedAge) {
        console.warn(`Missing biometric inputs for pressure estimation on scan ${scanId} — skipping pressure step`);
      } else {
        const pressureResponse = await fetch(
          `${MEASUREMENT_SERVICE_URL}/pressure/estimate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scanId,
              footLength: scanResult.measurements.footLength,
              ballWidth: scanResult.measurements.ballWidth,
              archHeight: scanResult.measurements.archHeight,
              weight: resolvedWeight,
              gender: resolvedGender,
              age: resolvedAge,
            }),
          }
        );

        if (!pressureResponse.ok) {
          throw new Error(`Pressure estimation failed: ${pressureResponse.status}`);
        }

        const pressureResult = await pressureResponse.json();

        await db.insert(pressureDistribution).values({
          scanId,
          heatmapData: pressureResult.heatmapData,
          highPressureZones: pressureResult.highPressureZones,
          inputWeight: resolvedWeight,
          inputGender: resolvedGender,
          inputAge: resolvedAge,
        });
      }

      // Mark as completed
      await db
        .update(footScans)
        .set({
          status: "completed",
          processingStage: "complete",
          completedAt: new Date(),
        })
        .where(eq(footScans.id, scanId));

      return NextResponse.json({
        scanId,
        status: "completed" as const,
      });
    } catch (processingError) {
      // Mark scan as failed
      const errorMessage =
        processingError instanceof Error
          ? processingError.message
          : "처리 중 오류가 발생했습니다.";

      await db
        .update(footScans)
        .set({
          status: "failed",
          errorMessage,
        })
        .where(eq(footScans.id, scanId));

      console.error("Processing error:", processingError);

      return NextResponse.json(
        {
          scanId,
          status: "failed" as const,
          error: "스캔 처리에 실패했습니다. 다시 시도해 주세요.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Process route error:", error);
    return NextResponse.json(
      { error: "문제가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
