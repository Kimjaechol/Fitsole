import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  ctaText: string;
  ctaHref: string;
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  ctaText,
  ctaHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <Icon className="h-16 w-16 text-[#64748B]" />
      <h3 className="text-2xl font-bold">{title}</h3>
      <p className="text-base text-[#64748B]">{body}</p>
      <Button asChild className="bg-[#2563EB] hover:bg-[#2563EB]/90">
        <Link href={ctaHref}>{ctaText}</Link>
      </Button>
    </div>
  );
}
