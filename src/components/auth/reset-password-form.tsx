"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";

import { resetPasswordSchema } from "@/lib/validators/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordFormValues) {
    try {
      await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      toast.success(
        "비밀번호 재설정 링크를 이메일로 보내드렸습니다."
      );
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          type="email"
          placeholder="이메일"
          className="h-12"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-[#DC2626]">{errors.email.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="h-12 w-full bg-[#2563EB] text-white hover:bg-[#2563EB]/90"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          "비밀번호 재설정"
        )}
      </Button>

      <p className="text-center text-sm">
        <Link href="/login" className="text-[#2563EB] hover:underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </form>
  );
}
