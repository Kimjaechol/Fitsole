import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { getPayload } from "payload";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { z } from "zod";
import { shippingSchema } from "@/lib/validators/checkout";

const FREE_SHIPPING_THRESHOLD = 50_000;
const SHIPPING_FEE = 3_000;

const cartItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  productSlug: z.string(),
  productImageUrl: z.string().nullable(),
  size: z.number(),
  price: z.number(),
  bundleInsolePrice: z.number(),
  includesInsole: z.boolean(),
  designId: z.string().nullable(),
  designSource: z.enum(["general", "professional"]).nullable(),
  quantity: z.number().int().min(1),
});

const prepareSchema = z.object({
  items: z.array(cartItemSchema).min(1, "장바구니가 비어 있습니다"),
  shipping: shippingSchema,
});

function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `FS-${dateStr}-${random}`;
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = prepareSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "입력 데이터가 올바르지 않습니다.", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { items, shipping } = result.data;

    // T-04-03: Server-side price validation — never trust client prices
    const payload = await getPayload({ config });
    let serverTotalAmount = 0;

    for (const item of items) {
      const productResult = await payload.find({
        collection: "products",
        where: { id: { equals: item.productId } },
        limit: 1,
        depth: 0,
      });

      const product = productResult.docs[0];
      if (!product) {
        return NextResponse.json(
          { error: `상품을 찾을 수 없습니다: ${item.productName}` },
          { status: 400 }
        );
      }

      const serverPrice = product.price as number;
      const serverBundleInsolePrice = (product.bundleInsolePrice as number) ?? 0;

      const unitPrice =
        serverPrice + (item.includesInsole ? serverBundleInsolePrice : 0);
      serverTotalAmount += unitPrice * item.quantity;
    }

    // Add shipping fee
    const shippingFee =
      serverTotalAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    serverTotalAmount += shippingFee;

    const orderNumber = generateOrderNumber();

    // Insert order
    const [order] = await db
      .insert(orders)
      .values({
        userId: session.user.id,
        orderNumber,
        status: "pending",
        totalAmount: serverTotalAmount,
        shippingName: shipping.name,
        shippingPhone: shipping.phone,
        shippingZipcode: shipping.zipcode,
        shippingAddress: shipping.address,
        shippingDetailAddress: shipping.detailAddress || null,
      })
      .returning({ id: orders.id });

    // Insert order items with server-validated prices
    for (const item of items) {
      const productResult = await payload.find({
        collection: "products",
        where: { id: { equals: item.productId } },
        limit: 1,
        depth: 0,
      });

      const product = productResult.docs[0]!;
      const serverPrice = product.price as number;
      const serverBundleInsolePrice = (product.bundleInsolePrice as number) ?? 0;

      await db.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        size: item.size,
        price: serverPrice,
        bundleInsolePrice: item.includesInsole ? serverBundleInsolePrice : null,
        includesInsole: item.includesInsole ? "true" : "false",
        designId: item.designId,
        designSource: item.designSource,
        quantity: item.quantity,
      });
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber,
      totalAmount: serverTotalAmount,
    });
  } catch (error) {
    console.error("Checkout prepare error:", error);
    return NextResponse.json(
      { error: "주문 준비 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
