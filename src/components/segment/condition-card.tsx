import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * ConditionCard — Phase 06 D-04 health condition guidance card.
 *
 * Server component (no interactivity beyond an optional link wrapper).
 */
export type ConditionCardProps = {
  title: string;
  description: string;
  href?: string;
};

export function ConditionCard({ title, description, href }: ConditionCardProps) {
  const card = (
    <Card className="h-full transition hover:border-[#0F172A] hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm leading-relaxed text-[#64748B]">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link href={href} className="block h-full">
      {card}
    </Link>
  );
}
