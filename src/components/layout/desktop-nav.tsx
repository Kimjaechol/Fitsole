"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, ScanLine, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/catalog", label: "상품", icon: ShoppingBag },
  { href: "/scan", label: "측정", icon: ScanLine },
  { href: "/mypage", label: "마이", icon: User },
] as const;

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <header className="hidden md:flex sticky top-0 z-50 border-b border-[#E2E8F0] bg-white">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-between px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold text-[#2563EB]">
          FitSole
        </Link>

        <nav className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-colors",
                  isActive ? "text-[#2563EB]" : "text-[#64748B] hover:text-[#2563EB]"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
