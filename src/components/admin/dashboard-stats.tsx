import { Card, CardContent } from "@/components/ui/card";
import {
  ShoppingBag,
  TrendingUp,
  Hammer,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface DashboardStatsData {
  totalOrders: number;
  todayOrders: number;
  inProgressOrders: number;
  totalRevenue: number;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accentClass: string;
}

function StatCard({ label, value, icon: Icon, accentClass }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accentClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-0.5 truncate text-xl font-bold text-slate-900">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

const formatKRW = (value: number) =>
  `₩${Math.round(value).toLocaleString("ko-KR")}`;

const formatCount = (value: number) => value.toLocaleString("ko-KR");

/**
 * Dashboard stats grid — 2x2 on mobile, 4x1 on desktop.
 */
export function DashboardStats({ stats }: { stats: DashboardStatsData }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      <StatCard
        label="전체 주문"
        value={formatCount(stats.totalOrders)}
        icon={ShoppingBag}
        accentClass="bg-blue-50 text-blue-600"
      />
      <StatCard
        label="오늘 신규"
        value={formatCount(stats.todayOrders)}
        icon={TrendingUp}
        accentClass="bg-green-50 text-green-600"
      />
      <StatCard
        label="제작 대기"
        value={formatCount(stats.inProgressOrders)}
        icon={Hammer}
        accentClass="bg-orange-50 text-orange-600"
      />
      <StatCard
        label="총 매출"
        value={formatKRW(stats.totalRevenue)}
        icon={Wallet}
        accentClass="bg-purple-50 text-purple-600"
      />
    </div>
  );
}
