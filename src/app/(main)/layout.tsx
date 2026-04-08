import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { DesktopNav } from "@/components/layout/desktop-nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <DesktopNav />

      <main className="flex-1 pb-[72px] md:pb-0">
        <div className="mx-auto max-w-[1280px]">
          {children}
        </div>
      </main>

      <BottomTabBar />
    </div>
  );
}
