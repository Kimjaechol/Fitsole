/**
 * GET /api/admin/salted/[id]
 *
 * Admin-only detail endpoint for a single SALTED session. Returns the full
 * raw pressure data + biomechanical analysis plus any insole designs that
 * were generated from the same scan.
 *
 * Threat model:
 * - T-05-11 (Information Disclosure): requireAdmin() gate.
 */

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  saltedSessions,
  users,
  insoleDesigns,
} from "@/lib/db/schema";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

export interface AdminSaltedDetail {
  id: string;
  sessionType: string;
  durationSeconds: number | null;
  dataPointCount: number | null;
  createdAt: string;
  customer: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  rawPressureData: unknown | null;
  analysisResult: unknown | null;
  scanId: string | null;
  linkedDesigns: Array<{
    id: string;
    lineType: string;
    footSide: "left" | "right";
    status: string;
    createdAt: string;
  }>;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: "세션 ID가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const [row] = await db
      .select({
        id: saltedSessions.id,
        userId: saltedSessions.userId,
        scanId: saltedSessions.scanId,
        sessionType: saltedSessions.sessionType,
        rawPressureData: saltedSessions.rawPressureData,
        analysisResult: saltedSessions.analysisResult,
        durationSeconds: saltedSessions.durationSeconds,
        dataPointCount: saltedSessions.dataPointCount,
        createdAt: saltedSessions.createdAt,
        customerName: users.name,
        customerEmail: users.email,
      })
      .from(saltedSessions)
      .leftJoin(users, eq(saltedSessions.userId, users.id))
      .where(eq(saltedSessions.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // If this session has a scanId, pull any insole designs tied to that scan
    // so the admin can jump from the session straight to the generated insole.
    const designs = row.scanId
      ? await db
          .select({
            id: insoleDesigns.id,
            lineType: insoleDesigns.lineType,
            footSide: insoleDesigns.footSide,
            status: insoleDesigns.status,
            createdAt: insoleDesigns.createdAt,
          })
          .from(insoleDesigns)
          .where(eq(insoleDesigns.scanId, row.scanId))
      : [];

    const detail: AdminSaltedDetail = {
      id: row.id,
      sessionType: row.sessionType,
      durationSeconds:
        row.durationSeconds != null ? Number(row.durationSeconds) : null,
      dataPointCount:
        row.dataPointCount != null ? Number(row.dataPointCount) : null,
      createdAt: row.createdAt.toISOString(),
      customer: row.userId
        ? {
            id: row.userId,
            name: row.customerName ?? null,
            email: row.customerEmail ?? null,
          }
        : null,
      rawPressureData: row.rawPressureData ?? null,
      analysisResult: row.analysisResult ?? null,
      scanId: row.scanId ?? null,
      linkedDesigns: designs.map((d) => ({
        id: d.id,
        lineType: d.lineType,
        footSide: d.footSide,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
      })),
    };

    return NextResponse.json({ session: detail });
  } catch (error) {
    console.error("[GET /api/admin/salted/[id]] failed:", error);
    return NextResponse.json(
      { error: "SALTED 세션을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
