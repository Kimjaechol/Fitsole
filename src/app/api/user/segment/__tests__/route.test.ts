import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for POST/GET /api/user/segment (Phase 06 D-02).
 *
 * Mocks the auth() session and a minimal Drizzle-like db so we can exercise
 * the route handler without spinning up Postgres.
 */

type MockUserRow = { id: string; segment: string | null };

const authMock = vi.fn();
const selectedUser: { row: MockUserRow | null } = { row: null };
const updateCalls: Array<{ segment: string | null; id: string | null }> = [];

vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/db", () => {
  // Minimal chainable Drizzle stub.
  // .select().from(users).where(...).limit(1) → [row | undefined]
  // .update(users).set({segment}).where(eq(users.id, id)) → void
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (selectedUser.row ? [selectedUser.row] : []),
        }),
      }),
    }),
    update: () => ({
      set: (values: { segment?: string | null }) => ({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature-required arg for Drizzle's fluent API mock.
        where: async (_cond: unknown) => {
          updateCalls.push({
            segment: values.segment ?? null,
            id: selectedUser.row?.id ?? null,
          });
          if (selectedUser.row) {
            selectedUser.row.segment = values.segment ?? null;
          }
          return undefined;
        },
      }),
    }),
  };
  return { db };
});

vi.mock("@/lib/db/schema", () => ({
  users: { id: "users.id", segment: "users.segment" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (a: unknown, b: unknown) => ({ _kind: "eq", a, b }),
}));

// Import AFTER mocks so the route picks them up.
import { POST, GET } from "@/app/api/user/segment/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/user/segment", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authMock.mockReset();
  selectedUser.row = { id: "user-1", segment: null };
  updateCalls.length = 0;
});

describe("POST /api/user/segment", () => {
  it("returns 401 when no session is present (T-06-02)", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(makeRequest({ segment: "health" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid segment value (T-06-01)", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest({ segment: "not-a-real-segment" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is missing segment field", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 200 and persists segment for a valid request", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest({ segment: "health" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { segment: string };
    expect(json.segment).toBe("health");
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].segment).toBe("health");
    expect(updateCalls[0].id).toBe("user-1");
  });

  it("scopes the update to session.user.id only (T-06-02)", async () => {
    // Body MUST NOT be able to override the target user id, even if supplied.
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    const req = new Request("http://localhost/api/user/segment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ segment: "athlete", userId: "user-99" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(updateCalls[0].id).toBe("user-1");
    expect(updateCalls[0].id).not.toBe("user-99");
  });
});

describe("GET /api/user/segment", () => {
  it("returns 401 without a session", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns {segment:null} when user has no segment set", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    selectedUser.row = { id: "user-1", segment: null };
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { segment: string | null };
    expect(json.segment).toBeNull();
  });

  it("returns the persisted segment when set", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    selectedUser.row = { id: "user-1", segment: "general" };
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { segment: string | null };
    expect(json.segment).toBe("general");
  });
});
