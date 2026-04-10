/**
 * Factory dispatch email (D-09, ADMN-04).
 *
 * Sends a Korean-language 제작 의뢰서 to the manufacturing partner with
 * everything they need to print the customer's insoles:
 *   - Order number, customer + shipping address (factory ships direct)
 *   - Per-item design parameters (arch height, heel cup depth, foot side)
 *   - Per-zone Shore A + temperature map (Varioshore)
 *   - STL download links (NOT attachments — files too large per CONTEXT.md)
 *
 * Same Resend + dev-console-fallback pattern as order-confirmation.ts and
 * order-status-notification.ts.
 *
 * Recipient is configurable via FACTORY_EMAIL env var (default: factory@fitsole.kr).
 */

const CARRIER_LABELS: Record<string, string> = {
  cj: "CJ 대한통운",
  hanjin: "한진택배",
  lotte: "롯데택배",
  logen: "로젠택배",
  post: "우체국택배",
};

export interface FactoryDispatchItem {
  productName: string;
  size: number; // mm
  quantity: number;
  footSide: "left" | "right";
  // Design parameters (mm unless noted)
  archHeight: number;
  heelCupDepth: number;
  // Per-zone hardness (Shore A) + Varioshore temperature
  hardness: Array<{
    zone: string;
    label: string;
    shoreA: number;
    tempC: number;
  }>;
  stlDownloadUrl: string | null;
}

export interface FactoryDispatchParams {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippingName: string;
  shippingPhone: string;
  shippingZipcode: string;
  shippingAddress: string;
  shippingDetailAddress: string | null;
  items: FactoryDispatchItem[];
  factoryEmail?: string;
}

const SIDE_LABELS: Record<"left" | "right", string> = {
  left: "왼발",
  right: "오른발",
};

function buildItemBlock(item: FactoryDispatchItem, index: number): string {
  const stlBlock = item.stlDownloadUrl
    ? `<p style="margin:8px 0 0;font-size:13px;">
         <strong>STL 다운로드:</strong>
         <a href="${item.stlDownloadUrl}" style="color:#2563EB;text-decoration:underline;">${item.stlDownloadUrl}</a>
       </p>`
    : `<p style="margin:8px 0 0;font-size:13px;color:#DC2626;">
         <strong>STL 미생성</strong> — 다운로드 URL이 아직 발급되지 않았습니다.
       </p>`;

  const hardnessRows = item.hardness
    .map(
      (h) => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #F1F5F9;font-size:12px;color:#334155;">${h.label}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #F1F5F9;font-size:12px;color:#0F172A;text-align:right;">${h.shoreA}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #F1F5F9;font-size:12px;color:#475569;text-align:right;">${h.tempC}°C</td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="margin:0 0 16px;padding:16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#0F172A;">
        품목 ${index + 1}: ${item.productName}
      </p>
      <p style="margin:0;font-size:13px;color:#475569;">
        사이즈 ${item.size}mm · 수량 ${item.quantity}개 · ${SIDE_LABELS[item.footSide]}
      </p>

      <p style="margin:12px 0 4px;font-size:13px;font-weight:600;color:#0F172A;">설계 파라미터</p>
      <p style="margin:0;font-size:13px;color:#334155;">
        아치 높이 <strong>${item.archHeight.toFixed(1)}mm</strong> ·
        힐컵 깊이 <strong>${item.heelCupDepth.toFixed(1)}mm</strong>
      </p>

      <p style="margin:12px 0 4px;font-size:13px;font-weight:600;color:#0F172A;">TPU 영역별 사양</p>
      <table style="width:100%;border-collapse:collapse;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:6px;">
        <thead>
          <tr style="background:#F1F5F9;">
            <th style="padding:6px 8px;text-align:left;font-size:12px;font-weight:600;color:#475569;">영역</th>
            <th style="padding:6px 8px;text-align:right;font-size:12px;font-weight:600;color:#475569;">Shore A</th>
            <th style="padding:6px 8px;text-align:right;font-size:12px;font-weight:600;color:#475569;">온도</th>
          </tr>
        </thead>
        <tbody>
          ${hardnessRows}
        </tbody>
      </table>

      ${stlBlock}
    </div>
  `;
}

function buildEmailHtml(params: FactoryDispatchParams): string {
  const {
    orderNumber,
    customerName,
    customerEmail,
    shippingName,
    shippingPhone,
    shippingZipcode,
    shippingAddress,
    shippingDetailAddress,
    items,
  } = params;

  const fullAddress = shippingDetailAddress
    ? `${shippingAddress} ${shippingDetailAddress}`
    : shippingAddress;

  const itemsHtml = items.map((item, idx) => buildItemBlock(item, idx)).join("");

  return `
    <div style="font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;max-width:680px;margin:0 auto;padding:0;background:#FFFFFF;">
      <!-- Header -->
      <div style="padding:32px 24px;background:#0F172A;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">FitSole</h1>
        <p style="margin:8px 0 0;font-size:14px;color:#94A3B8;">제작 의뢰서</p>
      </div>

      <!-- Order Number -->
      <div style="padding:24px;text-align:center;border-bottom:1px solid #E2E8F0;">
        <p style="margin:0;font-size:14px;color:#64748B;">주문번호</p>
        <p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#0F172A;font-family:monospace;">${orderNumber}</p>
      </div>

      <!-- Customer -->
      <div style="padding:24px;">
        <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0F172A;">고객 정보</h2>
        <div style="padding:16px;background:#F8FAFC;border-radius:8px;font-size:13px;color:#334155;line-height:1.6;">
          <p style="margin:0;"><strong>이름:</strong> ${customerName}</p>
          <p style="margin:4px 0 0;"><strong>이메일:</strong> ${customerEmail}</p>
        </div>
      </div>

      <!-- Items -->
      <div style="padding:0 24px 8px;">
        <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0F172A;">제작 품목 (${items.length}건)</h2>
        ${itemsHtml || `<p style="font-size:13px;color:#64748B;">제작 품목이 없습니다.</p>`}
      </div>

      <!-- Shipping (factory ships direct) -->
      <div style="padding:0 24px 24px;">
        <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0F172A;">배송지 (공장 직배송)</h2>
        <div style="padding:16px;background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;font-size:13px;color:#78350F;line-height:1.6;">
          <p style="margin:0;"><strong>수령인:</strong> ${shippingName}</p>
          <p style="margin:4px 0 0;"><strong>연락처:</strong> ${shippingPhone}</p>
          <p style="margin:4px 0 0;"><strong>주소:</strong> (${shippingZipcode}) ${fullAddress}</p>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:24px;background:#F8FAFC;text-align:center;font-size:12px;color:#94A3B8;line-height:1.6;">
        <p style="margin:0;">제작 관련 문의: factory-ops@fitsole.kr</p>
        <p style="margin:4px 0 0;">FitSole · 맞춤 인솔 신발 플랫폼</p>
      </div>
    </div>
  `;
}

export async function sendFactoryDispatchEmail(
  params: FactoryDispatchParams
): Promise<void> {
  const recipient =
    params.factoryEmail || process.env.FACTORY_EMAIL || "factory@fitsole.kr";
  const subject = `[FitSole 제작 의뢰] ${params.orderNumber} (${params.items.length}건)`;
  const html = buildEmailHtml(params);

  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: process.env.EMAIL_FROM || "FitSole <noreply@fitsole.kr>",
        to: recipient,
        subject,
        html,
      });
    } else {
      console.log(`[DEV] Factory dispatch email -> ${recipient}`);
      console.log(`[DEV] Subject: ${subject}`);
      console.log(
        `[DEV] Order: ${params.orderNumber}, Items: ${params.items.length}, STL links: ${params.items.filter((i) => i.stlDownloadUrl).length}/${params.items.length}`
      );
      params.items.forEach((item, idx) => {
        console.log(
          `[DEV]   ${idx + 1}. ${item.productName} (${SIDE_LABELS[item.footSide]}, ${item.size}mm) arch=${item.archHeight}mm heel=${item.heelCupDepth}mm STL=${item.stlDownloadUrl ?? "—"}`
        );
      });
    }
  } catch (error) {
    console.error(
      `[factory-dispatch] Failed to send email for ${params.orderNumber}:`,
      error
    );
    throw error;
  }
}

// Re-export carrier labels in case other email modules want them
export { CARRIER_LABELS };
