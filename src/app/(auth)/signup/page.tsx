import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">회원가입</h1>
      <SignupForm />
    </div>
  );
}
