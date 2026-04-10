// Order status change notification email (D-02, ORDR-02).
// Follows the same Resend + dev-console-fallback pattern as order-confirmation.ts.

type OrderStatus =
  | "pending"
  | "paid"
  | "designing"
  | "manufacturing"
  | "shipping"
  | "delivered"
  | "cancelled";

// Statuses that actually trigger a customer notification.
// "pending" (pre-payment) and "cancelled" are handled elsewhere.
type NotifiableStatus = Exclude<OrderStatus, "pending" | "cancelled">;

const STATUS_MESSAGES: Record<NotifiableStatus, string> = {
  paid: "주문이 확인되었습니다",
  designing: "맞춤 인솔 설계가 시작되었습니다",
  manufacturing: "인솔 제작이 시작되었습니다",
  shipping: "주문하신 상품이 발송되었습니다",
  delivered: "배송이 완료되었습니다",
};

// Text-based progress bar steps (D-01 stages).
const PROGRESS_STEPS: { key: NotifiableStatus; label: string }[] = [
  { key: "paid", label: "주문확인" },
  { key: "designing", label: "인솔설계" },
  { key: "manufacturing", label: "제작중" },
  { key: "shipping", label: "배송중" },
  { key: "delivered", label: "완료" },
];

const CARRIER_LABELS: Record<string, string> = {
  cj: "CJ 대한통운",
  hanjin: "한진택배",
  lotte: "롯데택배",
  logen: "로젠택배",
  post: "우체국택배",
};

export interface StatusEmailParams {
  to: string;
  orderNumber: string;
  newStatus: OrderStatus;
  trackingNumber?: string;
  trackingCarrier?: string;
}

function isNotifiable(status: OrderStatus): status is NotifiableStatus {
  return status !== "pending" && status !== "cancelled";
}

function buildProgressBar(currentStatus: NotifiableStatus): string {
  const currentIdx = PROGRESS_STEPS.findIndex((s) => s.key === currentStatus);

  return PROGRESS_STEPS.map((step, idx) => {
    const isCurrent = idx === currentIdx;
    const isPast = idx < currentIdx;
    const color = isCurrent ? "#0F172A" : isPast ? "#64748B" : "#CBD5E1";
    const weight = isCurrent ? "700" : "500";
    const label = `<span style="color:${color};font-weight:${weight};">${step.label}</span>`;
    const separator =
      idx < PROGRESS_STEPS.length - 1
        ? `<span style="margin:0 8px;color:#CBD5E1;">&gt;</span>`
        : "";
    return `${label}${separator}`;
  }).join("");
}

function buildEmailHtml(params: StatusEmailParams): string {
  const { orderNumber, newStatus, trackingNumber, trackingCarrier } = params;

  if (!isNotifiable(newStatus)) {
    // Should not be reached because sendOrderStatusEmail filters these out.
    return "";
  }

  const statusMessage = STATUS_MESSAGES[newStatus];
  const progressBar = buildProgressBar(newStatus);

  const showTracking =
    newStatus === "shipping" && !!trackingNumber;
  const carrierLabel = trackingCarrier
    ? CARRIER_LABELS[trackingCarrier.toLowerCase()] || trackingCarrier
    : "";

  const trackingSection = showTracking
    ? `
      <div style="padding:0 24px 24px;">
        <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0F172A;">배송 추적</h2>
        <div style="padding:16px;background:#F0F9FF;border:1px solid #BAE6FD;border-radius:8px;font-size:14px;color:#0C4A6E;line-height:1.6;">
          ${carrierLabel ? `<p style="margin:0;"><strong>택배사:</strong> ${carrierLabel}</p>` : ""}
          <p style="margin:${carrierLabel ? "4px 0 0" : "0"};"><strong>운송장번호:</strong> ${trackingNumber}</p>
        </div>
      </div>
    `
    : "";

  return `
    <div style="font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;max-width:600px;margin:0 auto;padding:0;background:#FFFFFF;">
      <!-- Header -->
      <div style="padding:32px 24px;background:#1E293B;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">FitSole</h1>
        <p style="margin:8px 0 0;font-size:14px;color:#94A3B8;">주문 상태 업데이트</p>
      </div>

      <!-- Order Number -->
      <div style="padding:24px;text-align:center;border-bottom:1px solid #E2E8F0;">
        <p style="margin:0;font-size:14px;color:#64748B;">주문번호</p>
        <p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#0F172A;">${orderNumber}</p>
      </div>

      <!-- Status Message -->
      <div style="padding:24px;text-align:center;">
        <p style="margin:0;font-size:18px;font-weight:700;color:#0F172A;">${statusMessage}</p>
      </div>

      <!-- Progress Bar -->
      <div style="padding:0 24px 24px;">
        <div style="padding:16px;background:#F8FAFC;border-radius:8px;text-align:center;font-size:14px;line-height:1.8;">
          ${progressBar}
        </div>
      </div>

      ${trackingSection}

      <!-- Footer -->
      <div style="padding:24px;background:#F8FAFC;text-align:center;font-size:12px;color:#94A3B8;line-height:1.6;">
        <p style="margin:0;">주문 관련 문의: support@fitsole.kr</p>
        <p style="margin:4px 0 0;">이 메일은 발송 전용입니다.</p>
      </div>
    </div>
  `;
}

export async function sendOrderStatusEmail(
  params: StatusEmailParams
): Promise<void> {
  // Guard: only send for statuses that warrant a customer notification.
  if (!isNotifiable(params.newStatus)) {
    return;
  }

  const subject = `[FitSole] 주문 상태 업데이트 (${params.orderNumber})`;
  const html = buildEmailHtml(params);

  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: process.env.EMAIL_FROM || "FitSole <noreply@fitsole.kr>",
        to: params.to,
        subject,
        html,
      });
    } else {
      console.log(`[DEV] Order status email for ${params.to}:`);
      console.log(`[DEV] Subject: ${subject}`);
      console.log(
        `[DEV] Order: ${params.orderNumber}, Status: ${params.newStatus}${
          params.trackingNumber ? `, Tracking: ${params.trackingNumber}` : ""
        }`
      );
    }
  } catch (error) {
    // Fire-and-forget: log but never throw (caller should not await / block on failures).
    console.error(
      `[order-status-notification] Failed to send email for ${params.orderNumber}:`,
      error
    );
  }
}
