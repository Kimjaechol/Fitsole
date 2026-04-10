/**
 * GET /api/admin/salted
 *
 * Admin-only endpoint listing SALTED measurement sessions with basic
 * customer info. Raw pressure arrays are intentionally NOT returned here —
 * they are fetched per-session via /api/admin/salted/[id].
 *
 * Threat model:
 * - T-05-11 (Information Disclosure): requireAdmin() gate on customer
 *   biomechanical data (per D-10, ADMN-05).
 */

import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { saltedSessions, users } from "@/lib/db/schema";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

export interface AdminSaltedSummary {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  sessionType: string;
  durationSeconds: number | null;
  dataPointCount: number | null;
  createdAt: string;
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  try {
    const rows = await db
      .select({
        id: saltedSessions.id,
        sessionType: saltedSessions.sessionType,
        durationSeconds: saltedSessions.durationSeconds,
        dataPointCount: saltedSessions.dataPointCount,
        createdAt: saltedSessions.createdAt,
        customerName: users.name,
        customerEmail: users.email,
      })
      .from(saltedSessions)
      .leftJoin(users, eq(saltedSessions.userId, users.id))
      .orderBy(desc(saltedSessions.createdAt));

    const sessions: AdminSaltedSummary[] = rows.map((r) => ({
      id: r.id,
      customerName: r.customerName ?? null,
      customerEmail: r.customerEmail ?? null,
      sessionType: r.sessionType,
      durationSeconds:
        r.durationSeconds != null ? Number(r.durationSeconds) : null,
      dataPointCount:
        r.dataPointCount != null ? Number(r.dataPointCount) : null,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[GET /api/admin/salted] failed:", error);
    return NextResponse.json(
      { error: "SALTED 세션 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
