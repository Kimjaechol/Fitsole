"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, ScanLine, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "홈", icon: Home },
  { href: "/catalog", label: "상품", icon: ShoppingBag },
  { href: "/scan", label: "측정", icon: ScanLine },
  { href: "/mypage", label: "마이", icon: User },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E2E8F0] bg-white md:hidden"
      style={{ height: "56px" }}
    >
      <div
        className="flex h-[44px] items-center justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          const isScan = tab.href === "/scan";

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform duration-100",
                isActive ? "text-[#2563EB]" : "text-[#64748B]"
              )}
            >
              {isScan ? (
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full p-2",
                    isActive
                      ? "bg-[#2563EB] text-white"
                      : "bg-[#2563EB] text-white"
                  )}
                >
                  <tab.icon className="h-5 w-5" />
                </span>
              ) : (
                <tab.icon className="h-5 w-5" />
              )}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
