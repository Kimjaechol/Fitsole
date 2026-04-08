import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { resetPasswordSchema } from "@/lib/validators/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = resetPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = result.data;

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.insert(verificationTokens).values({
        identifier: email,
        token,
        expires,
      });

      const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password/confirm?token=${token}`;

      if (process.env.RESEND_API_KEY) {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: process.env.EMAIL_FROM || "FitSole <noreply@fitsole.kr>",
          to: email,
          subject: "FitSole 비밀번호 재설정",
          html: `
            <div style="font-family: 'Pretendard', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2 style="font-size: 24px; font-weight: 700;">비밀번호 재설정</h2>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                아래 링크를 클릭하여 비밀번호를 재설정해 주세요. 이 링크는 1시간 동안 유효합니다.
              </p>
              <a href="${resetLink}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 8px; font-weight: 700;">
                비밀번호 재설정하기
              </a>
              <p style="font-size: 14px; color: #64748B; margin-top: 24px;">
                이 요청을 하지 않으셨다면 이 이메일을 무시해 주세요.
              </p>
            </div>
          `,
        });
      } else {
        console.log(`[DEV] Password reset link for ${email}: ${resetLink}`);
      }
    }

    // Always return 200 to prevent user enumeration (T-03-01)
    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    // Still return 200 to prevent information leakage
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
