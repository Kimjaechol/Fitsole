import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { signUpSchema } from "@/lib/validators/auth";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = signUpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, name } = result.data;

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "이미 가입된 이메일입니다." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.insert(users).values({
      email,
      name,
      hashedPassword,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "문제가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
