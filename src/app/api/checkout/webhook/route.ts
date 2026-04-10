import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * Toss Payments Webhook Handler (D-11)
 *
 * Backup to the confirm endpoint — handles edge cases where user
 * closes browser after payment but before confirmation.
 *
 * T-04-07: Verify webhook authenticity by looking up payment via Toss API
 * rather than trusting webhook payload alone.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentKey, orderId: orderNumber, status } = body;

    if (!paymentKey || !orderNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Look up order by orderNumber
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) {
      // Order not found — acknowledge to prevent retries
      return NextResponse.json({ success: true });
    }

    // If order is already paid, skip processing
    if (order.status === "paid") {
      return NextResponse.json({ success: true });
    }

    // T-04-07: Verify payment authenticity by querying Toss API directly
    const tossSecretKey = process.env.TOSS_SECRET_KEY;
    if (!tossSecretKey) {
      console.error("TOSS_SECRET_KEY is not configured for webhook");
      return NextResponse.json({ success: true }); // Acknowledge to prevent retries
    }

    const tossResponse = await fetch(
      `https://api.tosspayments.com/v1/payments/${paymentKey}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(tossSecretKey + ":").toString("base64")}`,
        },
      }
    );

    if (!tossResponse.ok) {
      console.error("Webhook: Failed to verify payment with Toss API");
      return NextResponse.json({ success: true }); // Acknowledge
    }

    const tossData = await tossResponse.json();

    // Verify the payment matches our order
    if (tossData.orderId !== orderNumber) {
      console.error("Webhook: Order ID mismatch");
      return NextResponse.json({ success: true });
    }

    // Update order based on verified payment status
    if (tossData.status === "DONE" && order.status === "pending") {
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
    } else if (
      status === "CANCELED" ||
      status === "ABORTED" ||
      status === "EXPIRED"
    ) {
      await db
        .update(orders)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Always return 200 to acknowledge receipt and prevent retries
    return NextResponse.json({ success: true });
  }
}
