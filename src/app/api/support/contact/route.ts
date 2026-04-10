/**
 * POST /api/support/contact (SUPP-02, D-08).
 *
 * Public unauthenticated endpoint accepting customer support form submissions.
 *
 * Threat model (see 06-02-PLAN.md):
 * - T-06-05 (Tampering): Zod enforces field types, email format, length limits.
 * - T-06-06 (DoS): v1 has no rate limit; accepted risk, revisit if abused.
 * - T-06-07 (Info Disclosure): generic 200 even on email-send failure; no stack
 *   traces leaked to client.
 * - T-06-09 (Injection): sendSupportContactEmail escapes all user-provided HTML.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { sendSupportContactEmail } from "@/lib/email/support-contact";

const contactSchema = z.object({
  name: z.string().trim().min(1, "이름은 필수입니다.").max(100),
  email: z
    .string()
    .trim()
    .email("이메일 형식이 올바르지 않습니다.")
    .max(200),
  category: z.enum(["measurement", "order", "remake", "general"], {
    message: "문의 유형이 올바르지 않습니다.",
  }),
  subject: z.string().trim().min(1, "제목은 필수입니다.").max(200),
  message: z
    .string()
    .trim()
    .min(10, "문의 내용은 10자 이상이어야 합니다.")
    .max(5000, "문의 내용은 5000자 이하이어야 합니다."),
});

export type ContactSchema = z.infer<typeof contactSchema>;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문을 파싱할 수 없습니다." },
      { status: 400 }
    );
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "입력 값이 올바르지 않습니다.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  try {
    await sendSupportContactEmail(parsed.data);
  } catch (error) {
    // Email delivery failure must not leak to the user (T-06-07).
    // sendSupportContactEmail already swallows its own failures, but defend in depth.
    console.error("[POST /api/support/contact] email send failed:", error);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

// Exported for reuse in tests & client form validation.
export { contactSchema };
