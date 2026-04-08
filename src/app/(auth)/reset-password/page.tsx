import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">비밀번호 재설정</h1>
      <ResetPasswordForm />
    </div>
  );
}
