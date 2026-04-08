import { ScanLine, Layers, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const columns = [
  {
    icon: ScanLine,
    title: "정밀 발 측정",
    body: "스마트폰 카메라로 발의 길이, 볼넓이, 아치를 정확히 측정합니다",
  },
  {
    icon: Layers,
    title: "맞춤 인솔 설계",
    body: "AI 기반 알고리즘이 당신만을 위한 인솔을 설계합니다",
  },
  {
    icon: CheckCircle,
    title: "완벽한 착용감",
    body: "90일 만족 보장, 맞지 않으면 무료 재제작해 드립니다",
  },
] as const;

export function ValueColumns() {
  return (
    <section className="py-12 px-4 md:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {columns.map((col) => (
          <Card key={col.title} className="border-[#E2E8F0] bg-[#F8FAFC]">
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <col.icon className="h-10 w-10 text-[#059669]" />
              <h3 className="text-lg font-bold text-foreground">{col.title}</h3>
              <p className="text-sm leading-[1.5] text-[#64748B]">{col.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
