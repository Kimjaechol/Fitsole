import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

const MEASUREMENT_SERVICE_URL =
  process.env.MEASUREMENT_SERVICE_URL || "http://localhost:8000";

/**
 * Cap the JSON body for grading requests. A legitimate request carries a
 * handful of anchor dimensions + ≤30 target sizes (tens of bytes each),
 * so 1MB is several orders of magnitude above the real ceiling and still
 * blocks JSON-bomb DoS attempts from a compromised admin cookie.
 */
const MAX_GRADE_REQUEST_BYTES = 1 * 1024 * 1024;

/**
 * POST /api/admin/shoe-scan/grade
 *
 * Derives all shoe sizes of a model from 1+ anchor scans using industry-
 * standard grading rules. Scan once at e.g., 270mm and predict 240~290mm.
 *
 * Request body (JSON):
 *   {
 *     "anchors": [
 *       { "size_base": 270, "dimensions": { ...ShoeInternalDimensions... } }
 *     ],
 *     "target_sizes": [240, 245, 250, 255, 260, 265, 275, 280, 285, 290]
 *   }
 *
 * Response:
 *   {
 *     "anchors_used": 1,
 *     "predictions": {
 *       "240": { ...dimensions... },
 *       "245": { ...dimensions... },
 *       ...
 *     },
 *     "validation_warnings": [],
 *     "used_piecewise": false
 *   }
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();

    // Pre-flight size check: reject oversized JSON bodies before parse.
    const contentLengthHeader = request.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);
      if (Number.isFinite(contentLength) && contentLength > MAX_GRADE_REQUEST_BYTES) {
        return NextResponse.json(
          {
            error: `요청 본문이 ${MAX_GRADE_REQUEST_BYTES / (1024 * 1024)}MB 제한을 초과했습니다`,
          },
          { status: 413 }
        );
      }
    }

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.anchors) || !Array.isArray(body.target_sizes)) {
      return NextResponse.json(
        { error: "anchors와 target_sizes 배열이 필요합니다" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${MEASUREMENT_SERVICE_URL}/shoe-scan/grade`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Grade backend error:", errorText);
      return NextResponse.json(
        { error: "사이즈 그레이딩에 실패했습니다", detail: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Grade proxy error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
