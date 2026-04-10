/**
 * Admin authorization helpers (D-12, D-13).
 *
 * Admin role is set directly in DB per D-13 (no self-registration).
 * All /api/admin/* endpoints and /admin/dashboard server components
 * should call requireAdmin() as the first line of defense.
 *
 * NOTE: The NextAuth session does NOT carry the role claim — we always
 * re-check against the DB so that a role downgrade takes effect on the
 * next request (T-05-03: elevation of privilege mitigation).
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export class AdminAuthError extends Error {
  status: 401 | 403;
  constructor(message: string, status: 401 | 403) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  role: "admin";
}

/**
 * Assert that the current request is made by an authenticated admin.
 *
 * - Throws AdminAuthError(401) if no session
 * - Throws AdminAuthError(403) if session user is missing or not role='admin'
 *
 * Route handlers should catch AdminAuthError and map to NextResponse with
 * the matching status code.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AdminAuthError("인증이 필요합니다.", 401);
  }

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!row) {
    throw new AdminAuthError("사용자를 찾을 수 없습니다.", 403);
  }

  if (row.role !== "admin") {
    throw new AdminAuthError("관리자 권한이 필요합니다.", 403);
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: "admin",
  };
}

/**
 * Lightweight check used by UI / server components that just need a boolean.
 *
 * Returns false for missing/unknown users (never throws).
 */
export async function isAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;

  const [row] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row?.role === "admin";
}
