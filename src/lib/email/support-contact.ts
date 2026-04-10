/**
 * Support contact email (D-08, SUPP-02).
 *
 * Mirrors the Resend + dev-console-fallback pattern from
 * order-status-notification.ts and factory-dispatch.ts.
 *
 * Recipient is configurable via SUPPORT_EMAIL env var (default: support@fitsole.kr),
 * following the FACTORY_EMAIL default pattern.
 */

export type SupportCategory =
  | "measurement"
  | "order"
  | "remake"
  | "general";

export interface SupportContactPayload {
  name: string;
  email: string;
  category: SupportCategory;
  subject: string;
  message: string;
}

const CATEGORY_LABELS: Record<SupportCategory, string> = {
  measurement: "측정 문의",
  order: "주문 문의",
  remake: "재제작 문의",
  general: "일반 문의",
};

/**
 * Escape user-provided text for safe interpolation into HTML email body.
 * T-06-09 mitigation: never emit raw user HTML into transactional emails.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Preserve line breaks in the message body while keeping output safe.
 */
function formatMessageHtml(message: string): string {
  return escapeHtml(message).replace(/\n/g, "<br>");
}

function buildEmailHtml(payload: SupportContactPayload): string {
  const categoryLabel = CATEGORY_LABELS[payload.category];
  const safeName = escapeHtml(payload.name);
  const safeEmail = escapeHtml(payload.email);
  const safeSubject = escapeHtml(payload.subject);
  const safeMessage = formatMessageHtml(payload.message);

  return `
    <div style="font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;max-width:600px;margin:0 auto;padding:0;background:#FFFFFF;">
      <!-- Header -->
      <div style="padding:32px 24px;background:#0F172A;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">FitSole</h1>
        <p style="margin:8px 0 0;font-size:14px;color:#94A3B8;">고객 문의 접수</p>
      </div>

      <!-- Category banner -->
      <div style="padding:16px 24px;background:#F1F5F9;text-align:center;">
        <p style="margin:0;font-size:13px;color:#475569;">문의 유형</p>
        <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#0F172A;">${categoryLabel}</p>
      </div>

      <!-- Customer info -->
      <div style="padding:24px;">
        <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0F172A;">고객 정보</h2>
        <div style="padding:16px;background:#F8FAFC;border-radius:8px;font-size:13px;color:#334155;line-height:1.6;">
          <p style="margin:0;"><strong>이름:</strong> ${safeName}</p>
          <p style="margin:4px 0 0;"><strong>이메일:</strong> ${safeEmail}</p>
        </div>
      </div>

      <!-- Subject -->
      <div style="padding:0 24px 16px;">
        <h2 style="margin:0 0 8px;font-size:16px;font-weight:700;color:#0F172A;">제목</h2>
        <p style="margin:0;padding:12px 16px;background:#F8FAFC;border-radius:8px;font-size:14px;color:#0F172A;">${safeSubject}</p>
      </div>

      <!-- Message -->
      <div style="padding:0 24px 24px;">
        <h2 style="margin:0 0 8px;font-size:16px;font-weight:700;color:#0F172A;">문의 내용</h2>
        <div style="padding:16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;">${safeMessage}</div>
      </div>

      <!-- Footer -->
      <div style="padding:24px;background:#F8FAFC;text-align:center;font-size:12px;color:#94A3B8;line-height:1.6;">
        <p style="margin:0;">FitSole · 맞춤 인솔 신발 플랫폼</p>
        <p style="margin:4px 0 0;">이 메일은 /support 폼을 통해 자동 생성되었습니다.</p>
      </div>
    </div>
  `;
}

export async function sendSupportContactEmail(
  payload: SupportContactPayload
): Promise<void> {
  const recipient = process.env.SUPPORT_EMAIL || "support@fitsole.kr";
  const categoryLabel = CATEGORY_LABELS[payload.category];
  const subject = `[FitSole 문의] ${categoryLabel} · ${payload.subject}`;
  const html = buildEmailHtml(payload);

  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: process.env.EMAIL_FROM || "FitSole <noreply@fitsole.kr>",
        to: recipient,
        replyTo: payload.email,
        subject,
        html,
      });
    } else {
      console.log(`[DEV] Support contact email -> ${recipient}`);
      console.log(`[DEV] Subject: ${subject}`);
      console.log(
        `[DEV] From: ${payload.name} <${payload.email}> (${categoryLabel})`
      );
      console.log(`[DEV] Message: ${payload.message.slice(0, 120)}${payload.message.length > 120 ? "..." : ""}`);
    }
  } catch (error) {
    // Fire-and-forget: log but never throw so the API route stays resilient.
    console.error(
      `[support-contact] Failed to send email for ${payload.email}:`,
      error
    );
  }
}

// Exported for tests / UI labels.
export { CATEGORY_LABELS };
