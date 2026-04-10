import { db } from "@/lib/db";
import { orders, orderItems, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOrderConfirmationEmail } from "@/lib/email/order-confirmation";

const confirmSchema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(1), // This is the orderNumber (FS-YYYYMMDD-XXXX)
  amount: z.number().positive(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = confirmSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "잘못된 요청입니다." },
        { status: 400 }
      );
    }

    const { paymentKey, orderId: orderNumber, amount } = result.data;

    // Look up order by orderNumber
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "주문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Verify amount matches server-side total (T-04-05: never trust client params alone)
    if (order.totalAmount !== amount) {
      return NextResponse.json(
        { success: false, error: "결제 금액이 일치하지 않습니다." },
        { status: 400 }
      );
    }

    // Server-side payment verification via Toss Payments API
    const tossSecretKey = process.env.TOSS_SECRET_KEY;
    if (!tossSecretKey) {
      console.error("TOSS_SECRET_KEY is not configured");
      return NextResponse.json(
        { success: false, error: "결제 시스템 설정 오류입니다." },
        { status: 500 }
      );
    }

    const tossResponse = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(tossSecretKey + ":").toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentKey, orderId: orderNumber, amount }),
      }
    );

    const tossData = await tossResponse.json();

    if (!tossResponse.ok) {
      // Payment verification failed — mark order as cancelled
      await db
        .update(orders)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      console.error("Toss payment confirmation failed:", tossData);

      return NextResponse.json(
        {
          success: false,
          error: tossData.message || "결제 확인에 실패했습니다.",
          code: tossData.code,
        },
        { status: 400 }
      );
    }

    // Payment confirmed — update order status
    await db
      .update(orders)
      .set({
        status: "paid",
        paymentKey,
        paymentMethod: tossData.method || null,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // Fetch order items for email
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    // Fetch user email
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, order.userId))
      .limit(1);

    // Send confirmation email (fire-and-forget, don't block response)
    if (user?.email) {
      sendOrderConfirmationEmail({
        to: user.email,
        orderNumber: order.orderNumber,
        items: items.map((item) => ({
          productName: item.productName,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
          includesInsole: item.includesInsole === "true",
          bundleInsolePrice: item.bundleInsolePrice ?? 0,
        })),
        shippingName: order.shippingName,
        shippingAddress: order.shippingAddress,
        shippingDetailAddress: order.shippingDetailAddress,
        totalAmount: order.totalAmount,
        paymentMethod: tossData.method || "카드",
      }).catch((err) => {
        console.error("Failed to send order confirmation email:", err);
      });
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
    });
  } catch (error) {
    console.error("Checkout confirm error:", error);
    return NextResponse.json(
      { success: false, error: "결제 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
