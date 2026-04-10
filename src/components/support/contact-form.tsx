"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * Contact form client (D-08, SUPP-02).
 *
 * Submits to POST /api/support/contact; the server validates again with the
 * same schema and sends email via sendSupportContactEmail (Resend or dev log).
 */

const formSchema = z.object({
  name: z.string().trim().min(1, "이름은 필수입니다.").max(100),
  email: z
    .string()
    .trim()
    .email("이메일 형식이 올바르지 않습니다.")
    .max(200),
  category: z.enum(["measurement", "order", "remake", "general"], {
    message: "문의 유형을 선택해 주세요.",
  }),
  subject: z.string().trim().min(1, "제목은 필수입니다.").max(200),
  message: z
    .string()
    .trim()
    .min(10, "문의 내용은 10자 이상이어야 합니다.")
    .max(5000),
});

type FormValues = z.infer<typeof formSchema>;

const CATEGORY_OPTIONS: { value: FormValues["category"]; label: string }[] = [
  { value: "general", label: "일반 문의" },
  { value: "measurement", label: "측정 문의" },
  { value: "order", label: "주문 문의" },
  { value: "remake", label: "재제작 문의" },
];

export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "general",
    },
  });

  async function onSubmit(data: FormValues) {
    try {
      const response = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success("문의가 접수되었습니다. 1-2 영업일 내 답변드리겠습니다.");
        reset({ category: "general" });
        return;
      }

      if (response.status === 400) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          issues?: { path: string; message: string }[];
        };
        const firstIssue = body.issues?.[0]?.message;
        toast.error(firstIssue || body.error || "입력 값을 확인해 주세요.");
        return;
      }

      toast.error("문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
          placeholder="답변 받으실 이메일"
          className="h-12"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-[#DC2626]">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">문의 유형</Label>
        <select
          id="category"
          className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-[#0F172A] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          {...register("category")}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="text-sm text-[#DC2626]">{errors.category.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">제목</Label>
        <Input
          id="subject"
          type="text"
          placeholder="문의 제목"
          className="h-12"
          {...register("subject")}
        />
        {errors.subject && (
          <p className="text-sm text-[#DC2626]">{errors.subject.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">문의 내용</Label>
        <textarea
          id="message"
          rows={8}
          placeholder="궁금하신 내용을 자세히 적어 주세요. (최소 10자)"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-[#0F172A] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          {...register("message")}
        />
        {errors.message && (
          <p className="text-sm text-[#DC2626]">{errors.message.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="h-12 w-full bg-[#2563EB] text-white hover:bg-[#2563EB]/90"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            접수 중...
          </>
        ) : (
          "문의 접수하기"
        )}
      </Button>
    </form>
  );
}
