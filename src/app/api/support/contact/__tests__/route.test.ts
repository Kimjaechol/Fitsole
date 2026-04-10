import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for POST /api/support/contact.
 *
 * Mocks sendSupportContactEmail so we can exercise the route handler
 * without the email subsystem.
 */

const sendMock = vi.fn();

vi.mock("@/lib/email/support-contact", () => ({
  sendSupportContactEmail: (payload: unknown) => sendMock(payload),
}));

import { POST } from "@/app/api/support/contact/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/support/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  name: "홍길동",
  email: "hong@example.com",
  category: "general",
  subject: "문의드립니다",
  message: "FitSole 제품에 대해 질문이 있어서 연락드립니다.",
};

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue(undefined);
});

describe("POST /api/support/contact", () => {
  it("returns 200 and calls sendSupportContactEmail for a valid payload", async () => {
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: validPayload.name,
        email: validPayload.email,
      })
    );
  });

  it("returns 400 with Korean error for invalid email (T-06-05)", async () => {
    const res = await POST(
      makeRequest({ ...validPayload, email: "not-an-email" })
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as {
      error: string;
      issues: { path: string; message: string }[];
    };
    expect(json.error).toBeDefined();
    expect(Array.isArray(json.issues)).toBe(true);
    const emailIssue = json.issues.find((i) => i.path === "email");
    expect(emailIssue?.message).toContain("이메일");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(
      makeRequest({ email: "valid@example.com", category: "general" })
    );
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns 400 when message is under 10 characters", async () => {
    const res = await POST(
      makeRequest({ ...validPayload, message: "짧아요" })
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as {
      issues: { path: string; message: string }[];
    };
    const msgIssue = json.issues.find((i) => i.path === "message");
    expect(msgIssue).toBeDefined();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid category", async () => {
    const res = await POST(
      makeRequest({ ...validPayload, category: "bogus" })
    );
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns 400 when body is not JSON", async () => {
    const req = new Request("http://localhost/api/support/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("still returns 200 when email send throws (T-06-07)", async () => {
    sendMock.mockRejectedValueOnce(new Error("Email down"));
    const res = await POST(makeRequest(validPayload));
    // Per plan: don't leak backend failures; return 200 to user.
    expect(res.status).toBe(200);
  });
});
