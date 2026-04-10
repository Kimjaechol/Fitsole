import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { saltedSessions, users } from "@/lib/db/schema";
import { SaltedSessionTable } from "@/components/admin/salted-session-table";
import { SaltedSessionDetailPanel } from "@/components/admin/salted-session-detail-panel";
import type { AdminSaltedSummary } from "@/app/api/admin/salted/route";

export const dynamic = "force-dynamic";

interface SaltedPageProps {
  searchParams: Promise<{ id?: string }>;
}

/**
 * Admin SALTED sessions page (D-10, ADMN-05).
 *
 * Server component — queries Drizzle directly for the session list (parallel
 * with /api/admin/salted, same pattern as orders page). A `?id=<session>`
 * query param triggers the client-side detail loader alongside the list.
 */
async function fetchSaltedList(): Promise<AdminSaltedSummary[]> {
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

  return rows.map((r) => ({
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
}

export default async function AdminSaltedPage({ searchParams }: SaltedPageProps) {
  const sp = await searchParams;
  const sessions = await fetchSaltedList();
  const selectedId = sp.id ?? null;

  return (
    <div className="space-y-5 pt-14 md:pt-0">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SALTED 측정 세션</h1>
        <p className="mt-1 text-sm text-slate-500">
          스마트 인솔 키트로 측정된 보행 세션과 생체역학 분석 결과를 확인할 수 있습니다.
        </p>
      </div>

      <p className="text-xs text-slate-500">총 {sessions.length}건</p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SaltedSessionTable sessions={sessions} />
        <SaltedSessionDetailPanel selectedId={selectedId} />
      </div>
    </div>
  );
}
