/**
 * Next.js API proxy: SALTED session requests -> Python backend.
 * T-03-18: userId extracted from auth session, never from request body.
 * T-03-19: Frame count and duration limits enforced server-side.
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const MEASUREMENT_SERVICE_URL =
  process.env.MEASUREMENT_SERVICE_URL || "http://localhost:8000";

/** T-03-19: Server-side limits for session data */
const MAX_FRAME_COUNT = 500_000;
const MAX_DURATION_SECONDS = 600;

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

    // T-03-19: Validate frame count and duration limits
    if (Array.isArray(body.frames) && body.frames.length > MAX_FRAME_COUNT) {
      return NextResponse.json(
        { error: `프레임 수가 제한을 초과했습니다 (최대: ${MAX_FRAME_COUNT})` },
        { status: 400 }
      );
    }

    if (
      typeof body.duration_seconds === "number" &&
      body.duration_seconds > MAX_DURATION_SECONDS
    ) {
      return NextResponse.json(
        { error: `세션 시간이 제한을 초과했습니다 (최대: ${MAX_DURATION_SECONDS}초)` },
        { status: 400 }
      );
    }

    // T-03-18: Always use auth session userId, never trust request body
    const proxyBody = {
      ...body,
      user_id: session.user.id,
    };

    const response = await fetch(
      `${MEASUREMENT_SERVICE_URL}/api/salted/session`,
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
      { error: "SALTED 세션 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id");

    const url = sessionId
      ? `${MEASUREMENT_SERVICE_URL}/api/salted/session/${sessionId}?user_id=${session.user.id}`
      : `${MEASUREMENT_SERVICE_URL}/api/salted/session?user_id=${session.user.id}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "SALTED 세션 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
