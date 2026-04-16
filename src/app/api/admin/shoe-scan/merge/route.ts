import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

const MEASUREMENT_SERVICE_URL =
  process.env.MEASUREMENT_SERVICE_URL || "http://localhost:8000";

/**
 * Upload ceiling for the combined multipart body (Revopoint + cast + scanId).
 * Client enforces 100MB per file, Python enforces 200MB per file; the
 * combined multipart envelope is capped just above 2 × 100MB to leave
 * headroom for form boundaries without letting a rogue admin cookie
 * OOM the Node runtime with a multi-GB body.
 */
const MAX_MERGE_REQUEST_BYTES = 220 * 1024 * 1024;

/**
 * POST /api/admin/shoe-scan/merge
 *
 * Merges a Revopoint partial interior scan with an alginate cast scan.
 * Proxies to Python /shoe-scan/merge endpoint which runs ICP alignment,
 * discrepancy resolution, and unified dimension extraction.
 *
 * Request body (multipart/form-data):
 *   - revopoint_mesh: File (.stl, .obj, .ply, .gltf, .glb)
 *   - cast_mesh: File (.stl, .obj, .ply, .gltf, .glb)
 *   - scanId: string (UUID)
 *
 * Response:
 *   - success: boolean
 *   - alignment_rmse: number (mm)
 *   - overlap_percentage: number (0-100)
 *   - discrepancy_count: number
 *   - resolved_dimensions: ShoeInternalDimensions
 *   - resolution_report: per-dimension confidence + method
 *   - warnings: string[]
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();

    // Reject oversized bodies before buffering them into memory. The
    // Content-Length header isn't required by the spec, but every browser
    // and our own client supplies one for multipart uploads; when it's
    // missing we still fall back to the post-parse guard below.
    const contentLengthHeader = request.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);
      if (Number.isFinite(contentLength) && contentLength > MAX_MERGE_REQUEST_BYTES) {
        return NextResponse.json(
          {
            error: `요청 본문이 ${MAX_MERGE_REQUEST_BYTES / (1024 * 1024)}MB 제한을 초과했습니다`,
          },
          { status: 413 }
        );
      }
    }

    const formData = await request.formData();
    const revopointMesh = formData.get("revopoint_mesh");
    const castMesh = formData.get("cast_mesh");
    const scanId = formData.get("scanId");

    if (!(revopointMesh instanceof File) || !(castMesh instanceof File)) {
      return NextResponse.json(
        { error: "두 개의 메쉬 파일이 필요합니다 (Revopoint + 캐스트)" },
        { status: 400 }
      );
    }

    if (typeof scanId !== "string" || !scanId) {
      return NextResponse.json(
        { error: "scanId가 필요합니다" },
        { status: 400 }
      );
    }

    // Defense-in-depth: reject oversized payloads even when Content-Length
    // was absent (e.g. chunked upload). File.size is the parsed, in-memory
    // byte count, so this catches the attack class the header check missed.
    if (
      revopointMesh.size + castMesh.size >
      MAX_MERGE_REQUEST_BYTES
    ) {
      return NextResponse.json(
        {
          error: `업로드 파일 합계가 ${MAX_MERGE_REQUEST_BYTES / (1024 * 1024)}MB 제한을 초과했습니다`,
        },
        { status: 413 }
      );
    }

    // Forward to Python backend
    const backendForm = new FormData();
    backendForm.append("revopoint_mesh", revopointMesh);
    backendForm.append("cast_mesh", castMesh);
    backendForm.append("scanId", scanId);

    const response = await fetch(
      `${MEASUREMENT_SERVICE_URL}/shoe-scan/merge`,
      {
        method: "POST",
        body: backendForm,
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Merge backend error:", errorText);
      return NextResponse.json(
        { error: "메쉬 병합에 실패했습니다", detail: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Merge proxy error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
