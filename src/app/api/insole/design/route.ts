/**
 * Next.js API proxy: insole design requests -> Python backend.
 * T-03-18: userId extracted from auth session, never from request body.
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const MEASUREMENT_SERVICE_URL =
  process.env.MEASUREMENT_SERVICE_URL || "http://localhost:8000";

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

    // T-03-18: Always use auth session userId, never trust request body
    const proxyBody = {
      ...body,
      user_id: session.user.id,
    };

    const response = await fetch(
      `${MEASUREMENT_SERVICE_URL}/api/insole/design`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proxyBody),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "인솔 설계 요청 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
