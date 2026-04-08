import { ScanLine, Layers, Truck } from "lucide-react";

const steps = [
  { icon: ScanLine, label: "발 측정" },
  { icon: Layers, label: "인솔 설계" },
  { icon: Truck, label: "배송 완료" },
] as const;

export function ProcessPreview() {
  return (
    <section className="py-12 px-4 md:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-center lg:gap-0">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-0">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F8FAFC] border border-[#E2E8F0]">
                <step.icon className="h-8 w-8 text-[#059669]" />
              </div>
              <span className="text-sm font-bold text-foreground">
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <>
                <div className="hidden lg:block w-20 h-px bg-[#E2E8F0] mx-4 mt-[-20px]" />
                <div className="lg:hidden h-8 w-px bg-[#E2E8F0]" />
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
