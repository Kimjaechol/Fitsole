"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";

import { loginSchema } from "@/lib/validators/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormValues) {
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(
          "이메일 또는 비밀번호가 올바르지 않습니다. 다시 시도해 주세요."
        );
        return;
      }

      router.push("/");
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

      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="비밀번호"
            className="h-12 pr-10"
            {...register("password")}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-foreground"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-[#DC2626]">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="h-12 w-full bg-[#2563EB] text-white hover:bg-[#2563EB]/90"
        disabled={isSubmitting}
      >
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "로그인"}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <Link
          href="/signup"
          className="text-[#2563EB] hover:underline"
        >
          회원가입
        </Link>
        <Link
          href="/reset-password"
          className="text-[#2563EB] hover:underline"
        >
          비밀번호 재설정
        </Link>
      </div>
    </form>
  );
}
