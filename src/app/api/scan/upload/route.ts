import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { footScans } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

const MEASUREMENT_SERVICE_URL =
  process.env.MEASUREMENT_SERVICE_URL || "http://localhost:8000";

/** Maximum file size: 500MB (T-02-15 mitigation) */
const MAX_FILE_SIZE = 500 * 1024 * 1024;

/** Allowed MIME types for video uploads (T-02-15 mitigation) */
const ALLOWED_MIME_TYPES = [
  "video/webm",
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
];

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("video") as File | null;
    const scanId = formData.get("scanId") as string | null;

    if (!file || !scanId) {
      return NextResponse.json(
        { error: "영상 파일과 스캔 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // T-02-15: Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "영상 파일이 너무 큽니다. 최대 500MB까지 가능합니다." },
        { status: 400 }
      );
    }

    // T-02-15: Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "지원하지 않는 영상 형식입니다." },
        { status: 400 }
      );
    }

    // Verify scan belongs to user (IDOR prevention)
    const [scan] = await db
      .select({ id: footScans.id, status: footScans.status })
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

    // Proxy upload to Python backend (Vercel 4.5MB limit bypass)
    const backendForm = new FormData();
    backendForm.append("video", file);
    backendForm.append("scanId", scanId);

    const backendResponse = await fetch(
      `${MEASUREMENT_SERVICE_URL}/scan/process`,
      {
        method: "POST",
        body: backendForm,
      }
    );

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text().catch(() => "Unknown error");
      console.error("Backend upload error:", errorText);
      return NextResponse.json(
        { error: "영상 업로드에 실패했습니다" },
        { status: 500 }
      );
    }

    // Update scan status to processing
    await db
      .update(footScans)
      .set({
        status: "processing",
        processingStage: "analyzing_video",
      })
      .where(eq(footScans.id, scanId));

    return NextResponse.json({
      scanId,
      status: "processing" as const,
    });
  } catch (error) {
    console.error("Upload proxy error:", error);
    return NextResponse.json(
      { error: "영상 업로드에 실패했습니다" },
      { status: 500 }
    );
  }
}
