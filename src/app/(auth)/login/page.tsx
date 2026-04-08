import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">로그인</h1>
      <LoginForm />
    </div>
  );
}
