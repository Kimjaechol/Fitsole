import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for sendSupportContactEmail — mirrors the dev-fallback/production
 * branching pattern used by order-status-notification.ts.
 */

const resendSendMock = vi.fn();

vi.mock("resend", () => {
  class Resend {
    emails = { send: resendSendMock };
    constructor(_apiKey?: string) {}
  }
  return { Resend };
});

import { sendSupportContactEmail } from "@/lib/email/support-contact";

const basePayload = {
  name: "홍길동",
  email: "test@example.com",
  category: "general" as const,
  subject: "문의드립니다",
  message: "안녕하세요. FitSole 제품에 대해 궁금한 점이 있습니다.",
};

const originalEnv = { ...process.env };

beforeEach(() => {
  resendSendMock.mockReset();
  resendSendMock.mockResolvedValue({ id: "email-1" });
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("sendSupportContactEmail", () => {
  it("uses console.log dev fallback when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendSupportContactEmail(basePayload);

    expect(logSpy).toHaveBeenCalled();
    expect(resendSendMock).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("calls resend.emails.send when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "test-key";

    await sendSupportContactEmail(basePayload);

    expect(resendSendMock).toHaveBeenCalledTimes(1);
    const call = resendSendMock.mock.calls[0][0];
    expect(call.to).toBeDefined();
    expect(call.subject).toContain("문의");
    expect(call.html).toContain("홍길동");
    expect(call.html).toContain("test@example.com");
  });

  it("uses SUPPORT_EMAIL env var with fallback to support@fitsole.kr", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.SUPPORT_EMAIL = "custom@example.com";

    await sendSupportContactEmail(basePayload);

    const call = resendSendMock.mock.calls[0][0];
    expect(call.to).toBe("custom@example.com");
  });

  it("defaults to support@fitsole.kr when SUPPORT_EMAIL is not set", async () => {
    process.env.RESEND_API_KEY = "test-key";
    delete process.env.SUPPORT_EMAIL;

    await sendSupportContactEmail(basePayload);

    const call = resendSendMock.mock.calls[0][0];
    expect(call.to).toBe("support@fitsole.kr");
  });

  it("includes the category label in Korean in the email HTML", async () => {
    process.env.RESEND_API_KEY = "test-key";

    await sendSupportContactEmail({
      ...basePayload,
      category: "measurement",
    });

    const call = resendSendMock.mock.calls[0][0];
    expect(call.html).toContain("측정 문의");
  });

  it("does not throw when Resend send fails (fire-and-forget)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    resendSendMock.mockRejectedValueOnce(new Error("Network error"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendSupportContactEmail(basePayload)
    ).resolves.toBeUndefined();

    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("escapes user-provided fields to prevent HTML injection (T-06-09)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    await sendSupportContactEmail({
      ...basePayload,
      name: "<script>alert(1)</script>",
      subject: "<img src=x onerror=alert(1)>",
    });
    const call = resendSendMock.mock.calls[0][0];
    // Raw HTML tags must be escaped to HTML entities.
    expect(call.html).not.toContain("<script>");
    expect(call.html).not.toContain("<img src=x");
    // Escaped forms must be present (proof that escaping ran).
    expect(call.html).toContain("&lt;script&gt;");
    expect(call.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});
