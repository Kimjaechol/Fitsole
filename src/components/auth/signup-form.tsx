"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";

import { signUpSchema } from "@/lib/validators/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type SignupFormValues = z.infer<typeof signUpSchema>;

export function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  async function onSubmit(data: SignupFormValues) {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.status === 409) {
        toast.error("이미 가입된 이메일입니다. 로그인해 주세요.");
        return;
      }

      if (response.status === 400) {
        const result = await response.json();
        if (result.error && typeof result.error === "object") {
          const fieldErrors = result.error as Record<string, string[]>;
          for (const [field, messages] of Object.entries(fieldErrors)) {
            if (
              field === "email" ||
              field === "password" ||
              field === "confirmPassword" ||
              field === "name"
            ) {
              setError(field as keyof SignupFormValues, {
                message: messages[0],
              });
            }
          }
        }
        return;
      }

      if (response.status === 201) {
        toast.success("가입이 완료되었습니다!");
        router.push("/login");
        return;
      }

      toast.error("문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">이름</Label>
        <Input
          id="name"
          type="text"
          placeholder="이름"
          className="h-12"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-[#DC2626]">{errors.name.message}</p>
        )}
      </div>

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
            placeholder="비밀번호 (8자 이상)"
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

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">비밀번호 확인</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="비밀번호 확인"
            className="h-12 pr-10"
            {...register("confirmPassword")}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-foreground"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            tabIndex={-1}
            aria-label={
              showConfirmPassword ? "비밀번호 숨기기" : "비밀번호 보기"
            }
          >
            {showConfirmPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-[#DC2626]">
            {errors.confirmPassword.message}
          </p>
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
          "가입하기"
        )}
      </Button>

      <p className="text-center text-sm text-[#64748B]">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-[#2563EB] hover:underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
