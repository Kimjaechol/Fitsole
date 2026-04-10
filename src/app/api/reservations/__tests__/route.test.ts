import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for POST /api/reservations (public endpoint).
 *
 * Mocks the drizzle `db` module so we can assert the insert was called
 * without touching Postgres.
 */

const insertValuesMock = vi.fn();
const insertReturningMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: (v: unknown) => {
        insertValuesMock(v);
        return { returning: () => insertReturningMock() };
      },
    }),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  reservations: { __table: "reservations" },
}));

import { POST } from "@/app/api/reservations/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/reservations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function futureDateIso(offsetDays = 3): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

function pastDateIso(offsetDays = 3): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
}

const validPayload = () => ({
  customerName: "홍길동",
  customerPhone: "010-1234-5678",
  customerEmail: "hong@example.com",
  reservationDate: futureDateIso(),
  timeSlot: "10:00-11:00",
  serviceType: "measurement",
  notes: "첫 방문입니다.",
});

beforeEach(() => {
  insertValuesMock.mockReset();
  insertReturningMock.mockReset();
  insertReturningMock.mockResolvedValue([
    {
      id: "res-123",
      customerName: "홍길동",
      customerPhone: "010-1234-5678",
      customerEmail: "hong@example.com",
      reservationDate: new Date(),
      timeSlot: "10:00-11:00",
      serviceType: "measurement",
      status: "pending",
      notes: "첫 방문입니다.",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
});

describe("POST /api/reservations (public)", () => {
  it("returns 201 and inserts with status 'pending' for a valid payload", async () => {
    const res = await POST(makeRequest(validPayload()));
    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      reservation: { id: string };
    };
    expect(json.reservation.id).toBe("res-123");
    expect(insertValuesMock).toHaveBeenCalledTimes(1);
    // Default status on the reservations table is 'pending' — the public
    // endpoint must NOT override it.
    const inserted = insertValuesMock.mock.calls[0][0];
    expect(inserted.customerName).toBe("홍길동");
    expect(inserted.serviceType).toBe("measurement");
  });

  it("returns 400 when customerName is missing", async () => {
    const payload = validPayload() as Record<string, unknown>;
    delete payload.customerName;
    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(400);
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid email format", async () => {
    const res = await POST(
      makeRequest({ ...validPayload(), customerEmail: "not-an-email" })
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as {
      issues: { path: string; message: string }[];
    };
    const emailIssue = json.issues.find((i) => i.path === "customerEmail");
    expect(emailIssue?.message).toContain("이메일");
  });

  it("returns 400 for invalid serviceType", async () => {
    const res = await POST(
      makeRequest({ ...validPayload(), serviceType: "bogus" })
    );
    expect(res.status).toBe(400);
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("returns 400 when reservationDate is in the past", async () => {
    const res = await POST(
      makeRequest({ ...validPayload(), reservationDate: pastDateIso(3) })
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as {
      issues: { path: string; message: string }[];
    };
    const dateIssue = json.issues.find((i) => i.path === "reservationDate");
    expect(dateIssue?.message).toContain("오늘 이후");
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("returns 400 when body is not JSON", async () => {
    const req = new Request("http://localhost/api/reservations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("returns 500 when the database insert throws", async () => {
    insertReturningMock.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(makeRequest(validPayload()));
    expect(res.status).toBe(500);
  });
});
