"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Activity,
  CalendarDays,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/admin/dashboard",
    label: "대시보드",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/dashboard/orders",
    label: "주문 관리",
    icon: ShoppingBag,
    exact: false,
  },
  {
    href: "/admin/dashboard/salted",
    label: "SALTED 세션",
    icon: Activity,
    exact: false,
  },
  {
    href: "/admin/dashboard/reservations",
    label: "매장 예약",
    icon: CalendarDays,
    exact: false,
  },
] as const;

/**
 * Admin sidebar — fixed 240px left on desktop, collapsible drawer on mobile.
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Mobile header with hamburger */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-bold text-[#2563EB]">FitSole</span>
          <span className="text-xs font-medium text-slate-500">관리자</span>
        </Link>
        <button
          type="button"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {open && (
        <button
          type="button"
          aria-label="메뉴 배경 닫기"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar (fixed on desktop, slide-in drawer on mobile) */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-[240px] flex-col border-r border-slate-200 bg-white transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-5">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <span className="text-xl font-bold text-[#2563EB]">FitSole</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
              관리자
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 text-[#2563EB]"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3 text-xs text-slate-400">
          FitSole Admin v1.0
        </div>
      </aside>
    </>
  );
}
