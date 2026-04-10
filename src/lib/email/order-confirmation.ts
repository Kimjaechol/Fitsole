const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CARD: "카드",
  카드: "카드",
  KAKAO_PAY: "카카오페이",
  카카오페이: "카카오페이",
  NAVER_PAY: "네이버페이",
  네이버페이: "네이버페이",
  TOSS_PAY: "토스페이",
  토스페이: "토스페이",
  TRANSFER: "계좌이체",
  계좌이체: "계좌이체",
};

function formatPrice(price: number): string {
  return `${Number(price).toLocaleString("ko-KR")}원`;
}

interface OrderItem {
  productName: string;
  size: number;
  quantity: number;
  price: number;
  includesInsole: boolean;
  bundleInsolePrice: number;
}

interface OrderEmailParams {
  to: string;
  orderNumber: string;
  items: OrderItem[];
  shippingName: string;
  shippingAddress: string;
  shippingDetailAddress: string | null;
  totalAmount: number;
  paymentMethod: string;
}

function buildEmailHtml(params: OrderEmailParams): string {
  const {
    orderNumber,
    items,
    shippingName,
    shippingAddress,
    shippingDetailAddress,
    totalAmount,
    paymentMethod,
  } = params;

  const paymentLabel =
    PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod || "카드";

  const fullAddress = shippingDetailAddress
    ? `${shippingAddress} ${shippingDetailAddress}`
    : shippingAddress;

  const itemRows = items
    .map((item) => {
      const unitPrice = item.price + (item.includesInsole ? item.bundleInsolePrice : 0);
      const insoleBadge = item.includesInsole
        ? `<span style="display:inline-block;margin-left:6px;padding:2px 6px;background:#E0F2FE;color:#0284C7;border-radius:4px;font-size:11px;">맞춤 인솔 포함</span>`
        : "";

      return `
        <tr>
          <td style="padding:12px 8px;border-bottom:1px solid #F1F5F9;">
            ${item.productName}${insoleBadge}
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #F1F5F9;text-align:center;">
            ${item.size}mm
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #F1F5F9;text-align:center;">
            ${item.quantity}
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #F1F5F9;text-align:right;">
            ${formatPrice(unitPrice * item.quantity)}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;max-width:600px;margin:0 auto;padding:0;background:#FFFFFF;">
      <!-- Header -->
      <div style="padding:32px 24px;background:#1E293B;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">FitSole</h1>
        <p style="margin:8px 0 0;font-size:14px;color:#94A3B8;">주문 확인</p>
      </div>

      <!-- Order Number -->
      <div style="padding:24px;text-align:center;border-bottom:1px solid #E2E8F0;">
        <p style="margin:0;font-size:14px;color:#64748B;">주문번호</p>
        <p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#0F172A;">${orderNumber}</p>
      </div>

      <!-- Items Table -->
      <div style="padding:24px;">
        <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0F172A;">주문 상품</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155;">
          <thead>
            <tr style="border-bottom:2px solid #E2E8F0;">
              <th style="padding:8px;text-align:left;font-weight:600;">상품명</th>
              <th style="padding:8px;text-align:center;font-weight:600;">사이즈</th>
              <th style="padding:8px;text-align:center;font-weight:600;">수량</th>
              <th style="padding:8px;text-align:right;font-weight:600;">금액</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>

      <!-- Shipping Info -->
      <div style="padding:0 24px 24px;">
        <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0F172A;">배송 정보</h2>
        <div style="padding:16px;background:#F8FAFC;border-radius:8px;font-size:14px;color:#334155;line-height:1.6;">
          <p style="margin:0;"><strong>수령인:</strong> ${shippingName}</p>
          <p style="margin:4px 0 0;"><strong>주소:</strong> ${fullAddress}</p>
        </div>
      </div>

      <!-- Payment Info -->
      <div style="padding:0 24px 24px;">
        <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0F172A;">결제 정보</h2>
        <div style="padding:16px;background:#F8FAFC;border-radius:8px;font-size:14px;color:#334155;line-height:1.6;">
          <p style="margin:0;"><strong>결제 수단:</strong> ${paymentLabel}</p>
          <p style="margin:4px 0 0;"><strong>결제 금액:</strong> <span style="font-size:18px;font-weight:700;color:#0F172A;">${formatPrice(totalAmount)}</span></p>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:24px;background:#F8FAFC;text-align:center;font-size:12px;color:#94A3B8;line-height:1.6;">
        <p style="margin:0;">주문 관련 문의: support@fitsole.kr</p>
        <p style="margin:4px 0 0;">이 메일은 발송 전용입니다.</p>
      </div>
    </div>
  `;
}

export async function sendOrderConfirmationEmail(
  params: OrderEmailParams
): Promise<void> {
  const subject = `[FitSole] 주문이 완료되었습니다 (${params.orderNumber})`;
  const html = buildEmailHtml(params);

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
    console.log(`[DEV] Order confirmation email for ${params.to}:`);
    console.log(`[DEV] Subject: ${subject}`);
    console.log(`[DEV] Order: ${params.orderNumber}, Items: ${params.items.length}, Total: ${formatPrice(params.totalAmount)}`);
  }
}
