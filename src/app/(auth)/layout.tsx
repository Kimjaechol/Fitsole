import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
      <Toaster />
    </SessionProvider>
  );
}
